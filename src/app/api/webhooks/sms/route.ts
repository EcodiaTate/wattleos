// src/app/api/webhooks/sms/route.ts
//
// ============================================================
// WattleOS - SMS Delivery Receipt Webhook
// ============================================================
// Receives delivery receipts from MessageMedia and Burst SMS
// and updates the corresponding sms_messages row.
//
// Auth: shared secret via X-Webhook-Secret header.
// Set the SMS_WEBHOOK_SECRET env var to a random token and
// configure the same token in your provider's webhook settings.
//
// All events are persisted to webhook_events before processing
// for dead-letter queue / retry support.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processSmsDeliveryWebhook } from "@/lib/actions/sms-gateway";
import { processWebhook } from "@/app/api/webhooks/shared/webhook-processor";

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = process.env.SMS_WEBHOOK_SECRET;
  const incoming = req.headers.get("x-webhook-secret");

  if (secret && incoming !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Normalise MessageMedia payload
  // MessageMedia: { message_id, status, delivery_report: { delivered_timestamp? } }
  // Burst SMS:    { message_id, status }

  const raw = body as Record<string, unknown>;
  const msgId = (raw.message_id ?? raw.provider_message_id) as
    | string
    | undefined;
  const status = raw.status as string | undefined;

  if (!msgId || !status) {
    return NextResponse.json(
      { error: "Missing message_id or status" },
      { status: 400 },
    );
  }

  // Map provider status → our internal status
  const statusMap: Record<string, string> = {
    // MessageMedia
    delivered: "delivered",
    submitted: "sent",
    failed: "failed",
    failed_undelivered: "failed",
    // Burst SMS
    d: "delivered",
    f: "failed",
    s: "sent",
    u: "failed", // undeliverable
  };

  const mappedStatus = (statusMap[status.toLowerCase()] ?? "sent") as
    | "sent"
    | "delivered"
    | "failed"
    | "bounced"
    | "opted_out";

  const webhookPayload = {
    provider_message_id: msgId,
    status: mappedStatus,
    error_message:
      (raw.error_message as string | undefined) ??
      (raw.description as string | undefined),
    raw,
  };

  // Use msgId as the dedup key - providers use the same ID for retries.
  // SMS webhooks are tenant-agnostic at the HTTP layer; the action
  // resolves the tenant from the sms_messages row.
  const result = await processWebhook({
    provider: "sms",
    eventType: `delivery.${mappedStatus}`,
    eventId: msgId,
    payload: webhookPayload,
    tenantId: null, // resolved inside the handler
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

  if (!result.success && !result.duplicate) {
    console.error(
      `[sms-webhook] Delivery receipt for ${msgId} queued for retry. ` +
        `Webhook event ID: ${result.webhookEventId}`,
    );
  }

  // Always return 200 - we handle retries internally.
  return NextResponse.json({ ok: true });
}
