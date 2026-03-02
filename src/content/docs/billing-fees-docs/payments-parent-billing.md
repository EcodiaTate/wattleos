# Payments and Parent Billing

Payment records in WattleOS track every transaction against an invoice — successful payments, failed attempts, and refunds. On the parent side, the billing page provides a transparent view of what has been charged, what is due, and how to pay.

## Payment Records

Every time Stripe processes a payment event against a WattleOS invoice, a payment record is created. Each record captures the invoice it relates to, the amount in cents, the currency, and a status of either **succeeded** or **failed**.

For successful payments, the record includes the Stripe payment intent ID, the charge ID, the payment method type (typically "card"), the last four digits of the card used, and the timestamp when payment was received. For failed payments, the record includes the failure reason (for example, "Payment declined") and the payment intent ID for reference.

Refund information is stored on the original payment record. When a refund is processed through Stripe, the refund amount in cents and the refund reason are added to the payment. This keeps the full financial history for an invoice in one place — you can see the original payment, any partial refunds, and the net amount.

## How Payment Status Updates Work

Payment status updates are entirely automated through Stripe webhooks. When a parent pays an invoice through Stripe's hosted payment page, Stripe sends an `invoice.paid` event to WattleOS. The webhook handler verifies the signature, finds the matching WattleOS invoice using metadata, updates the invoice status to paid, and creates a succeeded payment record. No manual intervention is needed.

If a payment fails — for example, the parent's card is declined — Stripe sends an `invoice.payment_failed` event. WattleOS marks the invoice as overdue (not void, since Stripe may retry the charge according to its retry schedule) and creates a failed payment record. The school can see the failure in the billing dashboard and follow up with the parent.

## The Parent Billing View

Parents access their billing information through the parent portal's **Billing** page. This shows a list of their invoices with the invoice number, total amount, due date, and payment status. Draft invoices are excluded from the parent view — parents only see invoices that have been synced to Stripe (pending, sent, paid, overdue, or voided).

For invoices that have a Stripe hosted URL (which is set after syncing to Stripe), a link takes the parent directly to Stripe's payment page. There they can see the full line-item breakdown, the total, and submit payment using a saved payment method or a new card. The payment experience is handled entirely by Stripe's hosted page — WattleOS does not collect or display any card information.

After payment, the parent sees the invoice status update to paid in the portal. The Stripe hosted page also serves as a receipt, and Stripe can be configured to email payment receipts directly to the parent.

## What Appears on an Invoice

From the parent's perspective, each invoice shows the charges that make up the total. Line items might include tuition fees (referenced from a fee schedule), program session charges from OSHC or extracurricular bookings, late cancellation fees from programs, one-off charges like excursion fees, and any custom charges the school has added.

Each line item shows a description, quantity, unit amount, and line total. The invoice total is the sum of all line items. Discounts, taxes, and the net amount are tracked on the invoice record, though the current implementation primarily uses subtotal and total fields.

## Billing for Program Sessions

Program session charges (from OSHC bookings, extracurricular sessions, and vacation care) connect to the billing system through the booking record's billing status. Each booking tracks whether it is unbilled, billed, waived, or refunded. When a booking is included on an invoice, its billing status is updated to billed and the Stripe invoice line item ID is stored on the booking for reconciliation.

This connection means the school can trace any charge on a parent's invoice back to a specific session booking, including the date, program, and check-in/check-out times. It also means a waived booking (for example, a goodwill gesture after a cancelled session) will not appear on the invoice.

## Reconciliation

The billing system is designed for straightforward reconciliation. Every WattleOS invoice has a corresponding Stripe invoice with matching metadata. Every payment has a Stripe payment intent ID and charge ID. Every sync operation is logged in the integration sync log. If a discrepancy arises between WattleOS records and Stripe, the sync log provides a chronological record of every data exchange to help identify where things diverged.

## Permissions

The billing dashboard and all administrative billing actions require the **MANAGE_INTEGRATIONS** permission. Parents can view their own invoices and make payments without any staff permissions — their access is controlled by the guardian relationship, and they can only see invoices where they are the named guardian.
