// src/app/api/webhooks/stripe/route.ts
//
// ============================================================
// WattleOS V2 - Stripe Webhook Handler
// ============================================================
// Receives events from Stripe, verifies the signature, then
// delegates to the generic webhook processor (dead-letter queue,
// retry scheduling) and stripe-event-dispatcher (business logic).
//
// EVENTS HANDLED: see stripe-event-dispatcher.ts
//
// SECURITY: Verifies webhook signature using STRIPE_WEBHOOK_SECRET.
// Uses Supabase admin client (service role) - no user auth context.
//
// NOTE: Always returns HTTP 200 to Stripe (even on handler error).
// Failures are queued internally with exponential backoff retries.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { processWebhook } from "@/app/api/webhooks/shared/webhook-processor";
import { dispatchStripeEvent } from "@/app/api/webhooks/shared/stripe-event-dispatcher";

function jsonOk() {
  return NextResponse.json({ received: true });
}

function jsonErr(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let event: Stripe.Event;
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) return jsonErr("Missing signature", 400);

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not set");
      return jsonErr("Server config error", 500);
    }

    const { verifyWebhookSignature } =
      await import("@/lib/integrations/stripe/client");

    event = verifyWebhookSignature(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return jsonErr("Invalid signature", 400);
  }

  // Resolve tenant_id from event metadata for logging.
  // Platform-level events (e.g. subscription.deleted) may not have one.
  const tenantId =
    (event.data.object as { metadata?: { wattleos_tenant_id?: string } })
      .metadata?.wattleos_tenant_id ?? null;

  const supabase = createSupabaseAdminClient();

  const result = await processWebhook({
    provider: "stripe",
    eventType: event.type,
    eventId: event.id,
    payload: event,
    tenantId,
    handler: (stripeEvent) => dispatchStripeEvent(supabase, stripeEvent),
  });

  if (!result.success && !result.duplicate) {
    console.error(
      `[stripe-webhook] Event ${event.id} (${event.type}) queued for retry. ` +
        `Webhook event ID: ${result.webhookEventId}`,
    );
  }

  // Always return 200 - Stripe should not retry; we handle retries internally.
  return jsonOk();
}
