// src/app/api/webhooks/shared/stripe-event-dispatcher.ts
//
// ============================================================
// WattleOS - Stripe Event Dispatch Logic
// ============================================================
// Shared between:
//   - src/app/api/webhooks/stripe/route.ts  (live webhooks)
//   - src/app/api/cron/webhook-retry/route.ts (retries)
//
// All business-logic handlers live here. The route file only
// handles HTTP auth + signature verification.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

// ============================================================
// Main dispatcher
// ============================================================

/**
 * Dispatches a Stripe.Event to the appropriate handler.
 * Throws on failure so the caller (webhook-processor) can
 * schedule a retry.
 */
export async function dispatchStripeEvent(
  supabase: SupabaseAdmin,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "invoice.paid":
      await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(
        supabase,
        event.data.object as Stripe.Invoice,
      );
      break;

    case "charge.refunded":
      await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
      break;

    case "setup_intent.succeeded":
      await handleSetupIntentSucceeded(
        supabase,
        event.data.object as Stripe.SetupIntent,
      );
      break;

    case "setup_intent.setup_failed":
      await handleSetupIntentFailed(
        supabase,
        event.data.object as Stripe.SetupIntent,
      );
      break;

    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        supabase,
        event.data.object as Stripe.PaymentIntent,
      );
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(
        supabase,
        event.data.object as Stripe.PaymentIntent,
      );
      break;

    case "customer.subscription.updated":
      await handlePlatformSubscriptionUpdated(
        supabase,
        event.data.object as Stripe.Subscription,
      );
      break;

    case "customer.subscription.deleted":
      await handlePlatformSubscriptionDeleted(
        supabase,
        event.data.object as Stripe.Subscription,
      );
      break;

    default:
      // Ignore unhandled events - not an error
      break;
  }
}

// ============================================================
// Helpers
// ============================================================

function expandableId<T extends { id: string }>(
  v: string | T | null | undefined,
): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

function extractInvoicePaymentIds(invoice: Stripe.Invoice): {
  paymentIntentId: string | null;
  chargeId: string | null;
} {
  const firstPayment = invoice.payments?.data?.[0];
  if (!firstPayment) return { paymentIntentId: null, chargeId: null };
  return {
    paymentIntentId: expandableId(firstPayment.payment.payment_intent),
    chargeId: expandableId(firstPayment.payment.charge),
  };
}

// ============================================================
// Handlers
// ============================================================

async function handleInvoicePaid(
  supabase: SupabaseAdmin,
  stripeInvoice: Stripe.Invoice,
) {
  const wattleosInvoiceId = stripeInvoice.metadata?.wattleos_invoice_id;
  if (!wattleosInvoiceId) return;

  const tenantId = stripeInvoice.metadata?.wattleos_tenant_id;
  if (!tenantId) return;

  const { data: invoiceCheck } = await supabase
    .from("invoices")
    .select("id, tenant_id, status")
    .eq("id", wattleosInvoiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!invoiceCheck) {
    console.error(
      `Stripe: invoice ${wattleosInvoiceId} not found for tenant ${tenantId}`,
    );
    return;
  }

  if (invoiceCheck.status === "paid") return; // idempotent

  const { paymentIntentId, chargeId } = extractInvoicePaymentIds(stripeInvoice);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      amount_paid_cents: stripeInvoice.amount_paid,
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", wattleosInvoiceId);

  if (invoiceUpdateError)
    throw new Error(`Invoice update failed: ${invoiceUpdateError.message}`);

  const { error: paymentError } = await supabase.from("payments").insert({
    tenant_id: tenantId,
    invoice_id: wattleosInvoiceId,
    amount_cents: stripeInvoice.amount_paid,
    currency: stripeInvoice.currency,
    status: "succeeded",
    stripe_payment_intent_id: paymentIntentId,
    stripe_charge_id: chargeId,
    paid_at: new Date().toISOString(),
  });

  if (paymentError)
    throw new Error(`Payment insert failed: ${paymentError.message}`);

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

  const { data: invoiceCheck } = await supabase
    .from("invoices")
    .select("id, tenant_id")
    .eq("id", wattleosInvoiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!invoiceCheck) {
    console.error(
      `Stripe: invoice ${wattleosInvoiceId} not found for tenant ${tenantId}`,
    );
    return;
  }

  const { paymentIntentId } = extractInvoicePaymentIds(stripeInvoice);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("id", wattleosInvoiceId);

  if (invoiceUpdateError)
    throw new Error(`Invoice update failed: ${invoiceUpdateError.message}`);

  const { error: paymentError } = await supabase.from("payments").insert({
    tenant_id: tenantId,
    invoice_id: wattleosInvoiceId,
    amount_cents: stripeInvoice.amount_due,
    currency: stripeInvoice.currency,
    status: "failed",
    stripe_payment_intent_id: paymentIntentId,
    failure_reason: "Payment declined",
  });

  if (paymentError)
    throw new Error(`Payment insert failed: ${paymentError.message}`);

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
  const paymentIntentId = expandableId(charge.payment_intent);
  if (!paymentIntentId) return;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, invoice_id, tenant_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .limit(1)
    .maybeSingle();

  if (!payment) return;

  const refundAmount = charge.amount_refunded;
  const isFullRefund = charge.amount_refunded >= charge.amount;

  const { error: paymentUpdateError } = await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refund_amount_cents: refundAmount,
    })
    .eq("id", payment.id);

  if (paymentUpdateError)
    throw new Error(`Payment update failed: ${paymentUpdateError.message}`);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ status: isFullRefund ? "refunded" : "partially_paid" })
    .eq("id", payment.invoice_id);

  if (invoiceUpdateError)
    throw new Error(`Invoice update failed: ${invoiceUpdateError.message}`);

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

async function handleSetupIntentSucceeded(
  supabase: SupabaseAdmin,
  setupIntent: Stripe.SetupIntent,
) {
  const setupId = setupIntent.metadata?.wattleos_recurring_billing_setup_id;
  const tenantId = setupIntent.metadata?.wattleos_tenant_id;
  if (!setupId || !tenantId) return;

  const { data: setup } = await supabase
    .from("recurring_billing_setups")
    .select("id, tenant_id, status")
    .eq("id", setupId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!setup) {
    console.error(
      `Stripe: recurring_billing_setup ${setupId} not found for tenant ${tenantId}`,
    );
    return;
  }

  if (setup.status === "active" && setupIntent.mandate) return; // idempotent

  const paymentMethodId = expandableId(
    setupIntent.payment_method as string | { id: string } | null,
  );
  const mandateId = expandableId(
    setupIntent.mandate as string | { id: string } | null,
  );

  const { error } = await supabase
    .from("recurring_billing_setups")
    .update({
      status: "active",
      stripe_setup_intent_id: setupIntent.id,
      stripe_payment_method_id: paymentMethodId,
      mandate_id: mandateId,
      mandate_accepted_at: new Date().toISOString(),
    })
    .eq("id", setupId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Setup update failed: ${error.message}`);

  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "setup_intent_succeeded",
    entity_type: "recurring_billing_setup",
    entity_id: setupId,
    status: "success",
    response_data: {
      stripe_setup_intent_id: setupIntent.id,
      stripe_payment_method_id: paymentMethodId,
      mandate_id: mandateId,
    },
  });
}

async function handleSetupIntentFailed(
  supabase: SupabaseAdmin,
  setupIntent: Stripe.SetupIntent,
) {
  const setupId = setupIntent.metadata?.wattleos_recurring_billing_setup_id;
  const tenantId = setupIntent.metadata?.wattleos_tenant_id;
  if (!setupId || !tenantId) return;

  const { data: setup } = await supabase
    .from("recurring_billing_setups")
    .select("id, tenant_id, family_id")
    .eq("id", setupId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!setup) return;

  const failureReason = setupIntent.last_setup_error?.message ?? "Setup failed";

  const { error: updateError } = await supabase
    .from("recurring_billing_setups")
    .update({ status: "failed", stripe_setup_intent_id: setupIntent.id })
    .eq("id", setupId)
    .eq("tenant_id", tenantId);

  if (updateError)
    throw new Error(`Setup update failed: ${updateError.message}`);

  await supabase.from("billing_failures").insert({
    tenant_id: tenantId,
    family_id: setup.family_id,
    recurring_billing_setup_id: setupId,
    amount_cents: 0,
    failure_reason: "other",
    notification_method: "in_app",
  });

  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "setup_intent_failed",
    entity_type: "recurring_billing_setup",
    entity_id: setupId,
    status: "failure",
    error_message: failureReason,
    response_data: { stripe_setup_intent_id: setupIntent.id },
  });
}

async function handlePaymentIntentSucceeded(
  supabase: SupabaseAdmin,
  paymentIntent: Stripe.PaymentIntent,
) {
  const attemptId = paymentIntent.metadata?.wattleos_billing_attempt_id;
  const tenantId = paymentIntent.metadata?.wattleos_tenant_id;
  const invoiceId = paymentIntent.metadata?.wattleos_invoice_id;
  if (!attemptId || !tenantId) return;

  const { data: attempt } = await supabase
    .from("billing_payment_attempts")
    .select(
      "id, tenant_id, status, invoice_id, amount_cents, recurring_billing_setup_id",
    )
    .eq("id", attemptId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!attempt) return;
  if (attempt.status === "succeeded") return; // idempotent

  const chargeId = expandableId(paymentIntent.latest_charge);

  const { error: attemptError } = await supabase
    .from("billing_payment_attempts")
    .update({
      status: "succeeded",
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: chargeId,
      succeeded_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (attemptError)
    throw new Error(`Attempt update failed: ${attemptError.message}`);

  const effectiveInvoiceId = invoiceId ?? attempt.invoice_id;
  if (effectiveInvoiceId) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, total_cents, amount_paid_cents, status")
      .eq("id", effectiveInvoiceId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (invoice && invoice.status !== "paid") {
      const newPaid = (invoice.amount_paid_cents ?? 0) + paymentIntent.amount;
      const fullyPaid = newPaid >= invoice.total_cents;

      await supabase
        .from("invoices")
        .update({
          status: fullyPaid ? "paid" : "partially_paid",
          amount_paid_cents: newPaid,
          stripe_payment_intent_id: paymentIntent.id,
          paid_at: fullyPaid ? new Date().toISOString() : undefined,
        })
        .eq("id", effectiveInvoiceId);

      await supabase.from("payments").insert({
        tenant_id: tenantId,
        invoice_id: effectiveInvoiceId,
        amount_cents: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "succeeded",
        payment_method_type: "au_becs_debit",
        stripe_payment_intent_id: paymentIntent.id,
        stripe_charge_id: chargeId,
        paid_at: new Date().toISOString(),
      });
    }
  }

  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "recurring_payment_succeeded",
    entity_type: "billing_payment_attempt",
    entity_id: attemptId,
    status: "success",
    response_data: {
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      invoice_id: effectiveInvoiceId,
    },
  });
}

async function handlePaymentIntentFailed(
  supabase: SupabaseAdmin,
  paymentIntent: Stripe.PaymentIntent,
) {
  const attemptId = paymentIntent.metadata?.wattleos_billing_attempt_id;
  const tenantId = paymentIntent.metadata?.wattleos_tenant_id;
  if (!attemptId || !tenantId) return;

  const { data: attempt } = await supabase
    .from("billing_payment_attempts")
    .select(
      "id, tenant_id, status, recurring_billing_setup_id, attempt_number, amount_cents",
    )
    .eq("id", attemptId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!attempt) return;
  if (attempt.status === "succeeded") return;

  const lastError = paymentIntent.last_payment_error;
  const declineCode = lastError?.decline_code ?? lastError?.code ?? "other";
  const failureReason = mapStripeDeclineCode(declineCode);
  const failureMessage = lastError?.message ?? "Payment failed";

  const { data: setup } = await supabase
    .from("recurring_billing_setups")
    .select(
      "id, auto_retry_enabled, max_retry_attempts, retry_interval_days, family_id",
    )
    .eq("id", attempt.recurring_billing_setup_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const canRetry =
    setup?.auto_retry_enabled &&
    attempt.attempt_number < (setup.max_retry_attempts ?? 3);

  const nextRetryAt = canRetry
    ? new Date(
        Date.now() + (setup!.retry_interval_days ?? 5) * 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  const { error: updateError } = await supabase
    .from("billing_payment_attempts")
    .update({
      status: canRetry ? "retry_scheduled" : "failed",
      stripe_payment_intent_id: paymentIntent.id,
      failed_at: new Date().toISOString(),
      failure_reason: failureReason,
      failure_message: failureMessage,
      next_retry_at: nextRetryAt,
      retries_exhausted_at: canRetry ? null : new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (updateError)
    throw new Error(`Attempt update failed: ${updateError.message}`);

  if (!canRetry && setup) {
    await supabase.from("billing_failures").insert({
      tenant_id: tenantId,
      family_id: setup.family_id,
      recurring_billing_setup_id: setup.id,
      amount_cents: attempt.amount_cents,
      failure_reason: failureReason,
      notification_method: "email",
    });

    await supabase
      .from("recurring_billing_setups")
      .update({ status: "failed" })
      .eq("id", setup.id)
      .eq("tenant_id", tenantId);
  }

  await supabase.from("integration_sync_logs").insert({
    tenant_id: tenantId,
    provider: "stripe",
    operation: "recurring_payment_failed",
    entity_type: "billing_payment_attempt",
    entity_id: attemptId,
    status: "failure",
    error_message: failureMessage,
    response_data: {
      stripe_payment_intent_id: paymentIntent.id,
      decline_code: declineCode,
      can_retry: canRetry,
      next_retry_at: nextRetryAt,
    },
  });
}

function mapStripeDeclineCode(
  code: string,
):
  | "insufficient_funds"
  | "card_declined"
  | "expired_card"
  | "invalid_account"
  | "bank_error"
  | "other" {
  switch (code) {
    case "insufficient_funds":
      return "insufficient_funds";
    case "card_declined":
    case "generic_decline":
    case "do_not_honor":
      return "card_declined";
    case "expired_card":
      return "expired_card";
    case "invalid_account_number":
    case "no_account":
    case "account_closed":
      return "invalid_account";
    case "bank_account_declined":
    case "debit_not_authorized":
      return "bank_error";
    default:
      return "other";
  }
}

function stripeStatusToWattleOS(
  status: string,
): "trialing" | "active" | "past_due" | "canceled" | "suspended" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "suspended";
    default:
      return "active";
  }
}

async function handlePlatformSubscriptionUpdated(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
) {
  const tenantId = subscription.metadata?.wattleos_tenant_id;
  if (!tenantId) return;

  const mappedStatus = stripeStatusToWattleOS(subscription.status);
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("tenants")
    .update({
      subscription_status: mappedStatus,
      stripe_platform_subscription_id: subscription.id,
      stripe_platform_customer_id: expandableId(subscription.customer),
      trial_ends_at: trialEndsAt,
      ...(["active", "trialing"].includes(mappedStatus)
        ? { is_active: true }
        : {}),
    })
    .eq("id", tenantId);

  if (error)
    throw new Error(`Tenant subscription update failed: ${error.message}`);
}

async function handlePlatformSubscriptionDeleted(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
) {
  const tenantId = subscription.metadata?.wattleos_tenant_id;
  if (!tenantId) return;

  const { error } = await supabase
    .from("tenants")
    .update({ subscription_status: "canceled", is_active: false })
    .eq("id", tenantId);

  if (error) throw new Error(`Tenant deactivation failed: ${error.message}`);
}
