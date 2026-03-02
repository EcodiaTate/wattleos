# Stripe Integration

WattleOS uses Stripe as its payment processing platform. Stripe handles all credit card storage, payment collection, and receipt generation — WattleOS never stores credit card details. The integration covers customer management, invoice creation and delivery, payment method setup, refunds, and automated webhook processing.

## Setting Up Stripe

Navigate to **Admin → Settings → Integrations** and find the Stripe card. Three credentials are required to activate the integration.

The **Secret Key** (starting with `sk_live_` or `sk_test_`) is your Stripe API key used for server-side operations like creating invoices and processing refunds. The **Publishable Key** (starting with `pk_live_` or `pk_test_`) is used for client-side operations like the payment method setup checkout. The **Webhook Signing Secret** (starting with `whsec_`) is used to verify that incoming webhook events genuinely come from Stripe.

All three are found in your Stripe Dashboard. For testing, use your test-mode keys — invoices and payments will be simulated without real charges.

Two configuration settings are available. **Auto-charge on invoice due date** controls whether Stripe automatically charges the parent's saved payment method when an invoice is due. When disabled, invoices require manual payment by the parent. **Currency** sets the three-letter ISO currency code used for all invoices (default is "aud" for Australian Dollars).

## How Customers Are Created

When a guardian is first billed, WattleOS creates a Stripe Customer record linked to the guardian's email address. The Stripe customer ID is stored in WattleOS on the `stripe_customers` table, which maps each guardian to their Stripe identity. This means each parent has one Stripe customer record per school, regardless of how many children they have enrolled.

The customer creation happens automatically during the first invoice sync. Subsequent invoices for the same guardian reuse the existing Stripe customer record.

## Payment Method Setup

Parents can save a payment method (credit or debit card) through a Stripe-hosted checkout session. WattleOS creates a setup session in Stripe's "setup" mode — no payment is taken, only card details are stored. The parent is redirected to Stripe's secure page, enters their card details, and is redirected back. The saved payment method is then available for auto-charging on future invoices.

WattleOS does not store any card details. The default payment method ID is recorded on the Stripe customer record, but all sensitive card data lives entirely within Stripe's PCI-compliant infrastructure.

## The Invoice Sync Flow

When you click "Sync to Stripe" on a draft invoice, the following happens. WattleOS creates (or retrieves) the Stripe customer for the guardian. A Stripe invoice is created with the WattleOS invoice ID and tenant ID in its metadata. Each line item from the WattleOS invoice is added to the Stripe invoice as an invoice item with the description, amount in cents, and quantity. The Stripe invoice is finalised, which locks in the amounts and generates a hosted payment URL. WattleOS stores the Stripe invoice ID and hosted URL on the local invoice record and updates the status to pending.

When you click "Send", Stripe emails the invoice to the parent. The parent receives a professional email with a link to Stripe's hosted invoice page showing the line items, total, and a payment button.

## Webhook Events

WattleOS listens for three Stripe webhook events that automatically update invoice and payment records.

**invoice.paid** fires when a parent pays an invoice. WattleOS updates the invoice status to paid, records the amount paid, payment intent ID, and charge ID, creates a payment record with a succeeded status and the payment timestamp, and logs the event to the integration sync log.

**invoice.payment_failed** fires when a payment attempt fails (declined card, insufficient funds, etc.). WattleOS updates the invoice status to overdue (rather than voiding it, since Stripe may retry), creates a payment record with a failed status and the failure reason, and logs the event.

**charge.refunded** fires when a refund is processed through Stripe. WattleOS updates the corresponding payment record with the refund amount and reason.

All webhook payloads are verified using the webhook signing secret before processing. This ensures that only genuine Stripe events are acted upon.

## Refunds

Refunds are initiated through Stripe and can be either full or partial. When a refund is processed, the charge.refunded webhook updates the WattleOS payment record. The refund amount and reason are recorded on the payment, providing a complete audit trail. WattleOS does not currently support initiating refunds from the billing dashboard — they are managed through the Stripe Dashboard.

## Integration Sync Logging

Every Stripe operation (invoice creation, payment receipt, payment failure) is logged in the `integration_sync_logs` table with the provider, operation type, entity type and ID, status, and response data. This provides a complete audit trail of all data exchanged between WattleOS and Stripe, which is essential for troubleshooting payment issues and reconciliation.

## Permissions

Configuring the Stripe integration (entering credentials and settings) requires the **MANAGE_INTEGRATIONS** permission. All billing operations that interact with Stripe (syncing invoices, sending, viewing) also require this permission.
