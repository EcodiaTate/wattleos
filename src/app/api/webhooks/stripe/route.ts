// src/app/api/webhooks/stripe/route.ts
//
// ============================================================
// WattleOS V2 - Stripe Webhook Handler
// ============================================================
// Receives events from Stripe and updates WattleOS state.
//
// EVENTS HANDLED:
// • invoice.paid - mark invoice paid, create payment record
// • invoice.payment_failed - mark payment failed, log attempt
// • charge.refunded - create refund payment record
//
// SECURITY: Verifies webhook signature using the secret from
// the tenant's integration config. Uses Supabase admin client
// (service role) since webhooks run outside user auth context.
//
// NOTE: This route must NOT use authentication middleware.
// Stripe calls it directly - there's no user session.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

// ============================================================
// Helpers
// ============================================================

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Stripe has many "expandable" fields that can be:
 *   string | { id: string, ... } | null
 *
 * This helper safely extracts the id string.
 */
function expandableId<T extends { id: string }>(
  v: string | T | null | undefined,
): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

function jsonOk() {
  return NextResponse.json({ received: true });
}

function jsonErr(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

// ============================================================
// Route
// ============================================================

export async function POST(request: NextRequest) {
  let event: Stripe.Event;
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) return jsonErr("Missing signature", 400);

    // Global webhook secret (single endpoint). Per-tenant secrets would
    // require per-tenant endpoints or Stripe Connect.
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

  const supabase = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "invoice.paid": {
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(
          supabase,
          event.data.object as Stripe.Invoice,
        );
        break;
      }

      case "charge.refunded": {
        await handleChargeRefunded(
          supabase,
          event.data.object as Stripe.Charge,
        );
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return jsonOk();
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return jsonErr("Handler failed", 500);
  }
}

// ============================================================
// Handlers
// ============================================================

async function handleInvoicePaid(
  supabase: SupabaseAdmin,
  stripeInvoice: Stripe.Invoice,
) {
  const wattleosInvoiceId = stripeInvoice.metadata?.wattleos_invoice_id;
  if (!wattleosInvoiceId) return; // Not a WattleOS-managed invoice

  const tenantId = stripeInvoice.metadata?.wattleos_tenant_id;
  if (!tenantId) return;

  // Stripe fields can be expandable; types may differ across SDK versions.
  // We avoid hard dependency on Invoice having these properties in types.
  const paymentIntentId = expandableId(
    (stripeInvoice as any).payment_intent as string | { id: string } | null,
  );
  const chargeId = expandableId(
    (stripeInvoice as any).charge as string | { id: string } | null,
  );

  // Update invoice status
  await supabase
    .from("invoices")
    .update({
      status: "paid",
      amount_paid_cents: stripeInvoice.amount_paid,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", wattleosInvoiceId);

  // Create payment record
  await supabase.from("payments").insert({
    tenant_id: tenantId,
    invoice_id: wattleosInvoiceId,
    amount_cents: stripeInvoice.amount_paid,
    currency: stripeInvoice.currency,
    status: "succeeded",
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    paid_at: new Date().toISOString(),
  });

  // Log to integration sync
  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "invoice_paid",
    entity_type: "invoice",
    entity_id: wattleosInvoiceId,
    status: "success",
    response_data: {
      stripe_invoice_id: stripeInvoice.id,
      amount_paid: stripeInvoice.amount_paid,
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId,
    },
  });
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseAdmin,
  stripeInvoice: Stripe.Invoice,
) {
  const wattleosInvoiceId = stripeInvoice.metadata?.wattleos_invoice_id;
  if (!wattleosInvoiceId) return;

  const tenantId = stripeInvoice.metadata?.wattleos_tenant_id;
  if (!tenantId) return;

  const paymentIntentId = expandableId(
    (stripeInvoice as any).payment_intent as string | { id: string } | null,
  );

  // Update invoice - don't change to 'void', it might retry
  await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("id", wattleosInvoiceId);

  // Create failed payment record
  await supabase.from("payments").insert({
    tenant_id: tenantId,
    invoice_id: wattleosInvoiceId,
    amount_cents: stripeInvoice.amount_due,
    currency: stripeInvoice.currency,
    status: "failed",
    stripe_payment_intent_id: paymentIntentId,
    failure_reason: "Payment declined",
  });

  // Log
  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "payment_failed",
    entity_type: "invoice",
    entity_id: wattleosInvoiceId,
    status: "failure",
    error_message: "Payment was declined by the card issuer",
    response_data: {
      stripe_invoice_id: stripeInvoice.id,
      stripe_payment_intent_id: paymentIntentId,
    },
  });
}

async function handleChargeRefunded(
  supabase: SupabaseAdmin,
  charge: Stripe.Charge,
) {
  const paymentIntentId = expandableId(
    charge.payment_intent as unknown as string | { id: string } | null,
  );
  if (!paymentIntentId) return;

  // Find the payment by stripe_payment_intent_id
  const { data: payment } = await supabase
    .from("payments")
    .select("id, invoice_id, tenant_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .limit(1)
    .maybeSingle();

  if (!payment) return;

  const refundAmount = charge.amount_refunded;
  const isFullRefund = charge.amount_refunded >= charge.amount;

  // Update original payment
  await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refund_amount_cents: refundAmount,
    })
    .eq("id", payment.id);

  // Update invoice status
  await supabase
    .from("invoices")
    .update({
      status: isFullRefund ? "refunded" : "partially_paid",
    })
    .eq("id", payment.invoice_id);

  // Log
  await supabase.from("integration_sync_logs").insert({
    tenant_id: payment.tenant_id,
    provider: "stripe",
    operation: "charge_refunded",
    entity_type: "invoice",
    entity_id: payment.invoice_id,
    status: "success",
    response_data: {
      stripe_charge_id: charge.id,
      stripe_payment_intent_id: paymentIntentId,
      refund_amount: refundAmount,
      full_refund: isFullRefund,
    },
  });
}
