# Payroll Settings and Integration

WattleOS connects to external payroll systems to sync approved timesheets, eliminating manual re-entry of hours. The payroll module manages three concerns: global timesheet settings, employee identity mappings, and the sync process itself.

## Accessing Payroll Settings

Navigate to **Admin → Settings → Payroll** to configure payroll integration. This requires the **Manage Integrations** permission.

## Payroll Settings

The payroll settings page configures defaults and integration parameters for the entire school:

**Pay Frequency** - The standard pay cycle: weekly, fortnightly, or monthly. This sets the expected cadence for pay period creation.

**Pay Cycle Start Day** - Which day of the week the pay cycle begins (1 = Monday through 7 = Sunday). Used when auto-generating pay periods.

**Default Start Time** - The default work start time pre-filled in the timesheet grid (e.g. 8:00 AM). Staff can override this on any entry.

**Default End Time** - The default work end time pre-filled in the timesheet grid (e.g. 4:00 PM).

**Default Break Minutes** - The default break duration pre-filled in the timesheet grid (e.g. 30 minutes).

**Payroll Provider** - The external payroll system to sync with. Currently supports Xero and KeyPay, with the option to set no provider for manual processing.

**Provider Config** - Provider-specific configuration stored as JSON (API keys, organisation IDs, pay calendar IDs). The exact fields depend on the selected provider.

**Auto-Create Periods** - When enabled, the system automatically generates new pay periods based on the frequency and start day settings.

Settings are auto-created with sensible defaults the first time the page is accessed. If no settings record exists for the tenant, one is created automatically.

## Employee Mappings

Employee mappings link WattleOS user accounts to their corresponding employee records in the external payroll system. This is essential for the sync - without a mapping, the system does not know where to send a staff member's approved hours.

### Managing Mappings

The employee mapping page (accessible from the payroll settings) shows a table of all staff with their:

- WattleOS name and email
- External payroll provider
- External employee ID (the identifier in Xero or KeyPay)
- External employee name (for verification)
- Active status

### Creating a Mapping

To map a staff member:

1. Select the WattleOS user from the staff list
2. Choose the payroll provider (Xero or KeyPay)
3. Enter the external employee ID (found in the payroll system)
4. Optionally enter the external employee name for easy verification

The external ID is required and must match exactly what the payroll system uses. Duplicate mappings (same user + same provider) are blocked.

### Deactivating Mappings

When a staff member leaves or changes payroll systems, deactivate their mapping rather than deleting it. This preserves the historical link for audit purposes while excluding them from future syncs.

## Timesheet Sync

The sync process pushes approved timesheet data to the configured payroll provider. The flow:

1. Locate all approved timesheets for the pay period
2. For each timesheet, look up the employee mapping to get the external ID
3. Push the hour breakdown (regular, overtime, leave) to the payroll API
4. Mark each successfully synced timesheet as "synced" with a timestamp
5. Report results: synced count, skipped count (no mapping), and any errors

### Sync Prerequisites

Before syncing, the system validates:

- A payroll provider is configured in the settings
- The pay period is locked (to prevent in-flight changes)
- Each timesheet has an employee mapping for the configured provider

Timesheets without a matching employee mapping are skipped with a warning. Staff members who are not mapped will need manual entry in the payroll system or a mapping must be created before re-syncing.

### Sync Status

After sync, each timesheet's status updates from "approved" to "synced" with a `synced_at` timestamp. The pay period can then be marked as "processed" to close the cycle entirely.

### Re-syncing

If a sync fails for individual timesheets (API errors, network issues), the successfully synced ones retain their status while failed ones remain as "approved." Administrators can retry the sync for the remaining timesheets.

## Supported Providers

**Xero** - Cloud accounting and payroll platform popular with Australian small businesses. Integration pushes timesheet data to Xero's payroll timesheets API.

**KeyPay** - Australian-focused payroll platform (now part of Employment Hero). Integration pushes timesheet data to KeyPay's timesheet API with support for pay categories and locations.

Both integrations are implemented as action shells with proper validation, error handling, and status tracking. The actual API client calls are wired through the provider configuration.

## Permissions

- **Manage Integrations** - Configure payroll settings, manage employee mappings, create pay periods, trigger timesheet sync, mark periods as processed. This is the primary payroll administration permission.
- **Approve Timesheets** - Required to approve timesheets before they can be synced (covered in the Approval documentation).
