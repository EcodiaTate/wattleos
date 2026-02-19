// src/lib/actions/display-settings.ts
//
// ============================================================
// WattleOS V2 — Display Settings Server Actions
// ============================================================
// Manages both admin-level (tenant) and user-level display
// preferences, plus the cookie that the root layout reads.
//
// WHY cookie sync: The root layout.tsx renders for both
// authenticated and unauthenticated pages. It can't call
// getTenantContext(). A cookie lets it apply the correct
// data attributes without a DB call on every page load.
//
// WHY two levels: Admin sets the school defaults (brand color,
// default density). Users override for personal preference
// (dark mode, compact layout). The resolve function merges
// them with user > tenant > platform default precedence.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import {
  DISPLAY_COOKIE_MAX_AGE,
  DISPLAY_COOKIE_NAME,
  type ResolvedDisplayConfig,
  type TenantDisplaySettings,
  type UserDisplayPreferences,
  parseTenantDisplaySettings,
  parseUserDisplayPreferences,
  resolveDisplayConfig,
  serializeDisplayCookie,
} from "@/types/display";
import { cookies } from "next/headers";

// ============================================================
// READ: Get resolved display config (tenant + user merged)
// ============================================================
// Called by the (app) layout to get the full resolved config.
// Also syncs the cookie so root layout stays current.
// ============================================================

export async function getResolvedDisplayConfig(): Promise<
  ActionResponse<ResolvedDisplayConfig>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // 1. Parse tenant display settings from tenants.settings.display
    const tenantDisplay = parseTenantDisplaySettings(
      (context.tenant.settings as Record<string, unknown>)?.display,
    );

    // 2. Fetch user display preferences from tenant_users.display_preferences
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("display_preferences")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .single();

    const userDisplay = parseUserDisplayPreferences(
      membership?.display_preferences,
    );

    // 3. Resolve
    const resolved = resolveDisplayConfig(tenantDisplay, userDisplay);

    // 4. Sync cookie so root layout stays current
    await syncDisplayCookie(resolved);

    return success(resolved);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load display settings";
    return failure(message, "DISPLAY_LOAD_ERROR");
  }
}

// ============================================================
// READ: Get tenant display settings (admin view)
// ============================================================

export async function getTenantDisplaySettings(): Promise<
  ActionResponse<TenantDisplaySettings>
> {
  try {
    const context = await getTenantContext();

    const tenantDisplay = parseTenantDisplaySettings(
      (context.tenant.settings as Record<string, unknown>)?.display,
    );

    return success(tenantDisplay);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load tenant display settings";
    return failure(message, "DISPLAY_LOAD_ERROR");
  }
}

// ============================================================
// WRITE: Update tenant display settings (admin only)
// ============================================================
// Permission: manage_tenant_settings
// Merges into tenants.settings.display without clobbering
// other settings (feature flags, etc.).
// ============================================================

export async function updateTenantDisplaySettings(
  input: Partial<TenantDisplaySettings>,
): Promise<ActionResponse<TenantDisplaySettings>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const supabase = await createSupabaseServerClient();

    // Read current settings to merge (preserve non-display keys)
    const currentSettings = (context.tenant.settings ?? {}) as Record<
      string,
      unknown
    >;
    const currentDisplay = parseTenantDisplaySettings(currentSettings.display);

    // Merge input with current display settings
    const updatedDisplay: TenantDisplaySettings = {
      brandHue:
        input.brandHue !== undefined ? input.brandHue : currentDisplay.brandHue,
      brandSaturation:
        input.brandSaturation !== undefined
          ? input.brandSaturation
          : currentDisplay.brandSaturation,
      defaultDensity: input.defaultDensity ?? currentDisplay.defaultDensity,
      defaultTheme: input.defaultTheme ?? currentDisplay.defaultTheme,
      faviconUrl:
        input.faviconUrl !== undefined
          ? input.faviconUrl
          : currentDisplay.faviconUrl,
    };

    // Write back to tenants.settings, preserving other keys
    const updatedSettings = {
      ...currentSettings,
      display: updatedDisplay,
    };

    const { error } = await supabase
      .from("tenants")
      .update({ settings: updatedSettings })
      .eq("id", context.tenant.id);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Re-resolve and sync cookie (admin may also be a user)
    await refreshDisplayCookie(context.tenant.id, context.user.id);

    return success(updatedDisplay);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update display settings";
    return failure(message, "DISPLAY_UPDATE_ERROR");
  }
}

// ============================================================
// READ: Get user display preferences
// ============================================================

export async function getUserDisplayPreferences(): Promise<
  ActionResponse<UserDisplayPreferences>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data: membership } = await supabase
      .from("tenant_users")
      .select("display_preferences")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .single();

    const prefs = parseUserDisplayPreferences(membership?.display_preferences);

    return success(prefs);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load user preferences";
    return failure(message, "DISPLAY_LOAD_ERROR");
  }
}

// ============================================================
// WRITE: Update user display preferences
// ============================================================
// Any authenticated user can update their own preferences.
// No special permission needed.
// ============================================================

export async function updateUserDisplayPreferences(
  input: Partial<UserDisplayPreferences>,
): Promise<ActionResponse<UserDisplayPreferences>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Read current preferences to merge
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("display_preferences")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null)
      .single();

    const current = parseUserDisplayPreferences(
      membership?.display_preferences,
    );

    const updated: UserDisplayPreferences = {
      theme: input.theme !== undefined ? input.theme : current.theme,
      density: input.density !== undefined ? input.density : current.density,
      fontScale:
        input.fontScale !== undefined ? input.fontScale : current.fontScale,
      sidebarCollapsed:
        input.sidebarCollapsed !== undefined
          ? input.sidebarCollapsed
          : current.sidebarCollapsed,
    };

    const { error } = await supabase
      .from("tenant_users")
      .update({ display_preferences: updated })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Refresh the cookie with the new resolved config
    await refreshDisplayCookie(context.tenant.id, context.user.id);

    return success(updated);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update display preferences";
    return failure(message, "DISPLAY_UPDATE_ERROR");
  }
}

// ============================================================
// Internal: Cookie sync helpers
// ============================================================

async function syncDisplayCookie(
  resolved: ResolvedDisplayConfig,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(DISPLAY_COOKIE_NAME, serializeDisplayCookie(resolved), {
      httpOnly: false, // Readable by client JS for system theme detection
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: DISPLAY_COOKIE_MAX_AGE,
      path: "/",
    });
  } catch {
    // Cookie setting can fail in some contexts (e.g., during static generation).
    // Non-critical — the layout will just use defaults.
  }
}

async function refreshDisplayCookie(
  tenantId: string,
  userId: string,
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    // Fetch fresh tenant settings
    const { data: tenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    const tenantDisplay = parseTenantDisplaySettings(
      (tenant?.settings as Record<string, unknown>)?.display,
    );

    // Fetch fresh user preferences
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("display_preferences")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    const userDisplay = parseUserDisplayPreferences(
      membership?.display_preferences,
    );

    const resolved = resolveDisplayConfig(tenantDisplay, userDisplay);
    await syncDisplayCookie(resolved);
  } catch {
    // Non-critical
  }
}
