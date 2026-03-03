"use server";

// src/lib/actions/reports/periods.ts
//
// ============================================================
// WattleOS V2 - PLG Report Periods Server Actions
// ============================================================
// Manages the term-reporting lifecycle:
//   1. Admin creates a period (name, dates)
//   2. Admin activates it → instances generated for all enrolled students
//   3. Guides fill in instances → submit
//   4. Admin reviews, approves, closes period
//
// WHY periods: The previous system used a free-text "term" field
// on student_reports. Periods formalise this into a managed
// workflow with progress tracking, bulk actions, and PLG gating.
//
// Plan-tier gates enforced here (Server Action layer, not RLS).
// ============================================================

import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  type ActionResponse,
  type PaginatedResponse,
  success,
  failure,
  paginated,
  paginatedFailure,
  ErrorCodes,
} from "@/types/api";
import type {
  ReportPeriod,
  ReportPeriodStatus,
  ReportPeriodDashboardData,
  ReportInstanceStatus,
} from "@/types/domain";
import { logAudit } from "@/lib/utils/audit";
import { isFeatureEnabled, getUsageLimits } from "@/lib/plg/plan-gating";

// ============================================================
// Input Types
// ============================================================

export interface CreateReportPeriodInput {
  name: string;
  academic_year?: number | null;
  term?: string | null;
  opens_at?: string | null;
  due_at?: string | null;
  closes_at?: string | null;
}

export interface UpdateReportPeriodInput {
  name?: string;
  academic_year?: number | null;
  term?: string | null;
  opens_at?: string | null;
  due_at?: string | null;
  closes_at?: string | null;
}

export interface GenerateInstancesInput {
  period_id: string;
  template_id: string;
  /** Optional: restrict to specific class_id. If null, all active enrollments. */
  class_id?: string | null;
}

export interface ManualStudentRow {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  class_name?: string | null;
  guide_name?: string | null;
}

export interface AddManualStudentsInput {
  period_id: string;
  template_id: string;
  students: ManualStudentRow[];
}

// ============================================================
// LIST REPORT PERIODS
// ============================================================

export async function listReportPeriods(params?: {
  status?: ReportPeriodStatus;
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 20;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("report_periods")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (params?.status) {
      query = query.eq("status", params.status);
    }

    const { data, count, error } = await query;

    if (error) return paginatedFailure(error.message);

    return paginated(data ?? [], count ?? 0, page, perPage);
  } catch {
    return paginatedFailure("Failed to list report periods.");
  }
}

// ============================================================
// GET ACTIVE PERIOD
// ============================================================

export async function getActivePeriod(): Promise<
  ActionResponse<ReportPeriod | null>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_periods")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return failure(error.message);
    return success(data);
  } catch {
    return failure("Failed to get active period.");
  }
}

// ============================================================
// GET PERIOD BY ID
// ============================================================

export async function getReportPeriod(
  periodId: string,
): Promise<ActionResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_periods")
      .select("*")
      .eq("id", periodId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message);
    return success(data);
  } catch {
    return failure("Failed to get report period.");
  }
}

// ============================================================
// CREATE REPORT PERIOD
// ============================================================

export async function createReportPeriod(
  input: CreateReportPeriodInput,
): Promise<ActionResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);

    if (!input.name?.trim()) {
      return failure("Period name is required.", ErrorCodes.VALIDATION_ERROR);
    }

    // ── Free tier: check period history limit ───────────────
    const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
    if (!isFeatureEnabled("report_history_unlimited", planTier)) {
      const limits = getUsageLimits(planTier);
      const supabaseCheck = await createSupabaseServerClient();
      const { count } = await supabaseCheck
        .from("report_periods")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", context.tenant.id)
        .in("status", ["closed", "archived"])
        .is("deleted_at", null);

      if ((count ?? 0) >= limits.report_period_history) {
        return failure(
          "Free plan includes 1 report period history. Upgrade to Pro for unlimited report periods.",
          ErrorCodes.PLAN_LIMIT,
        );
      }
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_periods")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        academic_year: input.academic_year ?? null,
        term: input.term?.trim() || null,
        opens_at: input.opens_at || null,
        due_at: input.due_at || null,
        closes_at: input.closes_at || null,
        status: "draft",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_period.created",
      entityType: "report_period",
      entityId: data.id,
      metadata: { name: data.name, term: data.term },
    });

    return success(data);
  } catch {
    return failure("Failed to create report period.");
  }
}

// ============================================================
// UPDATE REPORT PERIOD
// ============================================================

export async function updateReportPeriod(
  periodId: string,
  input: UpdateReportPeriodInput,
): Promise<ActionResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_periods")
      .update({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.academic_year !== undefined && {
          academic_year: input.academic_year,
        }),
        ...(input.term !== undefined && { term: input.term?.trim() || null }),
        ...(input.opens_at !== undefined && { opens_at: input.opens_at }),
        ...(input.due_at !== undefined && { due_at: input.due_at }),
        ...(input.closes_at !== undefined && { closes_at: input.closes_at }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", periodId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_period.updated",
      entityType: "report_period",
      entityId: periodId,
      metadata: { changes: input },
    });

    return success(data);
  } catch {
    return failure("Failed to update report period.");
  }
}

// ============================================================
// ACTIVATE REPORT PERIOD
// ============================================================
// Transitions status to 'active'. Only one active period
// allowed per tenant at a time.

export async function activateReportPeriod(
  periodId: string,
): Promise<ActionResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    // Check no other period is active
    const { data: existing } = await supabase
      .from("report_periods")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (existing && existing.id !== periodId) {
      return failure(
        `"${existing.name}" is already active. Close it before activating a new period.`,
        ErrorCodes.CONFLICT,
      );
    }

    const { data, error } = await supabase
      .from("report_periods")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", periodId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "draft")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_period.activated",
      entityType: "report_period",
      entityId: periodId,
      metadata: { name: data.name },
    });

    return success(data);
  } catch {
    return failure("Failed to activate report period.");
  }
}

// ============================================================
// CLOSE REPORT PERIOD
// ============================================================

export async function closeReportPeriod(
  periodId: string,
): Promise<ActionResponse<ReportPeriod>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("report_periods")
      .update({
        status: "closed",
        closes_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", periodId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["active", "draft"])
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message);

    await logAudit({
      context,
      action: "report_period.closed",
      entityType: "report_period",
      entityId: periodId,
      metadata: { name: data.name },
    });

    return success(data);
  } catch {
    return failure("Failed to close report period.");
  }
}

// ============================================================
// GENERATE REPORT INSTANCES
// ============================================================
// Seeds report_instances from current active enrollments.
// Each enrolled student in the tenant (or a specific class)
// gets one instance per period/template combination.

export async function generateReportInstances(
  input: GenerateInstancesInput,
): Promise<ActionResponse<{ created: number; skipped: number }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();
    const admin = await createSupabaseAdminClient();

    const { period_id, template_id, class_id } = input;

    // Verify period belongs to tenant and is in a valid state
    const { data: period } = await supabase
      .from("report_periods")
      .select("id, status")
      .eq("id", period_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!period)
      return failure("Report period not found.", ErrorCodes.NOT_FOUND);
    if (period.status === "archived") {
      return failure(
        "Cannot generate instances for an archived period.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch enrolled students with their class and assigned guide
    let enrollmentQuery = supabase
      .from("enrollments")
      .select(
        `
        student_id,
        students!inner(id, first_name, last_name, preferred_name),
        class:classes(id, name, primary_guide_id, primary_guide:users(id, first_name, last_name))
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    if (class_id) {
      enrollmentQuery = enrollmentQuery.eq("class_id", class_id);
    }

    const { data: enrollments, error: enrollError } = await enrollmentQuery;
    if (enrollError) return failure(enrollError.message);

    if (!enrollments?.length) {
      return success({ created: 0, skipped: 0 });
    }

    // Build insert rows (skip already-existing instances)
    const rows = enrollments.map((e) => {
      const student = Array.isArray(e.students) ? e.students[0] : e.students;
      const cls = Array.isArray(e.class) ? e.class[0] : e.class;
      const guide = cls
        ? Array.isArray(cls.primary_guide)
          ? cls.primary_guide[0]
          : cls.primary_guide
        : null;

      return {
        tenant_id: context.tenant.id,
        template_id,
        report_period_id: period_id,
        student_id: e.student_id,
        student_first_name: student?.first_name ?? null,
        student_last_name: student?.last_name ?? null,
        student_preferred_name: student?.preferred_name ?? null,
        class_name: cls?.name ?? null,
        assigned_guide_id: cls?.primary_guide_id ?? null,
        assigned_guide_name: guide
          ? `${guide.first_name} ${guide.last_name}`.trim()
          : null,
      };
    });

    // Use ignoreDuplicates to skip already-generated instances
    const { data: inserted, error: insertError } = await admin
      .from("report_instances")
      .insert(rows)
      .select("id");

    if (insertError) return failure(insertError.message);

    const created = inserted?.length ?? 0;
    const skipped = rows.length - created;

    await logAudit({
      context,
      action: "report_period.instances_generated",
      entityType: "report_period",
      entityId: period_id,
      metadata: { template_id, created, skipped, class_id: class_id ?? null },
    });

    return success({ created, skipped });
  } catch {
    return failure("Failed to generate report instances.");
  }
}

// ============================================================
// ADD MANUAL STUDENTS TO PERIOD
// ============================================================
// For tenants without enrollment data (isolated Reports module).
// Creates report_instances directly from a provided list of
// student names - no dependency on the enrollments table.
// Skips rows that already have an instance for this period.

export async function addManualStudentsToPeriod(
  input: AddManualStudentsInput,
): Promise<ActionResponse<{ created: number; skipped: number }>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const admin = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    const { period_id, template_id, students } = input;

    if (!students.length) {
      return failure("No students provided.", ErrorCodes.VALIDATION_ERROR);
    }

    // Verify period belongs to tenant
    const { data: period } = await supabase
      .from("report_periods")
      .select("id, status")
      .eq("id", period_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!period)
      return failure("Report period not found.", ErrorCodes.NOT_FOUND);

    // For manual students we store name snapshots but no student_id FK.
    // Use a deterministic placeholder UUID so duplicate-checking still works:
    // skip if (period_id, student_first_name, student_last_name) already exists.
    const { data: existing } = await supabase
      .from("report_instances")
      .select("student_first_name, student_last_name")
      .eq("report_period_id", period_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    const existingSet = new Set(
      (existing ?? []).map(
        (e) => `${e.student_first_name}||${e.student_last_name}`,
      ),
    );

    const rows = students
      .filter(
        (s) =>
          !existingSet.has(`${s.first_name.trim()}||${s.last_name.trim()}`),
      )
      .map((s) => ({
        tenant_id: context.tenant.id,
        template_id,
        report_period_id: period_id,
        student_id: null,
        student_first_name: s.first_name.trim(),
        student_last_name: s.last_name.trim(),
        student_preferred_name: s.preferred_name?.trim() || null,
        class_name: s.class_name?.trim() || null,
        assigned_guide_name: s.guide_name?.trim() || null,
      }));

    const skipped = students.length - rows.length;

    if (!rows.length) {
      return success({ created: 0, skipped: students.length });
    }

    const { data: inserted, error: insertError } = await admin
      .from("report_instances")
      .insert(rows)
      .select("id");

    if (insertError) return failure(insertError.message);

    const created = inserted?.length ?? 0;

    await logAudit({
      context,
      action: "report_period.manual_students_added",
      entityType: "report_period",
      entityId: period_id,
      metadata: { template_id, created, skipped },
    });

    return success({ created, skipped });
  } catch {
    return failure("Failed to add students to period.");
  }
}

// ============================================================
// GET PERIOD DASHBOARD
// ============================================================

export async function getReportPeriodDashboard(
  periodId: string,
): Promise<ActionResponse<ReportPeriodDashboardData>> {
  try {
    const context = await getTenantContext();
    await requirePermission(Permissions.MANAGE_REPORT_PERIODS);
    const supabase = await createSupabaseServerClient();

    const { data: period, error: periodError } = await supabase
      .from("report_periods")
      .select("*")
      .eq("id", periodId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (periodError) return failure(periodError.message);

    const { data: instances, error: instancesError } = await supabase
      .from("report_instances")
      .select("id, status, assigned_guide_id, assigned_guide_name")
      .eq("report_period_id", periodId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (instancesError) return failure(instancesError.message);

    const allInstances = instances ?? [];
    const total = allInstances.length;

    // Aggregate by status
    const byStatus = allInstances.reduce(
      (acc, inst) => {
        acc[inst.status as ReportInstanceStatus] =
          (acc[inst.status as ReportInstanceStatus] ?? 0) + 1;
        return acc;
      },
      {} as Record<ReportInstanceStatus, number>,
    );

    const completionPercent =
      total > 0
        ? Math.round(
            (((byStatus.submitted ?? 0) +
              (byStatus.approved ?? 0) +
              (byStatus.published ?? 0)) /
              total) *
              100,
          )
        : 0;

    // Aggregate by guide
    const guideMap = new Map<
      string,
      { guide_name: string; total: number; submitted: number; approved: number }
    >();

    for (const inst of allInstances) {
      if (!inst.assigned_guide_id) continue;
      const existing = guideMap.get(inst.assigned_guide_id) ?? {
        guide_name: inst.assigned_guide_name ?? "Unknown",
        total: 0,
        submitted: 0,
        approved: 0,
      };
      existing.total += 1;
      if (
        ["submitted", "changes_requested", "approved", "published"].includes(
          inst.status,
        )
      ) {
        existing.submitted += 1;
      }
      if (["approved", "published"].includes(inst.status)) {
        existing.approved += 1;
      }
      guideMap.set(inst.assigned_guide_id, existing);
    }

    const guides = Array.from(guideMap.entries()).map(([guide_id, stats]) => ({
      guide_id,
      guide_name: stats.guide_name,
      total: stats.total,
      submitted: stats.submitted,
      approved: stats.approved,
    }));

    return success({
      period: period as ReportPeriod,
      total_instances: total,
      by_status: byStatus,
      completion_percent: completionPercent,
      guides,
    });
  } catch {
    return failure("Failed to load period dashboard.");
  }
}
