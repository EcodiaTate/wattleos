// src/app/api/cron/tenant-offboarding/route.ts
//
// ============================================================
// WattleOS V2 - Tenant Offboarding Cron (Prompt 46)
// ============================================================
// Vercel Cron Job — runs daily at 03:00 AEST (17:00 UTC prev day)
//
// Processes all tenants currently in an offboarding phase and
// advances them to the next phase when their window expires.
//
// Timeline from terminated_at:
//   Day 0–30:   grace_period  (full access, can cancel)
//   Day 30–60:  read_only     (data visible, mutations blocked)
//   Day 60–90:  export_window (generate data export archive)
//   Day 90–120: pending_purge (queued for deletion)
//   Day 120+:   purged        (all data deleted, tenant disabled)
//
// Each phase sends an email notification to the tenant Owner.
// Purge performs cascading deletion of all tenant data.
//
// Secured by CRON_SECRET env var.
// vercel.json schedule: "0 17 * * *" (UTC = 03:00 AEST)
// ============================================================

import {
  advanceTenantOffboardPhase,
  generateTenantDataExport,
  type OffboardPhase,
} from "@/lib/actions/tenant-offboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logAuditSystem } from "@/lib/utils/audit";
import { AuditActions } from "@/lib/utils/audit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phase thresholds in days from terminated_at
const PHASE_THRESHOLDS: Record<string, { minDays: number; nextPhase: OffboardPhase }> = {
  grace_period: { minDays: 30, nextPhase: "read_only" },
  read_only: { minDays: 60, nextPhase: "export_window" },
  export_window: { minDays: 90, nextPhase: "pending_purge" },
  pending_purge: { minDays: 120, nextPhase: "purged" },
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/tenant-offboarding] CRON_SECRET is not set.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();

  // Fetch all tenants currently in an offboarding phase
  const { data: offboardingTenants, error: fetchError } = await admin
    .from("tenants")
    .select("id, name, offboard_phase, terminated_at, data_export_path")
    .not("offboard_phase", "eq", "active")
    .not("offboard_phase", "eq", "purged");

  if (fetchError) {
    console.error("[cron/tenant-offboarding] Fetch error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const tenants = offboardingTenants ?? [];

  const results = {
    processed: 0,
    advanced: 0,
    exports_generated: 0,
    purges_completed: 0,
    errors: 0,
    detail: [] as Array<{ tenantId: string; from: string; to: string; ok: boolean }>,
  };

  for (const tenant of tenants) {
    if (!tenant.terminated_at) continue;

    const terminatedAt = new Date(tenant.terminated_at);
    const daysSince = Math.floor(
      (now.getTime() - terminatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const currentPhase = tenant.offboard_phase as OffboardPhase;
    const threshold = PHASE_THRESHOLDS[currentPhase];

    if (!threshold) continue;
    if (daysSince < threshold.minDays) continue;

    results.processed++;

    // Special handling for export_window: generate export first
    if (currentPhase === "export_window" && !tenant.data_export_path) {
      console.log(`[cron/tenant-offboarding] Generating data export for tenant ${tenant.id}`);
      const exportResult = await generateTenantDataExport(tenant.id);
      if (!exportResult.ok) {
        console.error(
          `[cron/tenant-offboarding] Export failed for tenant ${tenant.id}:`,
          exportResult.error,
        );
        results.errors++;
        continue;
      }
      results.exports_generated++;
      console.log(
        `[cron/tenant-offboarding] Export generated at: ${exportResult.storagePath}`,
      );
    }

    // Special handling for purge: delete all tenant data
    if (threshold.nextPhase === "purged") {
      console.log(`[cron/tenant-offboarding] Purging tenant ${tenant.id} (${tenant.name})`);
      const purgeResult = await purgeTenantData(tenant.id);
      if (!purgeResult.ok) {
        console.error(
          `[cron/tenant-offboarding] Purge failed for tenant ${tenant.id}:`,
          purgeResult.error,
        );
        results.errors++;
        results.detail.push({
          tenantId: tenant.id,
          from: currentPhase,
          to: "purged",
          ok: false,
        });
        continue;
      }
      results.purges_completed++;
    }

    // Advance phase
    const advanceResult = await advanceTenantOffboardPhase(tenant.id, threshold.nextPhase);

    results.detail.push({
      tenantId: tenant.id,
      from: currentPhase,
      to: threshold.nextPhase,
      ok: advanceResult.ok,
    });

    if (advanceResult.ok) {
      results.advanced++;
      console.log(
        `[cron/tenant-offboarding] Tenant ${tenant.id} advanced: ${currentPhase} → ${threshold.nextPhase}`,
      );
    } else {
      results.errors++;
      console.error(
        `[cron/tenant-offboarding] Advance failed for tenant ${tenant.id}:`,
        advanceResult.error,
      );
    }
  }

  console.log(
    `[cron/tenant-offboarding] Done. Processed: ${results.processed}, Advanced: ${results.advanced}, ` +
      `Exports: ${results.exports_generated}, Purges: ${results.purges_completed}, Errors: ${results.errors}`,
  );

  return NextResponse.json(results);
}

// ============================================================
// Purge: Cascade-delete all tenant data
// ============================================================
// Order matters: child rows must be deleted before parents.
// Tables with FK constraints to tenants are deleted first.
// The final step deletes the tenant record itself.
// ============================================================

const PURGE_ORDER = [
  // Most granular child tables first
  "medication_administrations",
  "medication_authorisations",
  "daily_care_logs",
  "medical_conditions",
  "custody_restrictions",
  "emergency_contacts",
  "individual_learning_plans",
  "observations",
  "incidents",
  "attendance_records",
  "class_enrollments",
  "program_bookings",
  "enrollments",
  "student_guardians",
  "guardians",
  "students",
  "classes",
  "programs",
  "staff_members",
  "fee_notices",
  "fee_notice_deliveries",
  "audit_logs",
  "tenant_members",
  // Tenant row last
  "tenants",
] as const;

async function purgeTenantData(
  tenantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();

  for (const table of PURGE_ORDER) {
    const query =
      table === "tenants"
        ? admin.from(table as "tenants").delete().eq("id", tenantId)
        : admin.from(table as "students").delete().eq("tenant_id", tenantId);

    const { error } = await query;

    if (error) {
      // Log but continue — partial purge is better than no purge
      console.error(
        `[purge] Error deleting from ${table} for tenant ${tenantId}:`,
        error.message,
      );
    }
  }

  // Log system-level purge confirmation
  await logAuditSystem({
    tenantId,
    action: AuditActions.TENANT_PURGED,
    entityType: "tenant",
    entityId: tenantId,
    metadata: {
        _sensitivity: "critical",
      purged_at: new Date().toISOString(),
      tables_processed: PURGE_ORDER.length,
    },
  });

  return { ok: true };
}
