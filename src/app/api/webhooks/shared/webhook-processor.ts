// src/app/api/webhooks/shared/webhook-processor.ts
//
// ============================================================
// WattleOS - Generic Webhook Processor
// ============================================================
// Every inbound webhook from every provider flows through here.
//
// Responsibilities:
//   1. Log the raw event to webhook_events BEFORE processing
//      (audit trail + dead-letter queue)
//   2. Call the provider-specific handler
//   3. On success: mark the event as 'succeeded'
//   4. On failure: save error, schedule exponential backoff retry
//   5. After 5 failures: mark 'failed_permanent'
//
// The cron job at /api/cron/webhook-retry re-processes events
// whose next_retry_at has elapsed.
//
// Retry schedule (exponential backoff):
//   Attempt 1 → 1s delay
//   Attempt 2 → 4s delay  (4^1)
//   Attempt 3 → 16s delay (4^2)
//   Attempt 4 → 64s delay (4^3)
//   Attempt 5 → 256s delay (4^4) ≈ 4 min
//   > 5: failed_permanent, admin alert
//
// NOTE: Uses Supabase admin client (service role) - this runs
// outside any user auth context.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";

// ============================================================
// Types
// ============================================================

export type WebhookProvider = "stripe" | "sms" | "google_drive" | "keypay";

export interface WebhookProcessorOptions<TPayload> {
  /** Provider name stored in webhook_events.provider */
  provider: WebhookProvider;
  /** Provider-assigned event type, e.g. 'invoice.paid' */
  eventType: string;
  /** Provider-assigned unique event ID for deduplication */
  eventId: string;
  /** Parsed event payload (will be JSON-stringified for storage) */
  payload: TPayload;
  /** Resolved tenant ID (null for platform-level events) */
  tenantId: string | null;
  /** The business logic handler to call */
  handler: (payload: TPayload) => Promise<void>;
}

export interface WebhookProcessorResult {
  /** Whether the handler succeeded this invocation */
  success: boolean;
  /** The webhook_events row ID (useful for logging) */
  webhookEventId: string;
  /** Whether this was a duplicate (already processed) */
  duplicate: boolean;
  errorMessage?: string;
}

// ============================================================
// Retry schedule
// ============================================================

const MAX_RETRIES = 5;

/** Returns the delay in milliseconds for a given retry attempt (1-indexed) */
function retryDelayMs(attempt: number): number {
  // 4^(attempt-1) seconds: 1s, 4s, 16s, 64s, 256s
  return Math.pow(4, attempt - 1) * 1000;
}

// ============================================================
// Main processor
// ============================================================

/**
 * Log-then-process: stores the webhook event, runs the handler,
 * and updates the record with the outcome.
 *
 * Returns immediately with success=false and a scheduled retry
 * if the handler throws; does NOT throw itself so callers can
 * always return HTTP 200 to the provider (preventing spam retries
 * from the provider while we handle retries internally).
 */
export async function processWebhook<TPayload>(
  options: WebhookProcessorOptions<TPayload>,
): Promise<WebhookProcessorResult> {
  const { provider, eventType, eventId, payload, tenantId, handler } = options;
  const supabase = createSupabaseAdminClient();

  // ── Step 1: Idempotency check ──────────────────────────────
  // If this event_id has already been successfully processed,
  // return immediately to prevent double-processing.
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, status, retry_count")
    .eq("provider", provider)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing?.status === "succeeded") {
    return {
      success: true,
      webhookEventId: existing.id,
      duplicate: true,
    };
  }

  // ── Step 2: Upsert the event record ───────────────────────
  // If re-processing from the retry cron, update the existing row.
  // If new, insert it in 'processing' state.
  let webhookEventId: string;

  if (existing) {
    // Retry: update status to 'processing' so the cron doesn't pick
    // it up again while we're actively working on it.
    const { error: updateErr } = await supabase
      .from("webhook_events")
      .update({ status: "processing", error_message: null })
      .eq("id", existing.id);

    if (updateErr) {
      console.error(
        `[webhook-processor] Failed to mark event processing: ${updateErr.message}`,
      );
    }
    webhookEventId = existing.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("webhook_events")
      .insert({
        provider,
        event_type: eventType,
        event_id: eventId,
        payload: payload as Record<string, unknown>,
        tenant_id: tenantId,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      // If insert failed due to unique constraint race, the event was
      // already inserted by a concurrent request - treat as duplicate.
      if (insertErr?.code === "23505") {
        const { data: race } = await supabase
          .from("webhook_events")
          .select("id, status")
          .eq("provider", provider)
          .eq("event_id", eventId)
          .single();
        if (race?.status === "succeeded") {
          return { success: true, webhookEventId: race.id, duplicate: true };
        }
        webhookEventId = race?.id ?? "unknown";
      } else {
        console.error(
          `[webhook-processor] Failed to insert webhook event: ${insertErr?.message}`,
        );
        // Proceed anyway - we still want to run the handler.
        webhookEventId = "unlogged";
      }
    } else {
      webhookEventId = inserted.id;
    }
  }

  // ── Step 3: Run the handler ────────────────────────────────
  try {
    await handler(payload);

    // ── Step 4: Mark succeeded ──────────────────────────────
    if (webhookEventId !== "unlogged") {
      await supabase
        .from("webhook_events")
        .update({
          status: "succeeded",
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", webhookEventId);
    }

    return { success: true, webhookEventId, duplicate: false };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const currentRetryCount = existing?.retry_count ?? 0;
    const nextAttempt = currentRetryCount + 1;
    const isPermanentFailure = nextAttempt >= MAX_RETRIES;

    console.error(
      `[webhook-processor] Handler failed for ${provider}/${eventType}/${eventId} ` +
        `(attempt ${nextAttempt}/${MAX_RETRIES}): ${errorMessage}`,
    );

    // ── Step 5: Schedule retry or mark permanent failure ───────
    if (webhookEventId !== "unlogged") {
      const nextRetryAt = isPermanentFailure
        ? null
        : new Date(Date.now() + retryDelayMs(nextAttempt)).toISOString();

      await supabase
        .from("webhook_events")
        .update({
          status: isPermanentFailure ? "failed_permanent" : "pending",
          error_message: errorMessage,
          retry_count: nextAttempt,
          next_retry_at: nextRetryAt,
        })
        .eq("id", webhookEventId);

      if (isPermanentFailure) {
        // Log to integration_sync_logs for admin visibility
        if (tenantId) {
          await supabase.from("integration_sync_logs").insert({
            tenant_id: tenantId,
            provider,
            operation: "webhook_permanent_failure",
            entity_type: "webhook_event",
            entity_id: webhookEventId,
            status: "failure",
            error_message: errorMessage,
            response_data: {
              event_type: eventType,
              event_id: eventId,
              retry_count: nextAttempt,
            },
          });
        }
        console.error(
          `[webhook-processor] PERMANENT FAILURE: ${provider}/${eventType}/${eventId} ` +
            `after ${nextAttempt} attempts. Webhook event ID: ${webhookEventId}`,
        );
      }
    }

    return { success: false, webhookEventId, duplicate: false, errorMessage };
  }
}
