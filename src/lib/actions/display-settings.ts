// src/lib/actions/display-settings.ts
//
// ============================================================
// WattleOS V2 — Display Settings Server Actions
// ============================================================
// Two layers of display configuration:
//
//   1. TENANT (admin)  — brand colour, accent, sidebar style,
//      default theme & density. Stored in tenants.settings JSONB.
//      Requires MANAGE_TENANT_SETTINGS permission.
//
//   2. USER (personal) — theme, density, font scale overrides.
//      Stored in a cookie (wattle-user-prefs). No permission
//      needed — every authenticated user can set their own.
//
// WHY cookies for user prefs instead of a DB table: User display
// preferences are inherently per-device (you might want dark on
// your phone, light on desktop). A DB table would require a
// migration and wouldn't capture this nuance. Cookies are fast,
// per-device, and avoid a DB round-trip in the root layout.
//
// COOKIE ARCHITECTURE:
//   wattle-display    — effective values the root layout reads
//   wattle-user-prefs — tracks user overrides (null = school default)
//
// All actions return ActionResponse<T> — never throw.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import {
  type TenantDisplaySettings,
  type UserDisplayPreferences,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_COOKIE_NAME,
  USER_PREFS_COOKIE_NAME,
  buildDisplayCookie,
  parseDisplayCookie,
  parseUserPrefsCookie,
  serializeDisplayCookie,
  serializeUserPrefsCookie,
} from "@/types/display";
import { cookies } from "next/headers";

// ============================================================
// Keys used in the tenants.settings JSONB
// ============================================================

const SETTINGS_KEYS = {
  BRAND_HUE: "brand_hue",
  BRAND_SATURATION: "brand_saturation",
  ACCENT_HUE: "accent_hue",
  ACCENT_SATURATION: "accent_saturation",
  SIDEBAR_STYLE: "sidebar_style",
  DEFAULT_DENSITY: "default_density",
  DEFAULT_THEME: "default_theme",
} as const;

// ============================================================
// Cookie write helper (shared by all actions below)
// ============================================================

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: false, // Client script needs to read for system theme detection
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

// ============================================================
// TENANT: GET DISPLAY SETTINGS
// ============================================================

export async function getTenantDisplaySettings(): Promise<
  ActionResponse<TenantDisplaySettings>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", context.tenant.id)
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const s = (data?.settings ?? {}) as Record<string, unknown>;

    const settings: TenantDisplaySettings = {
      brandHue:
        typeof s[SETTINGS_KEYS.BRAND_HUE] === "number"
          ? (s[SETTINGS_KEYS.BRAND_HUE] as number)
          : DEFAULT_DISPLAY_SETTINGS.brandHue,
      brandSaturation:
        typeof s[SETTINGS_KEYS.BRAND_SATURATION] === "number"
          ? (s[SETTINGS_KEYS.BRAND_SATURATION] as number)
          : DEFAULT_DISPLAY_SETTINGS.brandSaturation,
      accentHue:
        typeof s[SETTINGS_KEYS.ACCENT_HUE] === "number"
          ? (s[SETTINGS_KEYS.ACCENT_HUE] as number)
          : DEFAULT_DISPLAY_SETTINGS.accentHue,
      accentSaturation:
        typeof s[SETTINGS_KEYS.ACCENT_SATURATION] === "number"
          ? (s[SETTINGS_KEYS.ACCENT_SATURATION] as number)
          : DEFAULT_DISPLAY_SETTINGS.accentSaturation,
      sidebarStyle:
        typeof s[SETTINGS_KEYS.SIDEBAR_STYLE] === "string" &&
        ["light", "dark", "brand"].includes(
          s[SETTINGS_KEYS.SIDEBAR_STYLE] as string,
        )
          ? (s[SETTINGS_KEYS.SIDEBAR_STYLE] as TenantDisplaySettings["sidebarStyle"])
          : DEFAULT_DISPLAY_SETTINGS.sidebarStyle,
      defaultDensity:
        typeof s[SETTINGS_KEYS.DEFAULT_DENSITY] === "string" &&
        ["compact", "comfortable", "spacious"].includes(
          s[SETTINGS_KEYS.DEFAULT_DENSITY] as string,
        )
          ? (s[SETTINGS_KEYS.DEFAULT_DENSITY] as TenantDisplaySettings["defaultDensity"])
          : DEFAULT_DISPLAY_SETTINGS.defaultDensity,
      defaultTheme:
        typeof s[SETTINGS_KEYS.DEFAULT_THEME] === "string" &&
        ["light", "dark", "system"].includes(
          s[SETTINGS_KEYS.DEFAULT_THEME] as string,
        )
          ? (s[SETTINGS_KEYS.DEFAULT_THEME] as TenantDisplaySettings["defaultTheme"])
          : DEFAULT_DISPLAY_SETTINGS.defaultTheme,
    };

    return success(settings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get display settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// TENANT: UPDATE DISPLAY SETTINGS (Admin only)
// ============================================================
// 1. Permission-gates via requirePermission (the security boundary)
// 2. Uses admin client to bypass RLS (tenants has no UPDATE policy)
// 3. Merges display settings into existing tenants.settings JSONB
// 4. Writes the display cookie, respecting any user overrides

export async function updateTenantDisplaySettings(
  input: TenantDisplaySettings,
): Promise<ActionResponse<TenantDisplaySettings>> {
  try {
    // ── 0. Permission gate (this IS the security boundary) ──
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();

    // ── 1. Use admin client — tenants table has no UPDATE RLS
    // policy, so the user client silently fails (0 rows, no
    // error). Admin client bypasses RLS; requirePermission()
    // above is the access control. ───────────────────────────
    const supabase = createSupabaseAdminClient();

    // ── 2. Read existing settings to merge ──────────────────
    const { data: existing, error: readError } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", context.tenant.id)
      .single();

    if (readError) {
      return failure(readError.message, ErrorCodes.DATABASE_ERROR);
    }

    const currentSettings = (existing?.settings ?? {}) as Record<
      string,
      unknown
    >;

    // ── 3. Merge display keys (preserve non-display keys) ───
    const mergedSettings = {
      ...currentSettings,
      [SETTINGS_KEYS.BRAND_HUE]: input.brandHue,
      [SETTINGS_KEYS.BRAND_SATURATION]: input.brandSaturation,
      [SETTINGS_KEYS.ACCENT_HUE]: input.accentHue,
      [SETTINGS_KEYS.ACCENT_SATURATION]: input.accentSaturation,
      [SETTINGS_KEYS.SIDEBAR_STYLE]: input.sidebarStyle,
      [SETTINGS_KEYS.DEFAULT_DENSITY]: input.defaultDensity,
      [SETTINGS_KEYS.DEFAULT_THEME]: input.defaultTheme,
    };

    const { error: updateError } = await supabase
      .from("tenants")
      .update({ settings: mergedSettings })
      .eq("id", context.tenant.id);

    if (updateError) {
      return failure(updateError.message, ErrorCodes.DATABASE_ERROR);
    }

    // ── 4. Update the display cookie immediately ────────────
    // Read user prefs to respect their explicit overrides.
    // If a user explicitly chose dark mode, we don't overwrite
    // it just because the admin changed the school default.
    // But if the user has no override (null), they get the
    // admin's new default.
    try {
      const cookieStore = await cookies();

      const userPrefs = parseUserPrefsCookie(
        cookieStore.get(USER_PREFS_COOKIE_NAME)?.value,
      );

      const existingCookie = parseDisplayCookie(
        cookieStore.get(DISPLAY_COOKIE_NAME)?.value,
      );

      const freshCookie = buildDisplayCookie(input, {
        theme: userPrefs.theme ?? input.defaultTheme,
        density: userPrefs.density ?? input.defaultDensity,
        fontScale: userPrefs.fontScale ?? existingCookie.fontScale,
      });

      cookieStore.set(
        DISPLAY_COOKIE_NAME,
        serializeDisplayCookie(freshCookie),
        COOKIE_OPTIONS,
      );
    } catch {
      // Cookie write failure is non-fatal — the (app) layout
      // will refresh the cookie from DB on next load anyway.
    }

    return success(input);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update display settings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// USER: GET DISPLAY PREFERENCES
// ============================================================
// Reads from the user prefs cookie. No DB call needed.
// Returns null fields for any preference the user hasn't
// explicitly overridden (meaning "use school default").

export async function getUserDisplayPreferences(): Promise<
  ActionResponse<UserDisplayPreferences>
> {
  try {
    // Ensure user is authenticated (getTenantContext throws if not)
    await getTenantContext();

    const cookieStore = await cookies();
    const prefs = parseUserPrefsCookie(
      cookieStore.get(USER_PREFS_COOKIE_NAME)?.value,
    );

    return success(prefs);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to get display preferences";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// USER: UPDATE DISPLAY PREFERENCES
// ============================================================
// Writes BOTH cookies:
//   1. wattle-user-prefs — stores the overrides (with nulls)
//   2. wattle-display    — stores effective values for root layout
//
// WHY both: The root layout reads wattle-display for <html>
// data attributes. The user settings page reads wattle-user-prefs
// to know which fields are explicit overrides vs school defaults.

export async function updateUserDisplayPreferences(
  input: UserDisplayPreferences,
): Promise<ActionResponse<UserDisplayPreferences>> {
  try {
    // Ensure user is authenticated
    await getTenantContext();

    const cookieStore = await cookies();

    // ── 1. Write user prefs cookie (override tracking) ──────
    cookieStore.set(
      USER_PREFS_COOKIE_NAME,
      serializeUserPrefsCookie(input),
      COOKIE_OPTIONS,
    );

    // ── 2. Update main display cookie with effective values ─
    // Read the current display cookie to preserve tenant-level
    // settings (brand, accent, sidebar) while updating the
    // user-level fields (theme, density, fontScale).
    const currentDisplay = parseDisplayCookie(
      cookieStore.get(DISPLAY_COOKIE_NAME)?.value,
    );

    const updatedDisplay: typeof currentDisplay = {
      ...currentDisplay,
      theme: input.theme ?? currentDisplay.theme,
      density: input.density ?? currentDisplay.density,
      fontScale: input.fontScale ?? currentDisplay.fontScale,
    };

    cookieStore.set(
      DISPLAY_COOKIE_NAME,
      serializeDisplayCookie(updatedDisplay),
      COOKIE_OPTIONS,
    );

    return success(input);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update display preferences";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}