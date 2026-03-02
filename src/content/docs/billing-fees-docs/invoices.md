# Creating and Managing Invoices

Invoices are the core billing documents in WattleOS. Each invoice is addressed to a specific student and guardian, contains one or more line items, and follows a lifecycle from draft through to payment or voiding. Invoices are synced to Stripe for payment processing — WattleOS creates the billing record, Stripe handles the money.

## The Billing Dashboard

Navigate to **Admin → Billing** to access the billing dashboard. The top of the page shows three summary cards: total outstanding (the sum of unpaid sent, pending, and overdue invoices), total paid (the sum of all payments received), and the number of overdue invoices. These give you an at-a-glance view of the school's billing health.

Below the summaries, the Invoices tab shows a table of all invoices with the invoice number, line item count, student name, guardian name, total amount, due date, status badge, and available actions.

## Creating an Invoice

Click **Create Invoice** to open the invoice form. Select a student from the list of actively enrolled students, then select a guardian for that student — this is the person who will receive and pay the invoice. Choose a due date and optionally set a billing period (start and end dates) to indicate which period the charges cover.

Add one or more line items. Each line item needs a description, quantity, and unit amount. You can populate a line item from a fee schedule by selecting one from the dropdown — this auto-fills the description and amount from the fee schedule template. You can also enter custom line items with free-text descriptions and manual amounts for ad-hoc charges.

An invoice can have up to 50 line items. The total is calculated automatically from the sum of each line item's quantity multiplied by its unit amount. You can optionally add notes that will appear on the invoice.

When you save, the invoice is created in **draft** status. No charges have been made and nothing has been sent to the parent yet.

## Invoice Lifecycle

Invoices move through a defined lifecycle with six possible statuses.

**Draft** is the initial state. The invoice exists in WattleOS but has not been synced to Stripe. You can still edit line items, change the due date, or delete the invoice entirely.

**Pending** means the invoice has been synced to Stripe (the Stripe invoice has been created and finalised) but not yet sent to the parent. At this point, the invoice has a Stripe invoice ID and a hosted payment URL.

**Sent** means the invoice has been emailed to the parent through Stripe. The parent receives an email with a link to Stripe's hosted invoice page where they can view the breakdown and pay.

**Paid** means payment has been received. This status is set automatically when Stripe's webhook notifies WattleOS that the invoice has been paid. The payment amount, payment intent ID, and charge ID are recorded.

**Overdue** means the invoice has passed its due date without payment. This status is set when Stripe reports a failed payment attempt.

**Void** means the invoice has been cancelled. Voiding is permanent and cannot be undone. Use this for invoices created in error or when a charge needs to be completely removed.

## Syncing to Stripe

From the invoice table, draft invoices show a **Sync to Stripe** action. This creates the corresponding invoice in Stripe with all line items, the guardian's Stripe customer record, the due date, and metadata linking back to the WattleOS invoice ID and tenant ID. After syncing, the invoice moves to pending status and the Stripe invoice ID and hosted URL are stored on the WattleOS record.

Pending invoices show a **Send** action. This triggers Stripe to email the invoice to the parent at the email address on their Stripe customer record. After sending, the invoice moves to sent status and the sent timestamp is recorded.

Invoices that have a Stripe hosted URL (pending or sent) show a **View** link that opens the Stripe-hosted payment page in a new tab. This is the same page the parent sees.

## Voiding an Invoice

Invoices that have not been paid can be voided. This action requires confirmation because it cannot be undone. Voiding an invoice in WattleOS also voids the corresponding Stripe invoice if one exists. The void timestamp is recorded on the invoice record.

You cannot void a paid invoice. If a refund is needed after payment, that is handled through the Stripe refund process, which updates the payment record.

## Invoice Numbering

Each invoice is assigned a unique invoice number when created. This number is displayed on the invoice table, in Stripe, and on the parent's billing page. Invoice numbers are generated sequentially within each tenant to ensure uniqueness and easy reference.

## Permissions

All billing operations — creating invoices, syncing to Stripe, sending, and voiding — require the **MANAGE_INTEGRATIONS** permission. This is typically held by school administrators or business managers. Parents can view their own invoices through the parent portal but cannot modify them.
