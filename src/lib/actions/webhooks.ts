"use server";

// src/lib/actions/webhooks.ts
//
// ============================================================
// WattleOS V2 - Webhook Dashboard Server Actions
// ============================================================
// Provides read access to the webhook_events dead-letter queue
// for the admin webhook dashboard.
//
// Also exposes a manual retry action so admins can re-trigger
// failed webhooks without waiting for the cron job.
//
// Security: MANAGE_INTEGRATIONS permission required for all actions.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type { WebhookEvent, WebhookDashboardStats } from "@/types/domain";

// ============================================================
// List webhook events
// ============================================================

export interface ListWebhookEventsInput {
  provider?: "stripe" | "sms" | "google_drive" | "keypay";
  status?: "pending" | "processing" | "succeeded" | "failed_permanent";
  limit?: number;
  offset?: number;
}

export interface ListWebhookEventsResult {
  events: WebhookEvent[];
  total: number;
}

export async function listWebhookEvents(
  input: ListWebhookEventsInput = {},
): Promise<ActionResponse<ListWebhookEventsResult>> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const { limit = 50, offset = 0 } = input;

    let query = supabase
      .from("webhook_events")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (input.provider) {
      query = query.eq("provider", input.provider);
    }
    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, count, error } = await query;

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({
      events: (data ?? []) as WebhookEvent[],
      total: count ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "INTERNAL_ERROR");
  }
}

// ============================================================
// Get webhook dashboard stats
// ============================================================

export async function getWebhookDashboardStats(): Promise<
  ActionResponse<WebhookDashboardStats>
> {
  try {
    await requirePermission(Permissions.MANAGE_INTEGRATIONS);
    const supabase = await createSupabaseServerClient();

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Total counts by status
    const { data: statusCounts, error: statusErr } = await supabase
      .from("webhook_events")
      .select("status")
      .gte("created_at", sevenDaysAgo);

    if (statusErr) {
      return failure(statusErr.message, "DB_ERROR");
    }

    const counts = {
      pending: 0,
      processing: 0,
      succeeded: 0,
      failed_permanent: 0,
    };
    for (const row of statusCounts ?? []) {
      const s = row.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    // Dead-letter events (permanent failures) count
    const deadLetterCount = counts.failed_permanent;

    // Success rate over 7 days
    const total7d = Object.values(counts).reduce((a, b) => a + b, 0);
    const successRate7d =
      total7d > 0 ? (counts.succeeded / total7d) * 100 : 100;

    // Provider breakdown
    const { data: providerData, error: providerErr } = await supabase
      .from("webhook_events")
      .select("provider, status")
      .gte("created_at", sevenDaysAgo);

    if (providerErr) {
      return failure(providerErr.message, "DB_ERROR");
    }

    const providerStats: Record<
      string,
      { total: number; succeeded: number; failed: number }
    > = {};
    for (const row of providerData ?? []) {
      if (!providerStats[row.provider]) {
        providerStats[row.provider] = { total: 0, succeeded: 0, failed: 0 };
      }
      providerStats[row.provider].total++;
      if (row.status === "succeeded") providerStats[row.provider].succeeded++;
      if (row.status === "failed_permanent")
        providerStats[row.provider].failed++;
    }

    // Daily breakdown for chart (last 7 days)
    const { data: dailyData, error: dailyErr } = await supabase
      .from("webhook_events")
      .select("created_at, status")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true });

    if (dailyErr) {
      return failure(dailyErr.message, "DB_ERROR");
    }

    // Group by date
    const dailyMap: Record<
      string,
      { date: string; succeeded: number; failed: number; total: number }
    > = {};
    for (const row of dailyData ?? []) {
      const date = row.created_at.slice(0, 10); // YYYY-MM-DD
      if (!dailyMap[date]) {
        dailyMap[date] = { date, succeeded: 0, failed: 0, total: 0 };
      }
      dailyMap[date].total++;
      if (row.status === "succeeded") dailyMap[date].succeeded++;
      if (row.status === "failed_permanent") dailyMap[date].failed++;
    }

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return success({
      pending: counts.pending + counts.processing,
      succeeded: counts.succeeded,
      deadLetterCount,
      successRate7d: Math.round(successRate7d * 10) / 10,
      providerStats,
      dailyBreakdown,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "INTERNAL_ERROR");
  }
}

// ============================================================
// Manual retry
// ============================================================

export async function retryWebhookEvent(
  webhookEventId: string,
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_INTEGRATIONS);

    // Use admin client - re-processing needs service role access
    const supabase = createSupabaseAdminClient();

    const { data: event, error: fetchErr } = await supabase
      .from("webhook_events")
      .select(
        "id, provider, event_type, event_id, payload, tenant_id, retry_count, status",
      )
      .eq("id", webhookEventId)
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (fetchErr || !event) {
      return failure("Webhook event not found", "NOT_FOUND");
    }

    // Reset to pending so the retry processor picks it up immediately
    const { error: resetErr } = await supabase
      .from("webhook_events")
      .update({
        status: "pending",
        next_retry_at: new Date().toISOString(), // due immediately
      })
      .eq("id", webhookEventId)
      .eq("tenant_id", ctx.tenant.id);

    if (resetErr) {
      return failure(resetErr.message, "DB_ERROR");
    }

    // For immediate retry, dispatch inline (don't wait for cron)
    const { processWebhook } =
      await import("@/app/api/webhooks/shared/webhook-processor");

    if (event.provider === "stripe") {
      const { dispatchStripeEvent } =
        await import("@/app/api/webhooks/shared/stripe-event-dispatcher");
      import("stripe"); // warm up

      await processWebhook({
        provider: "stripe",
        eventType: event.event_type,
        eventId: event.event_id,
        payload: event.payload as Parameters<typeof dispatchStripeEvent>[1],
        tenantId: event.tenant_id,
        handler: (e) => dispatchStripeEvent(supabase, e),
      });
    } else if (event.provider === "sms") {
      const { processSmsDeliveryWebhook } =
        await import("@/lib/actions/sms-gateway");
      const payload = event.payload as {
        provider_message_id: string;
        status: "sent" | "delivered" | "failed" | "bounced" | "opted_out";
        error_message?: string;
      };

      await processWebhook({
        provider: "sms",
        eventType: event.event_type,
        eventId: event.event_id,
        payload,
        tenantId: event.tenant_id,
        handler: async (p) => {
          const result = await processSmsDeliveryWebhook({
            provider_message_id: p.provider_message_id,
            status: p.status,
            error_message: p.error_message,
          });
          if (result.error) throw new Error(result.error.message);
        },
      });
    }

    return success({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "INTERNAL_ERROR");
  }
}
