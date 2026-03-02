"use server";

// src/lib/actions/reports/report-settings.ts
//
// ============================================================
// WattleOS Report Builder - Report Settings Actions
// ============================================================
// Per-tenant PDF branding: school name override, accent colour,
// paper size, font choice. Stored in report_settings table
// (one row per tenant, upserted on save).
// ============================================================

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { type ActionResponse, success, failure, ErrorCodes } from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface ReportSettings {
  id: string;
  tenant_id: string;
  school_name: string | null;
  logo_storage_path: string | null;
  accent_colour: string;
  paper_size: "A4" | "Letter";
  font_choice: "serif" | "sans" | "rounded";
  created_at: string;
  updated_at: string;
}

export interface UpdateReportSettingsInput {
  school_name?: string | null;
  accent_colour?: string;
  paper_size?: "A4" | "Letter";
  font_choice?: "serif" | "sans" | "rounded";
}

// ============================================================
// GET SETTINGS
// ============================================================

export async function getReportSettings(): Promise<
  ActionResponse<ReportSettings | null>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_settings")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .maybeSingle();

    if (error) return failure(error.message);
    return success(data as ReportSettings | null);
  } catch {
    return failure("Failed to load report settings.");
  }
}

// ============================================================
// UPSERT SETTINGS
// ============================================================

export async function updateReportSettings(
  input: UpdateReportSettingsInput,
): Promise<ActionResponse<ReportSettings>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORTS);
    const admin = await createSupabaseAdminClient();

    // Validate accent colour is a valid hex
    if (input.accent_colour) {
      const hex = input.accent_colour.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) {
        return failure(
          "Accent colour must be a valid hex colour (e.g. #22c55e).",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
    }

    const { data, error } = await admin
      .from("report_settings")
      .upsert(
        {
          tenant_id: context.tenant.id,
          school_name: input.school_name ?? null,
          accent_colour: input.accent_colour ?? "#22c55e",
          paper_size: input.paper_size ?? "A4",
          font_choice: input.font_choice ?? "sans",
        },
        { onConflict: "tenant_id", ignoreDuplicates: false },
      )
      .select()
      .single();

    if (error) return failure(error.message);
    return success(data as ReportSettings);
  } catch {
    return failure("Failed to save report settings.");
  }
}
