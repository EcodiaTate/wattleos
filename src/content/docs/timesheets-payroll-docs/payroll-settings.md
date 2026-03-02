# Payroll Settings

Payroll settings configure how your school's timesheet system operates — the pay cycle, default work hours, and the connection to an external payroll provider. These settings are school-wide and affect all staff timesheets.

## Accessing Payroll Settings

Navigate to **Admin → Settings → Payroll** to open the payroll configuration page. The page is divided into three sections: pay cycle, default work hours, and payroll provider. From this page you can also access pay period management and employee mapping through the navigation links at the top.

Settings are created automatically with sensible defaults the first time you access the page. You can adjust them at any time.

## Pay Cycle

The pay cycle section controls the rhythm of your timesheet periods.

**Pay frequency** sets how often staff are paid: weekly, fortnightly, or monthly. This determines the length of each pay period and affects the auto-calculation of end dates when creating new periods.

**Cycle start day** sets which day of the week the pay cycle begins. For example, if your school pays fortnightly starting on Mondays, set the frequency to fortnightly and the start day to Monday.

**Auto-create periods** is a toggle that, when enabled, automatically creates the next pay period when the current one is locked. This keeps the system running without manual intervention each pay cycle. When disabled, an administrator must manually create each new period.

## Default Work Hours

The default work hours section defines the standard daily schedule that is pre-filled in staff timesheets.

**Start time** is the default shift start (for example, 8:30 AM). **End time** is the default shift end (for example, 3:30 PM). **Break duration** in minutes is the standard unpaid break (for example, 30 minutes).

These defaults are used when staff click "Fill Defaults" on their timesheet grid, populating empty weekday rows with these values. Staff can still adjust individual days — the defaults are a convenience, not a constraint.

A preview calculation shows the resulting daily hours. For example, 8:30 AM to 3:30 PM with a 30-minute break gives 6.5 hours per day.

## Payroll Provider

The payroll provider section connects WattleOS to your external payroll system. Three options are available.

**None (manual export)** means no automatic sync. Approved timesheets show their hour totals in the admin interface, and you manually enter those figures into your payroll system.

**Xero** connects WattleOS to Xero for automatic timesheet push. When approved timesheets are synced, the hours are sent to Xero using the employee mapping configuration. Xero then handles tax, superannuation, and payment calculations.

**KeyPay** connects WattleOS to KeyPay, an Australian payroll platform. The same sync workflow applies — approved hours are pushed to KeyPay using employee mappings.

Selecting Xero or KeyPay displays an information note indicating that the direct API integration is planned for a future update. In the current version, selecting a provider configures the system for sync readiness — employee mappings can be set up, timesheets can be approved, and the approved totals are ready for manual entry into the selected system until the automatic push is available.

## A Critical Design Decision

WattleOS deliberately does not calculate tax, superannuation, award rates, penalty rates, or leave entitlements. These are compliance-critical calculations governed by Australian employment law, and getting them wrong has legal consequences. WattleOS handles the "what happened" (who worked, when, for how long, what type of hours) and pushes that data to a system purpose-built for the "what it costs" (Xero or KeyPay). This separation keeps the compliance boundary clear.

## Permissions

Viewing and editing payroll settings requires the **MANAGE_INTEGRATIONS** permission. This is the same permission that controls access to the broader integrations configuration, ensuring that only authorised administrators can modify payroll settings.
