# Pay Periods

Pay periods are explicit date ranges that define payroll cycles. They organise time entries into reviewable windows and control when entries can be created or modified. WattleOS uses database records rather than computed dates to handle edge cases like holidays, mid-cycle starts, and irregular schedules.

## Accessing Pay Periods

Navigate to **Admin → Timesheets → Periods** to manage pay periods. Creating periods requires the **Manage Integrations** permission. Viewing and locking periods requires the **Approve Timesheets** permission.

## Creating a Pay Period

Click **New Pay Period** and provide:

**Name** - A descriptive label (e.g. "Fortnight 1 - 6 Jan to 19 Jan 2027," "January 2027").

**Start date** - The first day of the pay cycle.

**End date** - The last day of the pay cycle. Must be after the start date.

**Frequency** - The pay cycle type: weekly, fortnightly, or monthly. This is informational - it does not auto-generate future periods but documents the intended cadence.

### Overlap Prevention

Pay periods cannot overlap. When creating a new period, the system checks whether any existing period's date range intersects with the proposed range. If an overlap is found, the creation is blocked with an error message. This prevents confusion about which period a time entry belongs to.

## Pay Period Statuses

Each period progresses through three statuses:

**Open** - The default status when created. Staff can log time entries for dates within this period. Timesheets can be submitted and reviewed. This is the active working state.

**Locked** - Time entries can no longer be created, edited, or deleted for dates in this period. Timesheets that were already submitted can still be approved or rejected. Locking prevents last-minute changes after the submission deadline.

**Processed** - The period has been fully processed through payroll. Timesheets cannot be submitted for this period. This is the terminal status indicating the pay cycle is complete.

### Locking a Period

Click **Lock** on an open pay period. The system records who locked it and when. Locking is irreversible through the UI - once locked, a period cannot be reopened (this prevents accidental changes to finalised payroll data).

When a period is locked, any attempt to create or edit time entries for dates within that period returns an error: "Cannot edit time entries for a locked or processed pay period."

### Marking as Processed

After all timesheets in a locked period have been approved and synced to payroll, click **Mark Processed**. This can only be done on locked periods - the transition from open directly to processed is not allowed.

## Current Pay Period

The system automatically identifies the current open pay period by finding the period whose date range contains today's date. This determines which period the timesheet grid shows by default. If no open period covers today, the timesheet page shows a message indicating no active period.

## Period List

The periods page shows all pay periods sorted by start date (newest first). Each row displays the period name, date range, frequency, status badge, and the number of timesheets in each status (submitted, approved, synced). The list can be filtered by status.

## Best Practice Workflow

The recommended pay period cycle:

1. **Create** the period before the cycle starts (e.g. create the next fortnight's period on the last day of the current one)
2. Staff **log time** throughout the period
3. Near the end of the period, send a reminder for staff to **submit timesheets**
4. After the submission deadline, **lock** the period to prevent further edits
5. **Approve** all submitted timesheets
6. **Sync** approved timesheets to payroll
7. **Mark processed** to close out the period

## Permissions

- **Manage Integrations** - Create pay periods and mark periods as processed
- **Approve Timesheets** - Lock pay periods, view period lists and timesheet summaries per period
