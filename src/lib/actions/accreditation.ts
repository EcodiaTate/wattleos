"use server";

// src/lib/actions/accreditation.ts
//
// ============================================================
// AMI / AMS / MSAA Accreditation Checklist - Server Actions
// ============================================================
// Supports the full self-assessment lifecycle:
//   1. Create / manage accreditation cycles (per body)
//   2. Seed assessment rows from criteria for the cycle
//   3. Upsert per-criterion ratings + narrative
//   4. Attach evidence (files, links, notes)
//   5. Dashboard - cycle progress by body
//   6. Domain breakdown - grouped criterion view per cycle
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  AccreditationBodyCode,
  AccreditationCycle,
  AccreditationCycleWithProgress,
  AccreditationCriterion,
  AccreditationAssessment,
  AccreditationAssessmentWithDetails,
  AccreditationEvidence,
  AccreditationDashboardData,
  AccreditationDomainProgress,
} from "@/types/domain";
import {
  CreateAccreditationCycleSchema,
  UpdateAccreditationCycleSchema,
  ListAccreditationCyclesSchema,
  UpsertAccreditationAssessmentSchema,
  CreateAccreditationEvidenceSchema,
  CreateCustomCriterionSchema,
} from "@/lib/validations/accreditation";
import type {
  CreateAccreditationCycleInput,
  UpdateAccreditationCycleInput,
  ListAccreditationCyclesInput,
  UpsertAccreditationAssessmentInput,
  CreateAccreditationEvidenceInput,
  CreateCustomCriterionInput,
} from "@/lib/validations/accreditation";

// ============================================================
// Dashboard
// ============================================================

export async function getAccreditationDashboard(): Promise<
  ActionResponse<AccreditationDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    const { data: cycles, error } = await supabase
      .from("accreditation_cycles")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, "DATABASE_ERROR");

    // For each cycle, count assessments by rating
    const cyclesWithProgress: AccreditationCycleWithProgress[] =
      await Promise.all(
        (cycles ?? []).map(async (cycle) => {
          const { data: assessments } = await supabase
            .from("accreditation_assessments")
            .select("rating")
            .eq("tenant_id", ctx.tenant.id)
            .eq("cycle_id", cycle.id);

          const rows = assessments ?? [];
          const total = rows.length;
          const not_started_count = rows.filter(
            (r) => r.rating === "not_started",
          ).length;
          const not_met_count = rows.filter(
            (r) => r.rating === "not_met",
          ).length;
          const partially_met_count = rows.filter(
            (r) => r.rating === "partially_met",
          ).length;
          const met_count = rows.filter((r) => r.rating === "met").length;
          const exceeds_count = rows.filter(
            (r) => r.rating === "exceeds",
          ).length;
          const overall_progress_pct =
            total > 0
              ? Math.round(((met_count + exceeds_count) / total) * 100)
              : 0;

          // Resolve lead staff name
          let lead_staff_name: string | null = null;
          if (cycle.lead_staff_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", cycle.lead_staff_id)
              .single();
            lead_staff_name =
              (profile as { full_name?: string } | null)?.full_name ?? null;
          }

          return {
            ...cycle,
            total_criteria: total,
            not_started_count,
            not_met_count,
            partially_met_count,
            met_count,
            exceeds_count,
            overall_progress_pct,
            lead_staff_name,
          } as AccreditationCycleWithProgress;
        }),
      );

    const BODIES: AccreditationBodyCode[] = ["ami", "ams", "msaa"];
    const active_cycle_by_body = Object.fromEntries(
      BODIES.map((body) => [
        body,
        cyclesWithProgress.find(
          (c) =>
            c.body_code === body &&
            ["self_study", "submitted", "under_review"].includes(c.status),
        ) ?? null,
      ]),
    ) as Record<AccreditationBodyCode, AccreditationCycleWithProgress | null>;

    return success({
      cycles: cyclesWithProgress,
      active_cycle_by_body,
      total_cycles: cyclesWithProgress.length,
      accredited_count: cyclesWithProgress.filter(
        (c) => c.status === "accredited",
      ).length,
    });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Cycle - List
// ============================================================

export async function listAccreditationCycles(
  filter: ListAccreditationCyclesInput = {},
): Promise<ActionResponse<AccreditationCycle[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACCREDITATION);
    const parsed = ListAccreditationCyclesSchema.safeParse(filter);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("accreditation_cycles")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (parsed.data.body_code)
      query = query.eq("body_code", parsed.data.body_code);
    if (parsed.data.status) query = query.eq("status", parsed.data.status);

    const { data, error } = await query;
    if (error) return failure(error.message, "DATABASE_ERROR");
    return success(data ?? []);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Cycle - Create
// ============================================================

export async function createAccreditationCycle(
  input: CreateAccreditationCycleInput,
): Promise<ActionResponse<AccreditationCycle>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const parsed = CreateAccreditationCycleSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("accreditation_cycles")
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenant.id,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_CYCLE_CREATED,
      entityType: "accreditation_cycle",
      entityId: data.id,
      metadata: { body_code: data.body_code, label: data.cycle_label },
    });

    // Auto-seed assessment rows from criteria for this body
    await seedAssessmentsForCycle(
      ctx.tenant.id,
      data.id,
      data.body_code as AccreditationBodyCode,
      supabase,
    );

    return success(data as AccreditationCycle);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Cycle - Update
// ============================================================

export async function updateAccreditationCycle(
  cycleId: string,
  input: UpdateAccreditationCycleInput,
): Promise<ActionResponse<AccreditationCycle>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const parsed = UpdateAccreditationCycleSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("accreditation_cycles")
      .update(parsed.data)
      .eq("id", cycleId)
      .eq("tenant_id", ctx.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_CYCLE_UPDATED,
      entityType: "accreditation_cycle",
      entityId: cycleId,
      metadata: { changes: Object.keys(parsed.data) },
    });

    return success(data as AccreditationCycle);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Cycle - Delete (soft)
// ============================================================

export async function deleteAccreditationCycle(
  cycleId: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("accreditation_cycles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", cycleId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_CYCLE_DELETED,
      entityType: "accreditation_cycle",
      entityId: cycleId,
    });

    return success(undefined);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Criteria - List (global seed + tenant custom)
// ============================================================

export async function listAccreditationCriteria(
  bodyCode?: AccreditationBodyCode,
): Promise<ActionResponse<AccreditationCriterion[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("accreditation_criteria")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenant.id}`)
      .eq("is_active", true)
      .order("domain_order")
      .order("criterion_code");

    if (bodyCode) query = query.eq("body_code", bodyCode);

    const { data, error } = await query;
    if (error) return failure(error.message, "DATABASE_ERROR");
    return success(data ?? []);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Custom criterion - Create
// ============================================================

export async function createCustomCriterion(
  input: CreateCustomCriterionInput,
): Promise<ActionResponse<AccreditationCriterion>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const parsed = CreateCustomCriterionSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("accreditation_criteria")
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenant.id,
        is_custom: true,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");
    return success(data as AccreditationCriterion);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Assessment - Upsert (rate a criterion)
// ============================================================

export async function upsertAccreditationAssessment(
  input: UpsertAccreditationAssessmentInput,
): Promise<ActionResponse<AccreditationAssessment>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const parsed = UpsertAccreditationAssessmentSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();

    // Verify cycle belongs to tenant
    const { data: cycle, error: cycleErr } = await supabase
      .from("accreditation_cycles")
      .select("id")
      .eq("id", parsed.data.cycle_id)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (cycleErr || !cycle) return failure("Cycle not found", "NOT_FOUND");

    const { data, error } = await supabase
      .from("accreditation_assessments")
      .upsert(
        {
          ...parsed.data,
          tenant_id: ctx.tenant.id,
          assessed_by: ctx.user.id,
          assessed_at: new Date().toISOString(),
        },
        { onConflict: "cycle_id,criterion_id" },
      )
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_ASSESSMENT_SAVED,
      entityType: "accreditation_assessment",
      entityId: data.id,
      metadata: { cycle_id: parsed.data.cycle_id, rating: parsed.data.rating },
    });

    return success(data as AccreditationAssessment);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Domain progress - grouped criterion view for a cycle
// ============================================================

export async function getAccreditationDomainProgress(
  cycleId: string,
): Promise<ActionResponse<AccreditationDomainProgress[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    // Verify cycle belongs to tenant + get body_code
    const { data: cycle, error: cycleErr } = await supabase
      .from("accreditation_cycles")
      .select("id, body_code")
      .eq("id", cycleId)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (cycleErr || !cycle) return failure("Cycle not found", "NOT_FOUND");

    // Fetch criteria for this body (global + tenant custom)
    const { data: criteria, error: critErr } = await supabase
      .from("accreditation_criteria")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenant.id}`)
      .eq("body_code", cycle.body_code)
      .eq("is_active", true)
      .order("domain_order")
      .order("criterion_code");

    if (critErr) return failure(critErr.message, "DATABASE_ERROR");

    // Fetch all assessments + evidence counts for this cycle
    const { data: assessments, error: assErr } = await supabase
      .from("accreditation_assessments")
      .select("*")
      .eq("cycle_id", cycleId)
      .eq("tenant_id", ctx.tenant.id);

    if (assErr) return failure(assErr.message, "DATABASE_ERROR");

    const { data: evidence, error: evErr } = await supabase
      .from("accreditation_evidence")
      .select("id, assessment_id")
      .in(
        "assessment_id",
        (assessments ?? []).map((a) => a.id),
      )
      .is("deleted_at", null);

    if (evErr) return failure(evErr.message, "DATABASE_ERROR");

    const assessmentMap = new Map<string, AccreditationAssessment>(
      (assessments ?? []).map((a) => [
        a.criterion_id,
        a as AccreditationAssessment,
      ]),
    );
    const evidenceCountMap = new Map<string, number>();
    for (const ev of evidence ?? []) {
      evidenceCountMap.set(
        ev.assessment_id,
        (evidenceCountMap.get(ev.assessment_id) ?? 0) + 1,
      );
    }

    // Group by domain
    const domainMap = new Map<string, AccreditationDomainProgress>();
    for (const crit of criteria ?? []) {
      const assessment = assessmentMap.get(crit.id) ?? null;
      const evidenceCount = assessment
        ? (evidenceCountMap.get(assessment.id) ?? 0)
        : 0;

      if (!domainMap.has(crit.domain_name)) {
        domainMap.set(crit.domain_name, {
          domain_name: crit.domain_name,
          domain_order: crit.domain_order,
          criteria: [],
          met_count: 0,
          total_count: 0,
        });
      }

      const domain = domainMap.get(crit.domain_name)!;
      domain.criteria.push({
        criterion: crit as AccreditationCriterion,
        assessment,
        evidence_count: evidenceCount,
      });
      domain.total_count++;
      if (
        assessment &&
        (assessment.rating === "met" || assessment.rating === "exceeds")
      ) {
        domain.met_count++;
      }
    }

    return success(
      Array.from(domainMap.values()).sort(
        (a, b) => a.domain_order - b.domain_order,
      ),
    );
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Assessment detail - single criterion with evidence
// ============================================================

export async function getAssessmentWithEvidence(
  assessmentId: string,
): Promise<ActionResponse<AccreditationAssessmentWithDetails>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    const { data: assessment, error } = await supabase
      .from("accreditation_assessments")
      .select("*")
      .eq("id", assessmentId)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (error || !assessment)
      return failure("Assessment not found", "NOT_FOUND");

    const [criterionResult, evidenceResult] = await Promise.all([
      supabase
        .from("accreditation_criteria")
        .select("*")
        .eq("id", assessment.criterion_id)
        .single(),
      supabase
        .from("accreditation_evidence")
        .select("*")
        .eq("assessment_id", assessmentId)
        .is("deleted_at", null)
        .order("created_at"),
    ]);

    if (criterionResult.error)
      return failure(criterionResult.error.message, "DATABASE_ERROR");

    return success({
      ...(assessment as AccreditationAssessment),
      criterion: criterionResult.data as AccreditationCriterion,
      evidence: (evidenceResult.data ?? []) as AccreditationEvidence[],
    });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Evidence - Create
// ============================================================

export async function createAccreditationEvidence(
  input: CreateAccreditationEvidenceInput,
): Promise<ActionResponse<AccreditationEvidence>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const parsed = CreateAccreditationEvidenceSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    // Verify assessment belongs to tenant
    const supabase = await createSupabaseServerClient();
    const { data: assessment, error: assErr } = await supabase
      .from("accreditation_assessments")
      .select("id")
      .eq("id", parsed.data.assessment_id)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (assErr || !assessment)
      return failure("Assessment not found", "NOT_FOUND");

    const { data, error } = await supabase
      .from("accreditation_evidence")
      .insert({
        ...parsed.data,
        tenant_id: ctx.tenant.id,
        uploaded_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_EVIDENCE_ADDED,
      entityType: "accreditation_evidence",
      entityId: data.id,
      metadata: {
        assessment_id: parsed.data.assessment_id,
        evidence_type: parsed.data.evidence_type,
      },
    });

    return success(data as AccreditationEvidence);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Evidence - Delete (soft)
// ============================================================

export async function deleteAccreditationEvidence(
  evidenceId: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_ACCREDITATION);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("accreditation_evidence")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", evidenceId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.ACCREDITATION_EVIDENCE_DELETED,
      entityType: "accreditation_evidence",
      entityId: evidenceId,
    });

    return success(undefined);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Internal helpers
// ============================================================

async function seedAssessmentsForCycle(
  tenantId: string,
  cycleId: string,
  bodyCode: AccreditationBodyCode,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<void> {
  const { data: criteria } = await supabase
    .from("accreditation_criteria")
    .select("id")
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .eq("body_code", bodyCode)
    .eq("is_active", true);

  if (!criteria || criteria.length === 0) return;

  const rows = criteria.map((c) => ({
    tenant_id: tenantId,
    cycle_id: cycleId,
    criterion_id: c.id,
    rating: "not_started" as const,
  }));

  await supabase
    .from("accreditation_assessments")
    .upsert(rows, {
      onConflict: "cycle_id,criterion_id",
      ignoreDuplicates: true,
    });
}
