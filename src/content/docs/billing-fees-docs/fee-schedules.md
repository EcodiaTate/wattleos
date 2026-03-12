# Fee Schedules

Fee schedules define the pricing templates your school uses for tuition and recurring charges. Rather than entering amounts manually on every invoice, you create fee schedules once and reference them when generating invoices - keeping pricing consistent and making bulk invoicing straightforward.

## Creating a Fee Schedule

Navigate to **Admin → Billing** and switch to the **Fee Schedules** tab. Click **Add Fee Schedule** to open the creation form.

Every fee schedule requires a name (for example, "Primary 3–6 Tuition" or "Adolescent Program Fee"), an amount in dollars, and a billing frequency. The name appears on invoices as the line item description, so choose something parents will understand.

You can optionally link a fee schedule to a specific class. This is useful when different environments have different tuition rates - for example, a toddler community might have a lower fee than a primary classroom. When linked to a class, the fee schedule is easy to identify when creating invoices for students in that environment. If no class is linked, the fee schedule is available for any student.

An optional description field provides additional context. This might note what the fee covers, any inclusions, or terms.

## Frequency Options

Fee schedules support six billing frequencies: **weekly**, **fortnightly**, **monthly**, **termly**, **annually**, and **one-off**. The frequency indicates how often this charge is expected to be invoiced. It serves as a label and organisational tool - WattleOS does not automatically generate invoices on a schedule. You create invoices manually or through a bulk process, selecting the appropriate fee schedule for each line item.

Weekly and fortnightly frequencies are common for OSHC or wrap-around programs. Monthly and termly are typical for tuition. Annual might cover an enrolment fee or technology levy. One-off is for incidental charges like excursion fees or uniform purchases.

## Effective Dates

Each fee schedule has an effective-from date (defaulting to the creation date) and an optional effective-until date. This allows you to set up fee changes in advance - for example, creating a new tuition rate effective from the start of next year while the current rate remains active until the end of this year. Fee schedules that have passed their effective-until date can be deactivated.

## Activating and Deactivating

Fee schedules can be toggled between active and inactive. Active fee schedules appear in the dropdown when creating invoice line items. Inactive fee schedules are hidden from the creation workflow but remain visible in historical invoices where they were used.

Deactivating a fee schedule does not affect any existing invoices that reference it. The amounts on those invoices are fixed at creation time. Deactivation simply prevents the fee schedule from being selected on new invoices.

## All Amounts in Cents

Internally, all monetary values in WattleOS are stored as integers representing cents. This avoids floating-point rounding errors that can cause discrepancies in financial calculations. The billing interface converts between dollars and cents for display - you enter amounts in dollars and they are stored as cents. A fee of $2,450.00 is stored as 245000 cents.

## Currency

Each fee schedule records a three-letter ISO currency code (for example, "aud" for Australian Dollars). The currency is inherited from the tenant's configuration, and all fee schedules within a school use the same currency.

## Permissions

Creating, editing, and deactivating fee schedules requires the **MANAGE_INTEGRATIONS** permission. This is the same permission that controls access to the broader billing dashboard, ensuring that only authorised administrators can modify pricing.
