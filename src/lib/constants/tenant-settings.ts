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
}

export interface UpdateTenantGeneralInput {
  name?: string;
  logo_url?: string | null;
  timezone?: string;
  country?: string;
  currency?: string;
}

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
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "NZD", label: "NZD — New Zealand Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
] as const;
