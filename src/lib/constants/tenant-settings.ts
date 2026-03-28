// src/lib/constants/tenant-settings.ts
//
// ============================================================
// WattleOS V2 - Tenant Settings Constants & Types
// ============================================================
// Shared by:
//   - Server action (tenant-settings.ts) for validation
//   - Client component (school-general-settings-client.tsx) for selects
//
// WHY separate file: "use server" files can only export async
// functions. Constants and types must live outside the action.
// ============================================================

// ============================================================
// Types
// ============================================================

/** The editable subset of tenant fields exposed to the admin UI. */
export interface TenantGeneralSettings {
  name: string;
  logo_url: string | null;
  timezone: string;
  country: string;
  currency: string;
  state: string | null;
}

// ============================================================
// AI / Ask Wattle Settings
// ============================================================

export interface TenantSettings {
  /** ST4S compliance: sensitive tools (medical, custody, wellbeing, ILP) are OFF
   *  by default and only enabled via explicit per-tenant opt-in. */
  ai_sensitive_data_enabled: boolean;
  /** Hard kill-switch: when true, sensitive tools are removed from the OpenAI
   *  tool set entirely, overriding ai_sensitive_data_enabled. */
  ai_disable_sensitive_tools: boolean;
}

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  ai_sensitive_data_enabled: false,
  ai_disable_sensitive_tools: false,
};

export interface UpdateAiSettingsInput {
  ai_sensitive_data_enabled?: boolean;
  ai_disable_sensitive_tools?: boolean;
}

export interface UpdateTenantGeneralInput {
  name?: string;
  logo_url?: string | null;
  timezone?: string;
  country?: string;
  currency?: string;
  state?: string | null;
}

// ============================================================
// Australian States / Territories
// ============================================================
// Used in tenant settings UI and for jurisdiction-conditional
// field display (e.g. religion field — QLD ISQ only).
// ============================================================

export const AUSTRALIAN_STATES = [
  { value: "ACT", label: "Australian Capital Territory (ACT)" },
  { value: "NSW", label: "New South Wales (NSW)" },
  { value: "NT", label: "Northern Territory (NT)" },
  { value: "QLD", label: "Queensland (QLD)" },
  { value: "SA", label: "South Australia (SA)" },
  { value: "TAS", label: "Tasmania (TAS)" },
  { value: "VIC", label: "Victoria (VIC)" },
  { value: "WA", label: "Western Australia (WA)" },
  { value: "OTHER", label: "Other / International" },
] as const;

export type AustralianState = (typeof AUSTRALIAN_STATES)[number]["value"];

// ============================================================
// Australian Timezones
// ============================================================
// WHY hardcoded: We're an AU-focused product. These cover every
// IANA timezone relevant to Australian schools. Extensible later
// if we expand internationally.
// ============================================================

export const AUSTRALIAN_TIMEZONES = [
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Hobart", label: "Hobart (AEST/AEDT)" },
  { value: "Australia/Darwin", label: "Darwin (ACST)" },
  { value: "Australia/Lord_Howe", label: "Lord Howe Island" },
  { value: "Pacific/Norfolk", label: "Norfolk Island" },
] as const;

export const SUPPORTED_COUNTRIES = [
  { value: "AU", label: "Australia" },
  { value: "NZ", label: "New Zealand" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
] as const;

export const SUPPORTED_CURRENCIES = [
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "NZD", label: "NZD - New Zealand Dollar" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
] as const;

// ============================================================
// Compliance Settings (Module C)
// ============================================================
// Stored in tenants.settings JSONB under the "compliance" key.
// ============================================================

export interface ComplianceSettings {
  /** Children per ECT required (e.g. 60 = 1 ECT per 60 children). */
  ect_children_per_educator: number;
  /** Minimum percentage of staff that must hold Diploma or higher. */
  qualification_target_pct: number;
  /** Days before expiry to flag items as "expiring soon". */
  expiry_warning_days: number;
  /** User ID of the supervisor who receives expiry alerts. */
  nominated_supervisor_id: string | null;
}

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  ect_children_per_educator: 60,
  qualification_target_pct: 50,
  expiry_warning_days: 60,
  nominated_supervisor_id: null,
};
