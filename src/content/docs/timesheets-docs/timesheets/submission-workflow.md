# Timesheet Submission and Workflow

Timesheets follow a four-stage workflow from draft through to synced. Staff submit their timesheets for review, approvers check and approve or reject them, and approved timesheets can be synced to external payroll systems.

## Timesheet Lifecycle

The workflow has five statuses:

**Draft** - The timesheet exists but has not been submitted. Time entries can still be added or modified. Drafts are created automatically when a staff member logs their first entry for a pay period.

**Submitted** - The staff member has submitted their timesheet for review. The submission aggregates all time entries for the pay period and calculates hour breakdowns (regular, overtime, and leave). Submitted timesheets appear in the approver's pending queue.

**Approved** - An approver has reviewed and approved the timesheet. The approval records who approved it and when. Approved timesheets are ready for payroll sync.

**Rejected** - An approver has sent the timesheet back with notes explaining what needs to be corrected. The staff member can edit their time entries and resubmit. Rejection requires a reason - the notes field is mandatory.

**Synced** - The approved timesheet has been exported to the external payroll system (Xero or KeyPay). This is the terminal status.

## Submitting a Timesheet

When a staff member is ready to submit, they click **Submit Timesheet** on the timesheet page. The system:

1. Verifies the pay period exists and is not already processed
2. Fetches all time entries for the staff member in that period
3. Validates that at least one entry exists (empty timesheets cannot be submitted)
4. Calculates hour totals: regular hours, overtime hours, and leave hours (rounded to 2 decimal places)
5. Creates or updates the timesheet record with status "submitted" and a `submitted_at` timestamp

If a draft timesheet already exists, it is updated rather than duplicated. If a previously rejected timesheet is resubmitted, it resets to "submitted" and clears the rejection details.

A timesheet can only be submitted if its current status is "draft" or "rejected." Timesheets that are already submitted, approved, or synced cannot be resubmitted.

## Viewing Your Timesheets

The **Timesheets → History** page shows all your timesheets across pay periods. Each entry displays the pay period name, status badge, hour breakdown (regular, overtime, leave, total), submission date, and approval or rejection details.

Status badges use colour coding: grey for draft, blue for submitted, green for approved, red for rejected, and emerald for synced.

## Resubmitting After Rejection

When a timesheet is rejected, the staff member sees the rejection notes on their timesheet history and on the timesheet page. They can:

1. Review the rejection notes to understand what needs to change
2. Edit, add, or delete time entries for the pay period
3. Click **Submit Timesheet** again to resubmit

Resubmission clears the previous rejection details (rejected_at, rejected_by, rejection_notes) and sets the status back to "submitted" with a fresh submission timestamp.

## Permissions

- **Log Time** - Submit and resubmit your own timesheets. View your timesheet history.
- **Approve Timesheets** - Required to approve or reject timesheets (covered in the Approval documentation).
