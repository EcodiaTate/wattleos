# Managing Integrations

WattleOS connects to external services for billing, file storage, and payroll. The integrations page provides a unified interface for configuring, testing, and monitoring all external connections. Each integration is managed through a provider card with credentials, settings, an enable/disable toggle, and a sync log.

## Accessing Integrations

Navigate to **Admin → Integrations** to see the integration dashboard. This page requires the **MANAGE_INTEGRATIONS** permission. The page shows a card for each available integration provider with its current status - configured and enabled, configured but disabled, or not yet configured.

## Available Providers

WattleOS supports five integration providers.

**Google Drive** is fully implemented. It provisions portfolio folders for students, uploads observation media, and optionally shares folders with parents. **Stripe** is fully implemented. It handles tuition invoicing, parent auto-pay through hosted payment pages, and payment reconciliation through webhooks. **Google Docs** is planned for a future release. It will enable exporting student reports as Google Docs for editing and sharing. **Xero** is planned for a future release. It will push approved timesheets to Xero for payroll processing. **KeyPay** is planned for a future release. It will provide Australian payroll integration for timesheet and leave management.

Each provider card shows whether the integration is implemented, configured, and enabled. Providers that are not yet implemented display their credential fields for future readiness but cannot be activated.

## Configuring a Provider

Click on any provider card to expand it and access the configuration form. Each provider has its own set of required credential fields and optional settings. The form fields are generated dynamically from the provider definition - there is no hardcoded form per provider.

For each credential field, the form shows a label, placeholder, help text explaining where to find the value, and whether it is required. Password and private key fields are masked. Settings fields control provider-specific behaviour (for example, whether to auto-share Google Drive folders with parents).

After entering credentials and settings, click **Save** to store the configuration. Credentials are stored in the `integration_configs` table with tenant isolation - each school's credentials are completely separate. Every configuration change is logged in the sync log for audit purposes.

## Testing a Connection

After saving credentials, use the **Test Connection** button to verify that the credentials work. The test performs a lightweight API call specific to each provider. For Google Drive, it attempts to access the root portfolio folder using the service account credentials. For Stripe, it verifies the API key by retrieving account information.

The test result shows either a success message (for example, "Connected to folder 'School Portfolios'") or a failure message explaining what went wrong. This lets you catch configuration issues immediately rather than discovering them when a student enrollment triggers a portfolio provisioning attempt.

## Enabling and Disabling

Each provider has an enable/disable toggle. A disabled integration retains its credentials and settings but does not process any operations. This is useful for temporarily pausing an integration (for example, during a Stripe account migration) without losing the configuration.

Disabling an integration does not affect any data already synced - it only prevents new operations from being initiated.

## Removing an Integration

The delete option soft-deletes the integration configuration and disables it. A confirmation prompt prevents accidental removal. After deletion, the provider card returns to its unconfigured state and can be set up again from scratch.

## Sync Logs

Each provider card provides access to its sync log - a chronological record of every operation performed through the integration. Logs include the operation type (for example, "provision_folder," "invoice_paid," "config_updated"), the status (success, failure, or pending), the affected entity type and ID, request and response data, and any error messages.

Sync logs are essential for troubleshooting integration issues. If a parent reports that their invoice payment was not recorded, or a student's portfolio folder was not created, the sync log shows exactly what happened and when.

## Permissions

All integration management - configuring credentials, testing connections, enabling/disabling, and viewing sync logs - requires the **MANAGE_INTEGRATIONS** permission. This is typically held by the school Owner and Administrator roles.
