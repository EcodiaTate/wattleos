// src/types/display.ts
//
// ============================================================
// WattleOS V2 - Display & Appearance Types
// ============================================================
// Shared types for tenant appearance settings AND per-user
// display preferences.
//
// Used by:
//   - Root layout (reads cookie → applies data attributes)
//   - Admin appearance page (reads/writes via server action)
//   - User display settings page (reads/writes user overrides)
//   - Server actions (persist to tenants.settings JSONB / cookie)
//
// TWO COOKIES:
//   1. wattle-display   - effective values the root layout reads
//      (theme, density, fontScale, brand, accent, sidebar)
//   2. wattle-user-prefs - tracks whether the user explicitly
//      chose theme/density/fontScale or is using school default.
//      WHY separate: The main cookie always holds the effective
//      value ("dark"), but we need to know if that's because the
//      user chose dark or because the school default is dark.
//      The UI shows "(using school default)" when null.
// ============================================================

// ============================================================
// Core Types
// ============================================================

export type DensityMode = "compact" | "comfortable" | "spacious";
export type ThemeMode = "light" | "dark" | "system";
export type FontScale = "sm" | "base" | "lg" | "xl";
export type SidebarStyle = "light" | "dark" | "brand";

export interface TenantDisplaySettings {
  /** Primary brand color hue (0–360). null = default wattle amber (38). */
  brandHue: number | null;
  /** Primary brand color saturation (0–100). null = default (92). */
  brandSaturation: number | null;
  /** Accent color hue (0–360). null = default eucalyptus (152). */
  accentHue: number | null;
  /** Accent color saturation (0–100). null = default (35). */
  accentSaturation: number | null;
  /** Sidebar visual style. */
  sidebarStyle: SidebarStyle;
  /** Default UI density for all users (user can override). */
  defaultDensity: DensityMode;
  /** Default color theme for all users (user can override). */
  defaultTheme: ThemeMode;
}

/**
 * Per-user display overrides. null = "use school default".
 * Stored in a separate cookie so the UI can distinguish
 * "user explicitly chose light" from "using school default light".
 */
export interface UserDisplayPreferences {
  theme: ThemeMode | null;
  density: DensityMode | null;
  fontScale: FontScale | null;
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_DISPLAY_SETTINGS: TenantDisplaySettings = {
  brandHue: null,
  brandSaturation: null,
  accentHue: null,
  accentSaturation: null,
  sidebarStyle: "light",
  defaultDensity: "comfortable",
  defaultTheme: "light",
};

export const DEFAULT_USER_PREFERENCES: UserDisplayPreferences = {
  theme: null,
  density: null,
  fontScale: null,
};

// ============================================================
// Main Display Cookie (effective values for root layout)
// ============================================================
// WHY a cookie: The root layout is a server component that
// needs display config BEFORE auth runs (it sets data attributes
// on <html> to prevent FOUC). A cookie is readable in RSC
// without a database call. The (app) layout sets/refreshes
// this cookie when the user authenticates.

export const DISPLAY_COOKIE_NAME = "wattle-display";

/** Shape stored in the main display cookie (flat, minimal). */
export interface DisplayCookieData {
  theme: ThemeMode;
  density: DensityMode;
  fontScale: FontScale;
  brandHue: number | null;
  brandSaturation: number | null;
  accentHue: number | null;
  accentSaturation: number | null;
  sidebarStyle: SidebarStyle;
}

/** Default cookie values (used when cookie is missing or invalid). */
export const DEFAULT_DISPLAY_COOKIE: DisplayCookieData = {
  theme: "light",
  density: "comfortable",
  fontScale: "base",
  brandHue: null,
  brandSaturation: null,
  accentHue: null,
  accentSaturation: null,
  sidebarStyle: "light",
};

/**
 * Parse the main display cookie string into typed data.
 * Returns defaults for any missing/invalid fields.
 * Never throws - always returns a valid DisplayCookieData.
 */
export function parseDisplayCookie(
  raw: string | undefined | null,
): DisplayCookieData {
  if (!raw) return { ...DEFAULT_DISPLAY_COOKIE };

  try {
    const parsed = JSON.parse(raw) as Partial<DisplayCookieData>;

    return {
      theme:
        typeof parsed.theme === "string" &&
        ["light", "dark", "system"].includes(parsed.theme)
          ? (parsed.theme as ThemeMode)
          : DEFAULT_DISPLAY_COOKIE.theme,
      density:
        typeof parsed.density === "string" &&
        ["compact", "comfortable", "spacious"].includes(parsed.density)
          ? (parsed.density as DensityMode)
          : DEFAULT_DISPLAY_COOKIE.density,
      fontScale:
        typeof parsed.fontScale === "string" &&
        ["sm", "base", "lg", "xl"].includes(parsed.fontScale)
          ? (parsed.fontScale as FontScale)
          : DEFAULT_DISPLAY_COOKIE.fontScale,
      brandHue:
        typeof parsed.brandHue === "number" ? parsed.brandHue : null,
      brandSaturation:
        typeof parsed.brandSaturation === "number"
          ? parsed.brandSaturation
          : null,
      accentHue:
        typeof parsed.accentHue === "number" ? parsed.accentHue : null,
      accentSaturation:
        typeof parsed.accentSaturation === "number"
          ? parsed.accentSaturation
          : null,
      sidebarStyle:
        typeof parsed.sidebarStyle === "string" &&
        ["light", "dark", "brand"].includes(parsed.sidebarStyle)
          ? (parsed.sidebarStyle as SidebarStyle)
          : DEFAULT_DISPLAY_COOKIE.sidebarStyle,
    };
  } catch {
    return { ...DEFAULT_DISPLAY_COOKIE };
  }
}

/**
 * Serialize display data to a cookie-safe JSON string.
 * Used by the (app) layout when refreshing the cookie.
 */
export function serializeDisplayCookie(data: DisplayCookieData): string {
  return JSON.stringify(data);
}

/**
 * Build a DisplayCookieData from TenantDisplaySettings + user overrides.
 * Called in the (app) layout to merge tenant defaults with
 * per-user preferences before writing the cookie.
 */
export function buildDisplayCookie(
  tenantSettings: TenantDisplaySettings,
  userOverrides?: {
    theme?: ThemeMode;
    density?: DensityMode;
    fontScale?: FontScale;
  },
): DisplayCookieData {
  return {
    theme: userOverrides?.theme ?? tenantSettings.defaultTheme,
    density: userOverrides?.density ?? tenantSettings.defaultDensity,
    fontScale: userOverrides?.fontScale ?? "base",
    brandHue: tenantSettings.brandHue,
    brandSaturation: tenantSettings.brandSaturation,
    accentHue: tenantSettings.accentHue,
    accentSaturation: tenantSettings.accentSaturation,
    sidebarStyle: tenantSettings.sidebarStyle,
  };
}

// ============================================================
// User Preferences Cookie (override tracking)
// ============================================================
// WHY separate: The main cookie always stores the *effective*
// value ("dark"). But we need to know if that's because the
// user explicitly chose dark, or because the school default is
// dark. null = "use school default" in the UI.

export const USER_PREFS_COOKIE_NAME = "wattle-user-prefs";

/**
 * Parse the user preferences cookie.
 * Returns all-null (use school defaults) if missing or invalid.
 */
export function parseUserPrefsCookie(
  raw: string | undefined | null,
): UserDisplayPreferences {
  if (!raw) return { ...DEFAULT_USER_PREFERENCES };

  try {
    const parsed = JSON.parse(raw) as Partial<UserDisplayPreferences>;

    return {
      theme:
        parsed.theme === null
          ? null
          : typeof parsed.theme === "string" &&
              ["light", "dark", "system"].includes(parsed.theme)
            ? (parsed.theme as ThemeMode)
            : null,
      density:
        parsed.density === null
          ? null
          : typeof parsed.density === "string" &&
              ["compact", "comfortable", "spacious"].includes(parsed.density)
            ? (parsed.density as DensityMode)
            : null,
      fontScale:
        parsed.fontScale === null
          ? null
          : typeof parsed.fontScale === "string" &&
              ["sm", "base", "lg", "xl"].includes(parsed.fontScale)
            ? (parsed.fontScale as FontScale)
            : null,
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

/**
 * Serialize user preferences to a cookie-safe JSON string.
 */
export function serializeUserPrefsCookie(
  data: UserDisplayPreferences,
): string {
  return JSON.stringify(data);
}

// ============================================================
// Option Metadata (for UI selectors)
// ============================================================

export const DENSITY_OPTIONS: ReadonlyArray<{
  value: DensityMode;
  label: string;
  description: string;
}> = [
  {
    value: "compact",
    label: "Compact",
    description: "Dense layout for power users and small screens",
  },
  {
    value: "comfortable",
    label: "Comfortable",
    description: "Balanced for everyday use",
  },
  {
    value: "spacious",
    label: "Spacious",
    description: "Touch-optimised, accessibility-first",
  },
];

export const THEME_OPTIONS: ReadonlyArray<{
  value: ThemeMode;
  label: string;
}> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export const FONT_SCALE_OPTIONS: ReadonlyArray<{
  value: FontScale;
  label: string;
  description: string;
}> = [
  { value: "sm", label: "Small", description: "Fits more content on screen" },
  { value: "base", label: "Default", description: "Standard text size" },
  { value: "lg", label: "Large", description: "Easier to read" },
  { value: "xl", label: "Extra Large", description: "Maximum readability" },
];

export const SIDEBAR_STYLE_OPTIONS: ReadonlyArray<{
  value: SidebarStyle;
  label: string;
  description: string;
}> = [
  { value: "light", label: "Light", description: "Clean and minimal" },
  { value: "dark", label: "Dark", description: "High contrast sidebar" },
  {
    value: "brand",
    label: "Brand",
    description: "Sidebar uses your brand colour",
  },
];

// ============================================================
// Color Presets
// ============================================================

export interface ColorPreset {
  label: string;
  hue: number;
  saturation: number;
}

/** Curated brand colour presets. School-appropriate, WCAG-tested. */
export const BRAND_COLOR_PRESETS: ReadonlyArray<ColorPreset> = [
  { label: "Wattle Gold", hue: 38, saturation: 92 },
  { label: "Forest", hue: 152, saturation: 50 },
  { label: "Ocean", hue: 210, saturation: 65 },
  { label: "Navy", hue: 220, saturation: 60 },
  { label: "Berry", hue: 270, saturation: 50 },
  { label: "Rose", hue: 340, saturation: 60 },
  { label: "Teal", hue: 180, saturation: 50 },
  { label: "Terracotta", hue: 15, saturation: 70 },
  { label: "Sage", hue: 140, saturation: 25 },
  { label: "Slate", hue: 215, saturation: 20 },
];

/** Curated accent colour presets. Complement the brand colour. */
export const ACCENT_COLOR_PRESETS: ReadonlyArray<ColorPreset> = [
  { label: "Eucalyptus", hue: 152, saturation: 35 },
  { label: "Sky", hue: 200, saturation: 45 },
  { label: "Lavender", hue: 260, saturation: 35 },
  { label: "Coral", hue: 10, saturation: 50 },
  { label: "Mint", hue: 165, saturation: 40 },
  { label: "Marigold", hue: 45, saturation: 60 },
  { label: "Plum", hue: 290, saturation: 35 },
  { label: "Dusty Rose", hue: 350, saturation: 30 },
];