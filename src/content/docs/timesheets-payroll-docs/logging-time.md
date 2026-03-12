# Logging Time

The timesheet grid is where staff record their daily hours during each pay period. It is designed for quick entry - each day of the period appears as a row where you enter your start time, end time, break duration, and entry type. Hours are calculated automatically, and a submit button sends the completed timesheet for approval.

## The Timesheet Grid

Navigate to **Timesheets** from the sidebar to open the grid for the current pay period. The grid shows one row per day in the period, with columns for the date, start time, end time, break (in minutes), entry type, notes, and calculated total hours.

Weekdays and weekends are visually distinguished. If your school has configured default work hours in the payroll settings (for example, 8:30 AM to 3:30 PM with a 30-minute break), those values are pre-filled when you add a new row. You can adjust them for any day that differs from the standard.

## Entry Types

Each day's entry has a type that determines how the hours are categorised on the timesheet summary.

**Regular** is standard working hours. **Overtime** is hours beyond the normal schedule. **Public holiday** is time worked on a gazetted public holiday. **Sick leave**, **annual leave**, and **unpaid leave** record the corresponding leave types.

The entry type affects how hours are tallied. When you submit your timesheet, WattleOS calculates three totals: regular hours (from regular and public holiday entries), overtime hours, and leave hours (from sick, annual, and unpaid leave entries). These breakdowns are visible to the approver and carry through to the payroll sync.

## Filling in Your Hours

Click on any day's row to edit the start time, end time, break, and type. The total hours are calculated automatically as (end time minus start time minus break duration). For example, 8:30 AM to 3:30 PM with a 30-minute break gives 6.5 hours.

If your schedule is consistent, the **Fill Defaults** button populates all empty weekday rows with the default start time, end time, and break from your school's payroll settings. This is a significant time-saver - you fill defaults, then adjust only the days that were different (a sick day, a late start, overtime).

Notes can be added to any day's entry for additional context, such as "covered Year 6 class" or "parent-teacher conferences." Notes are visible to the approver.

## Saving Entries

Time entries are saved individually as you complete each day's row. Each save creates or updates a time entry record linked to your user account and the current pay period. You do not need to save the entire grid at once - entries persist as you go.

## Deleting Entries

You can delete a time entry for any day, which clears that row and removes the record. Deletion is only allowed while the pay period is open. Once the period is locked, existing entries cannot be modified or deleted. This prevents changes to hours that are already in the approval pipeline.

## What Happens When the Period Is Locked

When an administrator locks the pay period, all time entry fields become read-only. You can still view your entries and submit your timesheet (if you have not already), but you cannot add new days or change existing values. The locked state is indicated by a banner at the top of the grid.

## History

Click the **History** link on the timesheet page to see past timesheets across all pay periods. Each past timesheet shows the period name, total hours, the breakdown into regular, overtime, and leave categories, the status (submitted, approved, rejected, synced), and a timestamp for the most recent status change. Expanding a past timesheet reveals the daily entries for review.

## Permissions

Logging time entries and submitting timesheets requires the **LOG_TIME** permission. This is typically granted to all staff - guides, coordinators, and administrators. Time entries are scoped to your own user account; you cannot log hours on behalf of another staff member.
