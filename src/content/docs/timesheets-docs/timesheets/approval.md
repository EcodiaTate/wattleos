# Timesheet Approval

Approvers review submitted timesheets, verify the hours are correct, and either approve them for payroll or reject them with notes for correction. WattleOS supports individual and batch approval to handle schools with many staff efficiently.

## Accessing Pending Approvals

Navigate to **Admin → Timesheets** to see the approval dashboard. This requires the **Approve Timesheets** permission, which is typically assigned to administrators, principals, and office managers.

## The Pending Queue

The pending approvals view lists all timesheets in "submitted" status, sorted by submission date (oldest first). Each entry shows:

- **Staff member** - Name and avatar
- **Pay period** - Which period the timesheet covers
- **Total hours** - The aggregated total
- **Regular / Overtime / Leave** - Hour breakdown
- **Submitted at** - When the timesheet was submitted

The queue can be filtered by pay period to focus on a specific cycle.

## Reviewing a Timesheet

Click on a pending timesheet to see its full details. The detail view shows the timesheet summary (total hours, breakdown by type) alongside the individual time entries that make up those hours. Each entry displays the date, start/end time, break duration, entry type, class assignment, notes, and calculated hours.

This allows approvers to verify that the hours match expectations - checking for unusual patterns like missing days, excessive overtime, or entries that do not align with the school calendar.

## Approving

Click **Approve** to approve the timesheet. The system:

1. Verifies the timesheet is in "submitted" status
2. Checks that the approver is not approving their own timesheet (self-approval is blocked)
3. Sets status to "approved" with the current timestamp and approver's user ID

Approved timesheets move out of the pending queue and are ready for payroll sync.

### Self-Approval Prevention

A staff member cannot approve their own timesheet. This is enforced at the server action level - if the approver's user ID matches the timesheet owner's user ID, the action returns an error. This ensures separation of duties for payroll integrity.

## Rejecting

Click **Reject** to send the timesheet back for correction. Rejection requires notes explaining what needs to be fixed - the notes field is mandatory and cannot be empty.

The system:

1. Verifies the timesheet is in "submitted" status
2. Sets status to "rejected" with timestamp, rejector's user ID, and the rejection notes

The staff member sees the rejection and notes on their timesheet page and can edit their entries and resubmit.

## Batch Approval

For efficiency at the end of a pay cycle, the **Approve All** action approves multiple submitted timesheets in a single operation. The system processes each timesheet individually, skipping any that:

- Are not in "submitted" status
- Belong to the approver (self-approval prevention)
- Cannot be found

The result reports how many were approved, how many failed, and specific error messages for any failures.

## Viewing All Timesheets for a Period

The **Admin → Timesheets → Periods** page lets approvers select a pay period and see all timesheets for that period regardless of status. This gives a complete overview of who has submitted, who has been approved, and who is still outstanding.

Each row shows the staff member name, avatar, status badge, hour totals, and submission/approval dates.

## Permissions

- **Approve Timesheets** - View pending timesheets, approve, reject, batch approve. View all timesheets for a period. Filter by pay period.
- **View All Timesheets** - Read-only access to all staff timesheets across periods (useful for reporting without approval authority).
