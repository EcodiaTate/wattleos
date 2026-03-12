# Logging Time

Staff members log their daily working hours through the timesheet grid. Each entry records the date, start time, end time, break duration, entry type, and optional notes. Entries are automatically linked to the current pay period and aggregated when the timesheet is submitted.

## Accessing the Timesheet

Navigate to **Timesheets** in the sidebar. This requires the **Log Time** permission, which is included in all staff roles by default. The timesheet page shows a grid view of the current pay period with one row per day.

## The Timesheet Grid

The grid displays each day in the current pay period as a row. Each row shows:

- **Date** - The calendar date
- **Start time** - When work began (defaults from payroll settings, e.g. 8:00 AM)
- **End time** - When work ended (defaults from payroll settings, e.g. 4:00 PM)
- **Break** - Break duration in minutes (defaults from payroll settings, e.g. 30 minutes)
- **Type** - The entry type (regular, overtime, or leave category)
- **Class** - Optional class assignment for the day (useful for guides who work across multiple classrooms)
- **Notes** - Optional notes for context (e.g. "Staff meeting PM," "Relief for Cycle 2")
- **Total hours** - Automatically calculated from start time, end time, and break minutes

Editing a cell and moving to the next row (on blur) automatically saves the entry via an upsert - if an entry already exists for that date, it is updated; otherwise a new entry is created. This means there is no separate "Save" button for individual entries.

## Entry Types

Each time entry has a type that determines how the hours are categorised in the timesheet summary:

**Regular** - Standard working hours. The default for most entries.

**Overtime** - Hours worked beyond the standard day. Tracked separately for payroll compliance.

**Public Holiday** - Hours worked on a public holiday. Classified as leave hours in the timesheet summary.

**Sick Leave** - Personal or carer's leave. Classified as leave hours.

**Annual Leave** - Holiday/vacation leave. Classified as leave hours.

**Unpaid Leave** - Leave without pay. Classified as leave hours but typically excluded from pay calculations.

When the timesheet is submitted, hours are broken down into three categories: regular hours, overtime hours, and leave hours (which includes sick leave, annual leave, unpaid leave, and public holiday entries).

## Pay Period Awareness

Time entries are automatically linked to the pay period that covers their date. The system finds the open pay period whose date range includes the entry date and sets the `pay_period_id` accordingly.

If no open pay period covers the date, the entry is still saved but with a null period link. This can happen if pay periods have not been created yet or if there is a gap between periods.

Entries cannot be created or edited for dates that fall within a locked or processed pay period. The system checks for this before saving and returns an error if the period is closed.

## Deleting Entries

Staff can delete their own time entries by clicking the delete action on any row. Deletion is a soft delete - the record is preserved but hidden. Entries in locked or processed pay periods cannot be deleted.

Only the entry owner can delete their entries. Approvers review and approve timesheets but do not modify individual entries.

## Default Values

The payroll settings (configured by administrators in **Admin → Settings → Payroll**) provide default values for the timesheet grid:

- **Default start time** - Pre-filled in the start column (e.g. 8:00 AM)
- **Default end time** - Pre-filled in the end column (e.g. 4:00 PM)
- **Default break minutes** - Pre-filled in the break column (e.g. 30 minutes)

These defaults speed up entry for staff with regular schedules. Staff can override any default on any day.

## Permissions

- **Log Time** - Required to view the timesheet grid, create entries, edit own entries, delete own entries, and submit timesheets. All staff roles include this permission by default.
