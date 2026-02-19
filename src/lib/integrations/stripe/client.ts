// src/lib/integrations/stripe/client.ts
//
// ============================================================
// WattleOS V2 — Stripe Integration Client
// ============================================================
// Isolated integration module. Handles:
// • Customer creation (parent → Stripe Customer)
// • Invoice creation and finalization
// • Checkout session for payment method setup
// • Refunds
//
// DEPENDENCY: npm install stripe
// ============================================================

import Stripe from 'stripe';

// ============================================================
// Types
// ============================================================

export interface StripeCredentials {
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CreateInvoiceInput {
  customer_id: string;
  line_items: Array<{
    description: string;
    amount_cents: number;
    quantity: number;
  }>;
  currency: string;
  due_date: number; // Unix timestamp
  metadata?: Record<string, string>;
  auto_advance?: boolean;
}

export interface CreateCheckoutInput {
  customer_id: string;
  success_url: string;
  cancel_url: string;
  mode: 'setup'; // For saving payment methods
}

// ============================================================
// Client Factory
// ============================================================

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    // Either omit apiVersion entirely, OR set it to your account’s version.
    // apiVersion: "2026-01-28.clover",
    typescript: true,
  });
}




// ============================================================
// CUSTOMER OPERATIONS
// ============================================================

export async function createCustomer(
  stripe: Stripe,
  input: CreateCustomerInput
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: input.metadata ?? {},
  });
}

export async function getCustomer(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

// ============================================================
// INVOICE OPERATIONS
// ============================================================

export async function createInvoice(
  stripe: Stripe,
  input: CreateInvoiceInput
): Promise<Stripe.Invoice> {
  // 1. Create invoice
  const invoice = await stripe.invoices.create({
    customer: input.customer_id,
    currency: input.currency,
    due_date: input.due_date,
    auto_advance: input.auto_advance ?? false,
    collection_method: 'send_invoice',
    metadata: input.metadata ?? {},
  });

  // 2. Add line items
  for (const item of input.line_items) {
    await stripe.invoiceItems.create({
      customer: input.customer_id,
      invoice: invoice.id,
      description: item.description,
      amount: item.amount_cents,
      currency: input.currency,
      quantity: item.quantity,
    });
  }

  return invoice;
}

export async function finalizeInvoice(
  stripe: Stripe,
  invoiceId: string
): Promise<Stripe.Invoice> {
  return stripe.invoices.finalizeInvoice(invoiceId);
}

export async function sendInvoice(
  stripe: Stripe,
  invoiceId: string
): Promise<Stripe.Invoice> {
  return stripe.invoices.sendInvoice(invoiceId);
}

export async function voidInvoice(
  stripe: Stripe,
  invoiceId: string
): Promise<Stripe.Invoice> {
  return stripe.invoices.voidInvoice(invoiceId);
}

// ============================================================
// PAYMENT METHOD SETUP
// ============================================================
// Creates a Stripe Checkout Session in 'setup' mode.
// The parent is redirected to Stripe's hosted page to save
// their card. No payment is taken — just card details stored.
// ============================================================

export async function createSetupCheckout(
  stripe: Stripe,
  input: CreateCheckoutInput
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: input.customer_id,
    mode: 'setup',
    payment_method_types: ['card'],
    success_url: input.success_url,
    cancel_url: input.cancel_url,
  });
}

// ============================================================
// REFUNDS
// ============================================================

export async function createRefund(
  stripe: Stripe,
  paymentIntentId: string,
  amountCents?: number,
  reason?: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents, // undefined = full refund
    reason: (reason as Stripe.RefundCreateParams.Reason) ?? 'requested_by_customer',
  });
}

// ============================================================
// WEBHOOK VERIFICATION
// ============================================================
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  // Keep this consistent with createStripeClient (or omit apiVersion).
  const stripe = new Stripe("", {
    // apiVersion: "2026-01-28.clover",
  });
  return stripe.webhooks.constructEvent(payload, signature, secret);
}