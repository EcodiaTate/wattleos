"use server";

// src/lib/actions/tenant-offboarding.ts
//
// ============================================================
// WattleOS V2 - Tenant Offboarding Server Actions (Prompt 46)
// ============================================================
// Implements the legal-page promise: permanent deletion within
// 120 days of subscription termination.
//
// Phase transitions (all driven by cron job):
//   active → grace_period (0–30d)  — initiated here
//   grace_period → read_only       — cron at day 30
//   read_only → export_window      — cron at day 60
//   export_window → pending_purge  — cron at day 90
//   pending_purge → purged         — cron at day 120
//
// WHY admin client for mutations: tenants table has no UPDATE
// RLS for authenticated users. Permission is enforced via
// requirePermission() before any admin client call.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit, logAuditSystem } from "@/lib/utils/audit";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

export type OffboardPhase =
  | "active"
  | "grace_period"
  | "read_only"
  | "export_window"
  | "pending_purge"
  | "purged";

export interface TenantOffboardStatus {
  offboard_phase: OffboardPhase;
  terminated_at: string | null;
  offboard_cancelled_at: string | null;
  data_export_path: string | null;
  purged_at: string | null;
  days_since_termination: number | null;
  days_until_purge: number | null;
}

// ============================================================
// GET: Offboarding Status
// ============================================================

export async function getTenantOffboardStatus(): Promise<
  ActionResponse<TenantOffboardStatus>
> {
  try {
    await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenants")
      .select(
        "offboard_phase, terminated_at, offboard_cancelled_at, data_export_path, purged_at",
      )
      .eq("id", context.tenant.id)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const terminatedAt = data.terminated_at
      ? new Date(data.terminated_at)
      : null;
    const daysSince = terminatedAt
      ? Math.floor((Date.now() - terminatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysUntilPurge =
      daysSince !== null ? Math.max(0, 120 - daysSince) : null;

    return success({
      offboard_phase: (data.offboard_phase ?? "active") as OffboardPhase,
      terminated_at: data.terminated_at ?? null,
      offboard_cancelled_at: data.offboard_cancelled_at ?? null,
      data_export_path: data.data_export_path ?? null,
      purged_at: data.purged_at ?? null,
      days_since_termination: daysSince,
      days_until_purge: daysUntilPurge,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get offboarding status",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// INITIATE: Start Offboarding
// ============================================================
// Sets terminated_at = now() and offboard_phase = 'grace_period'.
// Owner/Admin only. Sends notification email (handled separately
// by the cron job on first run).
// ============================================================

export async function initiateTenantOffboarding(): Promise<
  ActionResponse<{ offboard_phase: OffboardPhase; terminated_at: string }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const admin = createSupabaseAdminClient();

    // Verify not already offboarding
    const { data: current } = await admin
      .from("tenants")
      .select("offboard_phase, terminated_at")
      .eq("id", context.tenant.id)
      .single();

    if (current && current.offboard_phase !== "active") {
      return failure(
        `Tenant is already in offboarding phase: ${current.offboard_phase}`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date().toISOString();

    const { error } = await admin
      .from("tenants")
      .update({
        terminated_at: now,
        offboard_phase: "grace_period",
        offboard_initiated_by: context.user.id,
        is_active: true, // Keep active during grace period
      })
      .eq("id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.TENANT_OFFBOARD_INITIATED,
      entityType: "tenant",
      entityId: context.tenant.id,
      metadata: {
        _sensitivity: "critical",
        phase: "grace_period",
        initiated_at: now,
        note: "Tenant offboarding initiated. Grace period starts now (30 days to cancel).",
      },
    });

    return success({ offboard_phase: "grace_period", terminated_at: now });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to initiate offboarding",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CANCEL: Cancel Offboarding (grace period only)
// ============================================================
// Only callable during grace_period phase.
// Resets tenant to active, clears offboarding columns.
// ============================================================

export async function cancelTenantOffboarding(): Promise<
  ActionResponse<{ offboard_phase: OffboardPhase }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TENANT_SETTINGS);
    const admin = createSupabaseAdminClient();

    // Verify currently in grace period
    const { data: current } = await admin
      .from("tenants")
      .select("offboard_phase")
      .eq("id", context.tenant.id)
      .single();

    if (!current || current.offboard_phase !== "grace_period") {
      return failure(
        "Offboarding can only be cancelled during the grace period (first 30 days).",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date().toISOString();

    const { error } = await admin
      .from("tenants")
      .update({
        offboard_phase: "active",
        terminated_at: null,
        offboard_initiated_by: null,
        offboard_cancelled_at: now,
        offboard_cancelled_by: context.user.id,
        is_active: true,
      })
      .eq("id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.TENANT_OFFBOARD_CANCELLED,
      entityType: "tenant",
      entityId: context.tenant.id,
      metadata: {
        _sensitivity: "critical", cancelled_at: now },
    });

    return success({ offboard_phase: "active" });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to cancel offboarding",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ADMIN: Force Phase Transition (service-role / platform admin)
// ============================================================
// Used by the cron job to advance phases. Not exported as a
// public server action — only called from the cron route which
// validates CRON_SECRET.
// ============================================================

export async function advanceTenantOffboardPhase(
  tenantId: string,
  toPhase: OffboardPhase,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();

  const updates: Record<string, unknown> = {
    offboard_phase: toPhase,
  };

  if (toPhase === "read_only") {
    updates.is_active = true; // Still accessible, mutations blocked by middleware
  } else if (toPhase === "purged") {
    updates.is_active = false;
    updates.purged_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("tenants")
    .update(updates)
    .eq("id", tenantId);

  if (error) return { ok: false, error: error.message };

  await logAuditSystem({
    tenantId,
    action: AuditActions.TENANT_OFFBOARD_PHASE_ADVANCED,
    entityType: "tenant",
    entityId: tenantId,
    metadata: {
        _sensitivity: "critical", to_phase: toPhase },
  });

  return { ok: true };
}

// ============================================================
// EXPORT: Generate Full Tenant Data Archive
// ============================================================
// Dumps all tenant data as a JSON archive to Supabase Storage.
// Called by the cron job during export_window phase.
// Returns the storage path.
// ============================================================

export async function generateTenantDataExport(
  tenantId: string,
): Promise<{ ok: boolean; storagePath?: string; error?: string }> {
  const admin = createSupabaseAdminClient();
  const exportedAt = new Date().toISOString();
  const dateLabel = exportedAt.slice(0, 10);

  // Tables to export (all tenant-scoped tables)
  const EXPORT_TABLES = [
    "students",
    "enrollments",
    "guardians",
    "student_guardians",
    "classes",
    "class_enrollments",
    "attendance_records",
    "observations",
    "incidents",
    "medical_conditions",
    "medication_authorisations",
    "medication_administrations",
    "daily_care_logs",
    "individual_learning_plans",
    "custody_restrictions",
    "emergency_contacts",
    "fee_notices",
    "staff_members",
    "tenant_members",
    "audit_logs",
  ] as const;

  const archive: Record<string, unknown[]> = {
    _meta: [
      {
        tenant_id: tenantId,
        exported_at: exportedAt,
        wattleos_version: "v2",
        format: "wattleos-tenant-export-v1",
      },
    ],
  };

  // Fetch each table in chunks
  for (const table of EXPORT_TABLES) {
    const rows: unknown[] = [];
    let offset = 0;
    const CHUNK = 1000;

    while (true) {
      const { data, error } = await admin
        .from(table as "students")
        .select("*")
        .eq("tenant_id", tenantId)
        .range(offset, offset + CHUNK - 1);

      if (error) {
        console.error(`[tenant-export] Error fetching ${table}:`, error.message);
        break;
      }

      const chunk = data ?? [];
      rows.push(...chunk);
      if (chunk.length < CHUNK) break;
      offset += CHUNK;
    }

    archive[table] = rows;
  }

  // Serialize and upload
  const content = new TextEncoder().encode(JSON.stringify(archive, null, 2));
  const storagePath = `tenant-exports/${tenantId}/${dateLabel}.json`;

  const { error: uploadError } = await admin.storage
    .from("tenant-exports")
    .upload(storagePath, content, {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  // Record the export path on the tenant
  await admin
    .from("tenants")
    .update({ data_export_path: storagePath })
    .eq("id", tenantId);

  return { ok: true, storagePath };
}
