# Employee Mapping and Payroll Sync

Employee mapping connects WattleOS staff accounts to their corresponding records in your external payroll system. Without a mapping, WattleOS does not know which Xero or KeyPay employee a timesheet belongs to, and the sync cannot proceed. Once mappings are configured, approved timesheets can be pushed to payroll individually or in bulk.

## Employee Mapping

Navigate to **Admin → Settings → Payroll → Employee Mapping** to manage the connections between WattleOS users and external payroll identities.

Each mapping links a WattleOS staff member (identified by their user account) to an external employee ID and optionally an external employee name. The external employee ID is the identifier used in your payroll system - for Xero, this is the Xero Employee ID; for KeyPay, this is the KeyPay Employee ID.

### Creating a Mapping

The mapping page shows all staff members in your school. For each unmapped staff member, you can enter their external employee ID and name, then save to create the mapping. The external name is optional but helpful for verification - it confirms that the WattleOS user is linked to the correct payroll record.

### Updating and Deactivating

Existing mappings can be updated if the external ID changes (for example, if an employee is recreated in the payroll system). Mappings can also be deactivated rather than deleted. Deactivating a mapping means the staff member's timesheets will no longer sync to payroll, but the mapping record is preserved. This is useful when a staff member goes on extended leave or transitions to a role that does not require timesheet syncing. Deactivated mappings can be reactivated at any time.

### Why Mapping Is Required

The mapping is necessary because WattleOS and your payroll system are separate databases with separate user identities. WattleOS knows a staff member by their UUID and email address. Xero or KeyPay knows the same person by a different identifier. The mapping table bridges this gap. Without it, there is no way to tell the payroll system which employee the approved hours belong to.

## Syncing Timesheets to Payroll

Once a timesheet is approved and the staff member has an active employee mapping, the timesheet can be synced.

### Individual Sync

From the admin timesheet approval interface, each approved timesheet shows a sync action. Clicking sync triggers a validation pipeline: WattleOS verifies the timesheet is in approved status, checks that an active employee mapping exists for the staff member, confirms that a payroll provider is configured in the settings, and then pushes the hours to the external system. On success, the timesheet status changes to synced and a sync reference (the external timesheet or transaction ID) is stored.

### Bulk Sync

From the pay period management page, locked periods show a **Sync All** button. This finds all approved timesheets for the period and syncs them one by one, returning a count of how many succeeded and how many failed. If any fail (typically because of a missing employee mapping), the error details are reported so you can fix the issue and retry.

### The Sync Pipeline

The full sync pipeline for a single timesheet follows these steps. First, verify the timesheet is approved. Second, look up the employee mapping for the staff member. Third, check that a payroll provider is configured. Fourth, push the hour data (total, regular, overtime, leave breakdowns) to the external system via its API. Fifth, on success, mark the timesheet as synced and record the external reference.

If any step fails, the sync is aborted and the error is returned. The timesheet remains in approved status so it can be retried after the issue is resolved.

### After Sync

Once all approved timesheets for a period have been synced, the administrator can mark the pay period as processed. This is the terminal state - processed periods are complete and archived. The payroll system then handles the remaining steps: calculating award rates, tax, superannuation, and issuing payments to staff.

## Current Status

The actual API calls to Xero and KeyPay are planned for a future phase. The current implementation performs all validation steps and marks timesheets as synced for workflow completeness. The approved hour totals (regular, overtime, leave) are accurate and ready for manual entry into your payroll system until the automated push is available.

## Permissions

Managing employee mappings requires the **MANAGE_INTEGRATIONS** permission. Syncing timesheets (individual and bulk) requires the same permission. Marking a pay period as processed also requires MANAGE_INTEGRATIONS. The approval step that precedes sync requires **APPROVE_TIMESHEETS**.
