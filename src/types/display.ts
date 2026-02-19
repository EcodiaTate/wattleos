// src/types/display.ts
//
// ============================================================
// WattleOS V2 - Display & Theme Configuration Types
// ============================================================
// Shared types for the configurable design system.
//
// THREE LAYERS OF CONFIGURATION:
//   1. Platform defaults (hardcoded in globals.css + here)
//   2. Tenant settings (admin configures via tenants.settings.display)
//   3. User preferences (individual override via tenant_users.display_preferences)
//
// Resolution order: user pref > tenant setting > platform default
// ============================================================

// ============================================================
// Enums / Unions
// ============================================================

export type DensityMode = "compact" | "comfortable" | "spacious";
export type FontScale = "sm" | "base" | "lg" | "xl";
export type ThemeMode = "light" | "dark" | "system";

export const DENSITY_OPTIONS: {
  value: DensityMode;
  label: string;
  description: string;
}[] = [
  {
    value: "compact",
    label: "Compact",
    description: "Denser layout - fits more on screen",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Balanced spacing - the default",
  },
  {
    value: "spacious",
    label: "Spacious",
    description: "More breathing room - larger touch targets",
  },
];

export const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "base", label: "Default" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
];

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

// ============================================================
// Tenant Display Settings (Admin-configured, per-school)
// ============================================================
// Stored in: tenants.settings.display (JSONB)
// Set by: Admin in School Settings > Appearance
// Permission: manage_tenant_settings
// ============================================================

export interface TenantDisplaySettings {
  /** Brand hue override (0-360). null = use default wattle amber (38) */
  brandHue: number | null;
  /** Brand saturation override (0-100). null = use default (92) */
  brandSaturation: number | null;
  /** Default density for all users in this tenant */
  defaultDensity: DensityMode;
  /** Default theme for all users in this tenant */
  defaultTheme: ThemeMode;
  /** School favicon URL */
  faviconUrl: string | null;
}

export const DEFAULT_TENANT_DISPLAY: TenantDisplaySettings = {
  brandHue: null,
  brandSaturation: null,
  defaultDensity: "comfortable",
  defaultTheme: "light",
  faviconUrl: null,
};

// ============================================================
// User Display Preferences (Per-user override)
// ============================================================
// Stored in: tenant_users.display_preferences (JSONB)
// Set by: User in their profile settings
// ============================================================

export interface UserDisplayPreferences {
  /** Theme override. null = use tenant default */
  theme: ThemeMode | null;
  /** Density override. null = use tenant default */
  density: DensityMode | null;
  /** Font scale override. null = 'base' */
  fontScale: FontScale | null;
  /** Sidebar collapsed by default */
  sidebarCollapsed: boolean;
}

export const DEFAULT_USER_DISPLAY: UserDisplayPreferences = {
  theme: null,
  density: null,
  fontScale: null,
  sidebarCollapsed: false,
};

// ============================================================
// Resolved Display Config
// ============================================================
// Computed from: merge(platform defaults, tenant settings, user prefs)
// This is what layout.tsx actually uses and what gets written
// into the wattle-display cookie.
// ============================================================

export interface ResolvedDisplayConfig {
  theme: ThemeMode;
  density: DensityMode;
  fontScale: FontScale;
  brandHue: number | null;
  brandSaturation: number | null;
  sidebarCollapsed: boolean;
}

export const DEFAULT_RESOLVED_DISPLAY: ResolvedDisplayConfig = {
  theme: "light",
  density: "comfortable",
  fontScale: "base",
  brandHue: null,
  brandSaturation: null,
  sidebarCollapsed: false,
};

/**
 * Resolves the display configuration by merging tenant + user layers.
 * Called in the (app) layout server component after fetching both.
 */
export function resolveDisplayConfig(
  tenant: TenantDisplaySettings | null,
  user: UserDisplayPreferences | null,
): ResolvedDisplayConfig {
  const t = tenant ?? DEFAULT_TENANT_DISPLAY;
  const u = user ?? DEFAULT_USER_DISPLAY;

  return {
    theme: u.theme ?? t.defaultTheme,
    density: u.density ?? t.defaultDensity,
    fontScale: u.fontScale ?? "base",
    brandHue: t.brandHue,
    brandSaturation: t.brandSaturation,
    sidebarCollapsed: u.sidebarCollapsed,
  };
}

/**
 * Parses the raw JSONB from tenants.settings.display into typed form.
 * Returns defaults for any missing or invalid fields.
 */
export function parseTenantDisplaySettings(
  raw: unknown,
): TenantDisplaySettings {
  if (!raw || typeof raw !== "object") return DEFAULT_TENANT_DISPLAY;

  const obj = raw as Record<string, unknown>;

  return {
    brandHue:
      typeof obj.brandHue === "number" &&
      obj.brandHue >= 0 &&
      obj.brandHue <= 360
        ? obj.brandHue
        : null,
    brandSaturation:
      typeof obj.brandSaturation === "number" &&
      obj.brandSaturation >= 0 &&
      obj.brandSaturation <= 100
        ? obj.brandSaturation
        : null,
    defaultDensity: isDensity(obj.defaultDensity)
      ? obj.defaultDensity
      : "comfortable",
    defaultTheme: isTheme(obj.defaultTheme) ? obj.defaultTheme : "light",
    faviconUrl: typeof obj.faviconUrl === "string" ? obj.faviconUrl : null,
  };
}

/**
 * Parses the raw JSONB from tenant_users.display_preferences into typed form.
 */
export function parseUserDisplayPreferences(
  raw: unknown,
): UserDisplayPreferences {
  if (!raw || typeof raw !== "object") return DEFAULT_USER_DISPLAY;

  const obj = raw as Record<string, unknown>;

  return {
    theme: isTheme(obj.theme) ? obj.theme : null,
    density: isDensity(obj.density) ? obj.density : null,
    fontScale: isFontScale(obj.fontScale) ? obj.fontScale : null,
    sidebarCollapsed:
      typeof obj.sidebarCollapsed === "boolean" ? obj.sidebarCollapsed : false,
  };
}

// ============================================================
// Type Guards
// ============================================================

function isDensity(v: unknown): v is DensityMode {
  return v === "compact" || v === "comfortable" || v === "spacious";
}

function isTheme(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

function isFontScale(v: unknown): v is FontScale {
  return v === "sm" || v === "base" || v === "lg" || v === "xl";
}

// ============================================================
// Cookie Shape
// ============================================================
// The resolved config is serialized to a cookie so the root
// layout (which can't call getTenantContext) can apply it.
// ============================================================

export const DISPLAY_COOKIE_NAME = "wattle-display";
export const DISPLAY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Serialize resolved config to a cookie-safe JSON string.
 */
export function serializeDisplayCookie(config: ResolvedDisplayConfig): string {
  return JSON.stringify(config);
}

/**
 * Parse a display cookie back to ResolvedDisplayConfig.
 * Returns defaults if parsing fails.
 */
export function parseDisplayCookie(
  cookieValue: string | undefined,
): ResolvedDisplayConfig {
  if (!cookieValue) return DEFAULT_RESOLVED_DISPLAY;

  try {
    const parsed = JSON.parse(cookieValue);
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : "light",
      density: isDensity(parsed.density) ? parsed.density : "comfortable",
      fontScale: isFontScale(parsed.fontScale) ? parsed.fontScale : "base",
      brandHue: typeof parsed.brandHue === "number" ? parsed.brandHue : null,
      brandSaturation:
        typeof parsed.brandSaturation === "number"
          ? parsed.brandSaturation
          : null,
      sidebarCollapsed:
        typeof parsed.sidebarCollapsed === "boolean"
          ? parsed.sidebarCollapsed
          : false,
    };
  } catch {
    return DEFAULT_RESOLVED_DISPLAY;
  }
}

// ============================================================
// Avatar Helpers
// ============================================================

/**
 * Returns a CSS variable name for a deterministic avatar color.
 * Uses the 8-color palette from globals.css (--avatar-0 through --avatar-7).
 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % 8;
  return `var(--avatar-${index})`;
}

/**
 * Returns initials from a name (1-2 characters).
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
