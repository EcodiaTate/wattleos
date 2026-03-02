"use server";

// src/lib/actions/admissions/inquiry-config.ts
//
// ============================================================
// WattleOS V2 - Inquiry Form Configuration Actions
// ============================================================
// Reads and writes the per-tenant inquiry form config stored
// in tenants.settings.inquiry_config (JSONB).
//
// getInquiryConfig - public (no auth), used by /inquiry page
// updateInquiryConfig - admin only, requires MANAGE_TENANT_SETTINGS
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_INQUIRY_CONFIG, type InquiryConfig } from "@/types/domain";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ── Read (public) ────────────────────────────────────────────

export async function getInquiryConfig(
  tenantId: string,
): Promise<ActionResponse<InquiryConfig>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", tenantId)
      .single();

    if (error || !data) {
      return success(DEFAULT_INQUIRY_CONFIG);
    }

    const settings = (data.settings ?? {}) as Record<string, unknown>;
    const stored = settings.inquiry_config as
      | Partial<InquiryConfig>
      | undefined;

    if (!stored) return success(DEFAULT_INQUIRY_CONFIG);

    // Merge with defaults so missing keys don't break the UI
    const config: InquiryConfig = {
      welcome_message:
        stored.welcome_message ?? DEFAULT_INQUIRY_CONFIG.welcome_message,
      confirmation_message:
        stored.confirmation_message ??
        DEFAULT_INQUIRY_CONFIG.confirmation_message,
      field_toggles: {
        ...DEFAULT_INQUIRY_CONFIG.field_toggles,
        ...stored.field_toggles,
      },
      custom_fields:
        stored.custom_fields ?? DEFAULT_INQUIRY_CONFIG.custom_fields,
      referral_sources:
        stored.referral_sources && stored.referral_sources.length > 0
          ? stored.referral_sources
          : DEFAULT_INQUIRY_CONFIG.referral_sources,
    };

    return success(config);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load inquiry config";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── Write (admin) ────────────────────────────────────────────

export async function updateInquiryConfig(
  config: InquiryConfig,
): Promise<ActionResponse<InquiryConfig>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const supabase = await createSupabaseServerClient();

    // Read current settings to preserve other keys (brand hue, etc.)
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
          inquiry_config: config,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.tenant.id);

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(config);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save inquiry config";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
