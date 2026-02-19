// src/lib/constants/integrations.ts
//
// ============================================================
// WattleOS V2 - Integration Constants
// ============================================================
// Provider definitions for the integrations admin UI.
// Each provider declares its required credential fields
// and settings so the config form can be generated dynamically.
// ============================================================

export type IntegrationProvider =
  | "google_drive"
  | "google_docs"
  | "stripe"
  | "xero"
  | "keypay";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "textarea" | "password";
  placeholder: string;
  required: boolean;
  helpText?: string;
}

export interface SettingField {
  key: string;
  label: string;
  type: "text" | "boolean";
  defaultValue: string | boolean;
  helpText?: string;
}

export interface ProviderDefinition {
  key: IntegrationProvider;
  label: string;
  description: string;
  icon: string;
  bgColor: string;
  color: string;
  credentialFields: CredentialField[];
  settingFields: SettingField[];
  /** Whether this integration is fully implemented */
  implemented: boolean;
}

export const INTEGRATION_PROVIDERS: Record<
  IntegrationProvider,
  ProviderDefinition
> = {
  google_drive: {
    key: "google_drive",
    label: "Google Drive",
    description:
      "Portfolio folder provisioning and media storage for student observations.",
    icon: "📁",
    bgColor: "bg-blue-50",
    color: "text-blue-700",
    implemented: true,
    credentialFields: [
      {
        key: "service_account_email",
        label: "Service Account Email",
        type: "text",
        placeholder: "wattleos@project.iam.gserviceaccount.com",
        required: true,
        helpText: "The email address of your Google Cloud service account.",
      },
      {
        key: "private_key",
        label: "Private Key",
        type: "textarea",
        placeholder:
          "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
        required: true,
        helpText:
          "The private key from your service account JSON file. Keep this secret.",
      },
      {
        key: "root_folder_id",
        label: "Root Portfolio Folder ID",
        type: "text",
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2wtIs",
        required: true,
        helpText:
          "The Google Drive folder ID where all student portfolios will be created. Share this folder with the service account email.",
      },
    ],
    settingFields: [
      {
        key: "auto_share_with_parents",
        label: "Auto-share folders with parents",
        type: "boolean",
        defaultValue: true,
        helpText:
          "Automatically grant parents read access to their child's portfolio folder.",
      },
      {
        key: "folder_name_template",
        label: "Folder name template",
        type: "text",
        defaultValue: "{student_name}",
        helpText:
          "How to name student portfolio folders. Supports: {student_name}, {year}.",
      },
    ],
  },

  google_docs: {
    key: "google_docs",
    label: "Google Docs",
    description:
      "Export student reports as Google Docs for editing and sharing.",
    icon: "📄",
    bgColor: "bg-blue-50",
    color: "text-blue-700",
    implemented: false,
    credentialFields: [
      {
        key: "service_account_email",
        label: "Service Account Email",
        type: "text",
        placeholder: "wattleos@project.iam.gserviceaccount.com",
        required: true,
      },
      {
        key: "private_key",
        label: "Private Key",
        type: "textarea",
        placeholder: "-----BEGIN PRIVATE KEY-----\n...",
        required: true,
      },
      {
        key: "template_folder_id",
        label: "Report Template Folder ID",
        type: "text",
        placeholder: "Google Drive folder ID",
        required: true,
        helpText: "Folder containing Google Docs report templates.",
      },
    ],
    settingFields: [],
  },

  stripe: {
    key: "stripe",
    label: "Stripe",
    description:
      "Tuition invoicing, parent auto-pay, and payment reconciliation.",
    icon: "💳",
    bgColor: "bg-purple-50",
    color: "text-purple-700",
    // WHY implemented: true - Full Stripe client exists at
    // lib/integrations/stripe/client.ts (create invoice, finalize,
    // send, refund, webhook verification). Billing server actions
    // handle sync-to-Stripe flow. Webhook route handles invoice.paid,
    // invoice.payment_failed, and charge.refunded events.
    implemented: true,
    credentialFields: [
      {
        key: "secret_key",
        label: "Secret Key",
        type: "password",
        placeholder: "sk_live_...",
        required: true,
        helpText: "Your Stripe secret API key. Use test keys for development.",
      },
      {
        key: "publishable_key",
        label: "Publishable Key",
        type: "text",
        placeholder: "pk_live_...",
        required: true,
        helpText: "Your Stripe publishable key for client-side checkout.",
      },
      {
        key: "webhook_secret",
        label: "Webhook Signing Secret",
        type: "password",
        placeholder: "whsec_...",
        required: true,
        helpText:
          "Used to verify webhook payloads. Found in Stripe Dashboard → Webhooks.",
      },
    ],
    settingFields: [
      {
        key: "auto_charge",
        label: "Auto-charge on invoice due date",
        type: "boolean",
        defaultValue: true,
        helpText:
          "Automatically charge the parent's saved payment method when an invoice is due.",
      },
      {
        key: "currency",
        label: "Currency",
        type: "text",
        defaultValue: "aud",
        helpText: "Three-letter ISO currency code (e.g., aud, usd, gbp).",
      },
    ],
  },

  xero: {
    key: "xero",
    label: "Xero",
    description: "Push approved timesheets to Xero for payroll processing.",
    icon: "📊",
    bgColor: "bg-cyan-50",
    color: "text-cyan-700",
    implemented: false,
    credentialFields: [
      {
        key: "client_id",
        label: "Client ID",
        type: "text",
        placeholder: "Your Xero app client ID",
        required: true,
      },
      {
        key: "client_secret",
        label: "Client Secret",
        type: "password",
        placeholder: "Your Xero app client secret",
        required: true,
      },
      {
        key: "tenant_id",
        label: "Xero Tenant ID",
        type: "text",
        placeholder: "Your Xero organization ID",
        required: true,
        helpText: "Found in your Xero connected apps settings.",
      },
    ],
    settingFields: [],
  },

  keypay: {
    key: "keypay",
    label: "KeyPay",
    description:
      "Australian payroll integration for timesheet and leave management.",
    icon: "🔑",
    bgColor: "bg-green-50",
    color: "text-green-700",
    implemented: false,
    credentialFields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        placeholder: "Your KeyPay API key",
        required: true,
      },
      {
        key: "business_id",
        label: "Business ID",
        type: "text",
        placeholder: "Your KeyPay business ID",
        required: true,
      },
    ],
    settingFields: [],
  },
};

export const INTEGRATION_PROVIDER_LIST = Object.values(INTEGRATION_PROVIDERS);

export const SYNC_STATUS_CONFIG = {
  success: {
    label: "Success",
    bgColor: "bg-green-100",
    color: "text-green-700",
  },
  failure: { label: "Failed", bgColor: "bg-red-100", color: "text-red-700" },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-100",
    color: "text-yellow-700",
  },
} as const;
