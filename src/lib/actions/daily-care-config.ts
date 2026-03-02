"use server";

// src/lib/actions/daily-care-config.ts
//
// ============================================================
// WattleOS V2 - Daily Care Log Field Configuration (Module O)
// ============================================================
// Per-room configuration of which care entry types are shown,
// whether they are required, and in what order. Admins can
// relabel fields and add helper text.
//
// Permissions:
//   MANAGE_DAILY_CARE_LOGS - read + write configs
//   (any staff with VIEW_DAILY_CARE_LOGS can read for display)
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  updateDailyCareConfigSchema,
  type UpdateDailyCareConfigRawInput,
} from "@/lib/validations/daily-care-config";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { DailyCareLogFieldConfig, CareEntryType } from "@/types/domain";

// ── Column select ────────────────────────────────────────────
const FIELD_CONFIG_COLUMNS =
  "id, tenant_id, class_id, field_type, is_enabled, is_required, " +
  "display_order, field_label, field_description, color_tag, " +
  "created_at, updated_at, deleted_at";

// ── Default order when no config exists yet ──────────────────
const DEFAULT_FIELD_ORDER: Array<{
  field_type: CareEntryType;
  display_order: number;
  color_tag: DailyCareLogFieldConfig["color_tag"];
}> = [
  { field_type: "nappy_change", display_order: 1, color_tag: "hygiene" },
  { field_type: "sleep_start", display_order: 2, color_tag: "sleep" },
  { field_type: "sleep_end", display_order: 3, color_tag: "sleep" },
  { field_type: "meal", display_order: 4, color_tag: "nutrition" },
  { field_type: "bottle", display_order: 5, color_tag: "nutrition" },
  { field_type: "sunscreen", display_order: 6, color_tag: "health" },
  { field_type: "wellbeing_note", display_order: 7, color_tag: "general" },
];

// ============================================================
// 1. GET DAILY CARE LOG CONFIG
// ============================================================
// Returns the field config for a given class. If no rows exist
// yet (e.g. the class was created before this migration),
// default rows are upserted and returned.
// ============================================================

export async function getDailyCareLogConfig(
  classId: string,
): Promise<ActionResponse<DailyCareLogFieldConfig[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("daily_care_log_field_configs")
      .select(FIELD_CONFIG_COLUMNS)
      .eq("tenant_id", context.tenant.id)
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // If no rows exist, seed defaults for this class
    if (!data || data.length === 0) {
      const defaults = DEFAULT_FIELD_ORDER.map((d) => ({
        tenant_id: context.tenant.id,
        class_id: classId,
        field_type: d.field_type,
        is_enabled: true,
        is_required: false,
        display_order: d.display_order,
        color_tag: d.color_tag,
      }));

      const { data: seeded, error: seedError } = await supabase
        .from("daily_care_log_field_configs")
        .upsert(defaults, { onConflict: "tenant_id,class_id,field_type" })
        .select(FIELD_CONFIG_COLUMNS)
        .order("display_order", { ascending: true });

      if (seedError) {
        return failure(seedError.message, ErrorCodes.DATABASE_ERROR);
      }

      return success((seeded ?? []) as unknown as DailyCareLogFieldConfig[]);
    }

    return success(data as unknown as DailyCareLogFieldConfig[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load field configuration",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 2. UPDATE DAILY CARE LOG CONFIG
// ============================================================
// Replaces the full field config for a class in one batch.
// Uses upsert so rows seeded by the migration are updated,
// not duplicated.
// ============================================================

export async function updateDailyCareLogConfig(
  input: UpdateDailyCareConfigRawInput,
): Promise<ActionResponse<DailyCareLogFieldConfig[]>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateDailyCareConfigSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { class_id, configs } = parsed.data;

    // Verify the class belongs to this tenant
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (classError || !classRow) {
      return failure("Class not found", ErrorCodes.CLASS_NOT_FOUND);
    }

    const rows = configs.map((c) => ({
      tenant_id: context.tenant.id,
      class_id,
      field_type: c.field_type,
      is_enabled: c.is_enabled,
      is_required: c.is_required,
      display_order: c.display_order,
      field_label: c.field_label,
      field_description: c.field_description,
      color_tag: c.color_tag,
    }));

    const { data, error } = await supabase
      .from("daily_care_log_field_configs")
      .upsert(rows, { onConflict: "tenant_id,class_id,field_type" })
      .select(FIELD_CONFIG_COLUMNS)
      .order("display_order", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_FIELD_CONFIG_UPDATED,
      entityType: "daily_care_log_field_config",
      entityId: class_id,
      metadata: {
        class_id,
        field_count: configs.length,
        enabled_count: configs.filter((c) => c.is_enabled).length,
      },
    });

    return success(data as unknown as DailyCareLogFieldConfig[]);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to update field configuration",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
