"use server";

// src/lib/actions/admissions/tours-config.ts
//
// ============================================================
// WattleOS V2 - Tours Page Configuration Actions
// ============================================================
// Reads and writes the per-tenant tours page config stored
// in tenants.settings.tours_config (JSONB).
//
// getToursConfig - public (no auth), used by /tours page
// updateToursConfig - admin only, requires MANAGE_TOURS
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_TOURS_CONFIG, type ToursConfig } from "@/types/domain";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ── Read (public) ────────────────────────────────────────────

export async function getToursConfig(
  tenantId: string,
): Promise<ActionResponse<ToursConfig>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    if (error || !data) return success(DEFAULT_TOURS_CONFIG);

    const settings = (data.settings ?? {}) as Record<string, unknown>;
    const stored = settings.tours_config as Partial<ToursConfig> | undefined;

    if (!stored) return success(DEFAULT_TOURS_CONFIG);

    const config: ToursConfig = {
      welcome_message:
        stored.welcome_message ?? DEFAULT_TOURS_CONFIG.welcome_message,
      custom_questions:
        stored.custom_questions ?? DEFAULT_TOURS_CONFIG.custom_questions,
    };

    return success(config);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load tours config";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── Write (admin) ────────────────────────────────────────────

export async function updateToursConfig(
  config: ToursConfig,
): Promise<ActionResponse<ToursConfig>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    const { data: current } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", context.tenant.id)
      .single();

    const existing = (current?.settings ?? {}) as Record<string, unknown>;

    const { error } = await supabase
      .from("tenants")
      .update({
        settings: {
          ...existing,
          tours_config: config,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    return success(config);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save tours config";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
