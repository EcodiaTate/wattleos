# Integrations

WattleOS connects to external services for portfolio storage, payment processing, accounting, and payroll. The Integrations page lets administrators configure these connections, manage credentials, and monitor sync status.

## Accessing Integrations

Navigate to **Admin → Integrations**. This requires the Manage Integrations or Manage Tenant Settings permission.

## Available Integrations

### Google Drive (Active)

**Purpose**: Portfolio folder provisioning and media storage for student observations.

When connected, WattleOS automatically creates a Google Drive folder for each student inside a root portfolio folder you specify. Published observation photos can be synced to the student's folder, creating a cloud-based portfolio that parents can access directly through Google Drive.

**Configuration requires**:
- **Service Account Email** — A Google Cloud service account email (e.g. wattleos@project.iam.gserviceaccount.com). Create this in the Google Cloud Console.
- **Private Key** — The private key from your service account's JSON key file. This is sensitive — WattleOS encrypts it at rest.
- **Root Portfolio Folder ID** — The Google Drive folder ID where all student portfolio folders will be created. Share this folder with the service account email so it has write access.

**Settings**:
- **Auto-share with parents** — When enabled, parents are automatically granted read access to their child's portfolio folder.
- **Folder name template** — How student portfolio folders are named. Supports `{student_name}` and `{year}` variables.

### Stripe (Active)

**Purpose**: Tuition invoicing, parent auto-pay, and payment reconciliation.

WattleOS creates invoices in Stripe, sends them to parents, and processes payments automatically. The webhook integration keeps WattleOS in sync when payments are completed, fail, or are refunded.

**Configuration requires**:
- **Secret Key** — Your Stripe secret API key (starts with `sk_live_` or `sk_test_`).
- **Publishable Key** — Your Stripe publishable key (starts with `pk_live_` or `pk_test_`). Used for client-side payment forms.
- **Webhook Signing Secret** — Used to verify that webhook events genuinely come from Stripe. Found in Stripe Dashboard → Webhooks.

**Settings**:
- **Auto-charge on invoice due date** — When enabled, automatically charges the parent's saved payment method when an invoice becomes due.
- **Currency** — The three-letter ISO currency code for invoices (e.g. aud, usd, gbp).

**Webhook events handled**: invoice.paid, invoice.payment_failed, and charge.refunded. The webhook endpoint is at `/api/webhooks/stripe`.

### Xero (Planned)

**Purpose**: Push approved timesheets to Xero for payroll processing.

When implemented, approved timesheets will sync to Xero as timesheet entries, reducing manual double-entry for payroll. Configuration will require a Xero app client ID, client secret, and tenant ID.

### KeyPay (Planned)

**Purpose**: Australian payroll integration for timesheet and leave management.

When implemented, KeyPay will receive approved timesheet data and leave requests from WattleOS. Configuration will require a KeyPay API key and business ID.

### Google Docs (Planned)

**Purpose**: Export student reports as Google Docs for collaborative editing and parent sharing.

When implemented, report cards generated in WattleOS can be exported as Google Docs, allowing guides to do final edits in a familiar word processor before sharing with families.

## Integration Dashboard

The integrations page displays each provider as a card showing:

- **Connection status** — Whether the integration is connected and configured, disconnected, or has errors.
- **Last sync** — When the most recent data sync occurred.
- **Sync history** — A log of recent sync operations with success/failure status.

## Connecting an Integration

1. Click on the integration card to open its configuration panel
2. Enter the required credentials (API keys, secrets, account IDs)
3. Configure any optional settings
4. Click **Save** to store the credentials
5. Click **Test Connection** to verify the integration works

Credentials are stored encrypted in the database. Only users with the Manage Integrations permission can view or modify them.

## Disconnecting an Integration

To disconnect an integration, open its configuration panel and click **Disconnect**. This removes the stored credentials and disables any automatic syncing. Historical sync logs are retained for audit purposes.

## Integration Architecture

All external service integrations live in isolated modules under `/lib/integrations/`. Each integration has its own client library that handles authentication, API calls, and error handling. Server actions in `/lib/actions/integrations.ts` manage the configuration CRUD and sync orchestration.

This isolation means that a failure in one integration (e.g. Stripe API is down) does not affect other integrations or core WattleOS functionality. Each integration fails independently and reports its status on the dashboard.

## Permissions

- **Manage Integrations** — Required to configure, connect, disconnect, and test integrations. View sync history.
- **Manage Tenant Settings** — Also grants access to the integrations page as a fallback for school administrators.
