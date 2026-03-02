# Integration Architecture

WattleOS follows a consistent architecture for all external integrations. Understanding these patterns helps administrators troubleshoot issues and explains why integrations behave the way they do.

## WattleOS Is the Source of Truth

A core principle across all integrations is that WattleOS owns the school-facing data. It pushes data outward to specialised external systems — it does not pull data in. Stripe does not tell WattleOS which students are enrolled; WattleOS tells Stripe who to invoice. Google Drive does not decide which students have portfolios; WattleOS provisions the folders. Xero does not determine hours worked; WattleOS pushes the approved timesheets. The only inbound data flow is webhooks — notifications from external systems about events that happened on their side (for example, "this invoice was paid").

## Integration Isolation

All integration code lives in a dedicated directory (`/lib/integrations/`) with each provider in its own subdirectory. The Google Drive client knows nothing about WattleOS domain types like students or observations. The Stripe client knows nothing about fee schedules or enrollment. This isolation means integration code can be updated, tested, or replaced without touching any domain logic.

Domain-level server actions (in `/lib/actions/`) orchestrate the workflow: they fetch WattleOS data, call the integration client, and store the results. The integration client is a pure connector — it takes inputs and returns outputs with no knowledge of the broader system.

## The Integration Config Table

Every provider's credentials and settings are stored in the `integration_configs` table. Each record has a tenant ID, provider key, enabled flag, credentials (stored as encrypted JSONB), and settings (stored as JSONB). A unique constraint on (tenant_id, provider) ensures each school has at most one configuration per provider.

The configuration form is generated dynamically from provider definitions. Each provider declares its required credential fields (label, type, placeholder, help text) and setting fields. This means adding a new provider to the UI requires only a new definition — no new form components.

## Sync Logging

Every integration operation is recorded in the `integration_sync_logs` table. Each log entry captures the provider, operation type, entity type and ID (if applicable), status (success, failure, or pending), request data, response data, error messages, and timestamp.

This provides a complete audit trail of all data exchanged between WattleOS and external systems. If a parent's invoice shows as unpaid in WattleOS but paid in Stripe, the sync log shows exactly what webhook was received and how it was processed. If a student's portfolio folder was not created, the log shows whether the Drive API call failed and why.

Sync logs are viewable per provider from the integration dashboard and require the MANAGE_INTEGRATIONS permission.

## Connection Testing

Every implemented provider supports a connection test that performs a lightweight API call to verify credentials work. For Google Drive, this fetches metadata about the root portfolio folder. For Stripe, this retrieves account information. Testing saves the configuration first (so the test uses the current credentials), then reports success or failure with a descriptive message.

## Webhook Processing

Inbound webhooks (currently used by Stripe) follow a strict verification-first pattern. The raw request payload is verified against a signing secret before any processing occurs. This prevents spoofed webhook calls from modifying WattleOS data. After verification, the webhook handler extracts metadata (like the WattleOS invoice ID) from the event, updates the appropriate records, creates any necessary audit entries, and logs the operation.

Webhook endpoints are public API routes (they must be accessible from the external service) but are protected by signature verification rather than authentication.

## Soft Delete and Data Retention

Integration configurations are soft-deleted rather than permanently removed. This preserves the audit trail — you can see that a school had Stripe configured, when it was enabled, when it was disabled, and what operations were performed. The soft-deleted configuration retains its credentials (for potential reactivation) but is marked as disabled so no operations are processed.

## Permissions

All integration management — configuring, testing, enabling, disabling, deleting, and viewing sync logs — requires the **MANAGE_INTEGRATIONS** permission. This centralises control over external data flows under a single permission, making it easy to restrict integration access to trusted administrators.
