# Pay Periods

Pay periods are the foundation of the timesheet system. They define the date ranges that staff log their hours against and provide the structure for the approval and payroll sync workflow. Pay periods are explicit records rather than calculated date ranges — this lets you handle edge cases like mid-cycle starts, holiday adjustments, and schools that begin payroll at different times of year.

## Creating a Pay Period

Navigate to **Admin → Timesheets → Pay Periods** to see the list of all pay periods with their status badges. Click **Create Period** to set up a new one.

Each pay period requires a name (for example, "W/E 7 Mar 2026" or "Fortnight 3 — March"), a start date, an end date, and a frequency. The frequency can be **weekly**, **fortnightly**, or **monthly**, matching your school's pay cycle. When you select a start date, the end date is automatically calculated based on the frequency — 6 days ahead for weekly, 13 for fortnightly, and 29 for monthly. You can manually adjust the end date if needed.

The name is generated automatically from the start and end dates but can be customised. This name appears on staff timesheets and in the approval interface, so making it recognisable helps everyone stay oriented.

## Pay Period Lifecycle

Pay periods move through three statuses.

**Open** is the initial state. Staff can log time entries, edit existing entries, and submit timesheets. An open period is the active working state where everyone is recording their hours.

**Locked** means no further time entries can be added or edited. Staff can still view their entries but cannot modify them. Submitted timesheets can be approved or rejected by the administrator. Locking a period requires confirmation because it affects all staff immediately. Locking requires the APPROVE_TIMESHEETS permission.

**Processed** means all timesheets have been synced to the payroll system and the period is complete. This is the terminal state. Marking a period as processed requires the MANAGE_INTEGRATIONS permission.

Each status transition is one-way. An open period can be locked, and a locked period can be marked as processed. You cannot reopen a locked period or unlock a processed one.

## Auto-Create Periods

In the payroll settings, there is an option to automatically create the next pay period when the current one is locked. When enabled, locking a period triggers the creation of a new open period starting the day after the locked period ends. This keeps the timesheet system continuously available without manual intervention each pay cycle.

## What Staff See

When a staff member opens the timesheets page, WattleOS looks for the current open pay period. If one exists, the timesheet grid loads for that period. If no open period exists, the staff member sees a message indicating that no active pay period is available — with guidance to contact the administrator if they are an admin, or to wait for one to be created if they are not.

## Permissions

Creating pay periods and locking them requires the **APPROVE_TIMESHEETS** permission. Marking a period as processed requires the **MANAGE_INTEGRATIONS** permission. Viewing pay periods in the management interface requires APPROVE_TIMESHEETS. Staff with only the LOG_TIME permission can see the current period on their timesheet page but cannot manage periods.
