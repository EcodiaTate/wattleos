// src/app/api/cron/webhook-retry/route.ts
//
// ============================================================
// Vercel Cron Job - runs every 2 minutes
// ============================================================
// Re-processes webhook events that failed on first delivery
// and whose next_retry_at timestamp has elapsed.
//
// Retry schedule (set by webhook-processor.ts on failure):
//   Attempt 1 →   1s delay
//   Attempt 2 →   4s delay
//   Attempt 3 →  16s delay
//   Attempt 4 →  64s delay
//   Attempt 5 → 256s delay  (~4 min)
//   > 5       → failed_permanent, logged to integration_sync_logs
//
// Secured by CRON_SECRET env var (Vercel injects Authorization header).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { processWebhook } from "@/app/api/webhooks/shared/webhook-processor";
import { dispatchStripeEvent } from "@/app/api/webhooks/shared/stripe-event-dispatcher";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/webhook-retry] CRON_SECRET is not set.");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Fetch due events.
  // 'processing' events with elapsed next_retry_at indicate a prior cron
  // run that crashed mid-flight - pick them up for retry.
  const { data: dueEvents, error: fetchError } = await supabase
    .from("webhook_events")
    .select(
      "id, provider, event_type, event_id, payload, tenant_id, retry_count",
    )
    .in("status", ["pending", "processing"])
    .lte("next_retry_at", now)
    .order("next_retry_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error(`[cron/webhook-retry] Fetch failed: ${fetchError.message}`);
    return NextResponse.json(
      { success: false, error: fetchError.message },
      { status: 500 },
    );
  }

  if (!dueEvents || dueEvents.length === 0) {
    return NextResponse.json({
      success: true,
      retried: 0,
      succeeded: 0,
      failed: 0,
      checked_at: now,
    });
  }

  let succeeded = 0;
  let failed = 0;

  for (const event of dueEvents) {
    try {
      const ok = await retryEvent(event);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      console.error(
        `[cron/webhook-retry] Unhandled error for event ${event.id}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  console.log(
    `[cron/webhook-retry] Complete - ${dueEvents.length} retried, ` +
      `${succeeded} succeeded, ${failed} still failing`,
  );

  return NextResponse.json({
    success: true,
    retried: dueEvents.length,
    succeeded,
    failed,
    checked_at: now,
  });
}

// ============================================================
// Per-provider retry dispatch
// ============================================================

interface EventRow {
  id: string;
  provider: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  tenant_id: string | null;
  retry_count: number;
}

async function retryEvent(event: EventRow): Promise<boolean> {
  switch (event.provider) {
    case "stripe":
      return retryStripeEvent(event);
    case "sms":
      return retrySmsEvent(event);
    default:
      console.warn(
        `[cron/webhook-retry] No retry handler for provider: ${event.provider}`,
      );
      return false;
  }
}

// ── Stripe ─────────────────────────────────────────────────────

async function retryStripeEvent(event: EventRow): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const stripeEvent = event.payload as unknown as Stripe.Event;

  const result = await processWebhook({
    provider: "stripe",
    eventType: event.event_type,
    eventId: event.event_id,
    payload: stripeEvent,
    tenantId: event.tenant_id,
    handler: (e) => dispatchStripeEvent(supabase, e),
  });

  return result.success || result.duplicate;
}

// ── SMS ────────────────────────────────────────────────────────

async function retrySmsEvent(event: EventRow): Promise<boolean> {
  const { processSmsDeliveryWebhook } =
    await import("@/lib/actions/sms-gateway");

  const payload = event.payload as {
    provider_message_id: string;
    status: "sent" | "delivered" | "failed" | "bounced" | "opted_out";
    error_message?: string;
  };

  const result = await processWebhook({
    provider: "sms",
    eventType: event.event_type,
    eventId: event.event_id,
    payload,
    tenantId: event.tenant_id,
    handler: async (p) => {
      const actionResult = await processSmsDeliveryWebhook({
        provider_message_id: p.provider_message_id,
        status: p.status,
        error_message: p.error_message,
      });
      if (actionResult.error) {
        throw new Error(actionResult.error.message);
      }
    },
  });

  return result.success || result.duplicate;
}
