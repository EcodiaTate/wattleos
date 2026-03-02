"use server";

// src/lib/actions/mqap.ts
//
// ============================================================
// WattleOS V2 - Module K: MQ:AP Self-Assessment (Montessori
// Quality: Authentic Practice)
// ============================================================
// Voluntary accreditation framework by Montessori Australia,
// aligned to NQS QAs with Montessori-specific criteria.
//
// Permissions:
//   VIEW_MQAP   - read assessments, goals, criteria
//   MANAGE_MQAP - write/update assessments and goals
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  MqapAssessment,
  MqapCriterion,
  MqapCriterionWithAssessment,
  MqapGoal,
  MqapGoalStatus,
  MqapRating,
  QipElementAssessment,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  upsertMqapAssessmentSchema,
  type UpsertMqapAssessmentInput,
  createMqapGoalSchema,
  type CreateMqapGoalInput,
  updateMqapGoalSchema,
  type UpdateMqapGoalInput,
} from "@/lib/validations/mqap";
import { MQAP_QUALITY_AREAS } from "@/lib/constants/mqap-criteria";

// ============================================================
// CRITERIA
// ============================================================

export async function getAllCriteria(): Promise<
  ActionResponse<MqapCriterion[]>
> {
  try {
    await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("mqap_criteria")
      .select("*")
      .eq("is_active", true)
      .order("quality_area")
      .order("sequence_order");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as MqapCriterion[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ASSESSMENTS
// ============================================================

export async function getAllAssessments(): Promise<
  ActionResponse<MqapAssessment[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("mqap_assessments")
      .select("*")
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as MqapAssessment[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function upsertAssessment(
  input: UpsertMqapAssessmentInput,
): Promise<ActionResponse<MqapAssessment>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = upsertMqapAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("mqap_assessments")
      .upsert(
        {
          tenant_id: tenantId,
          criteria_id: parsed.data.criteria_id,
          rating: parsed.data.rating,
          strengths: parsed.data.strengths,
          assessed_at: new Date().toISOString(),
          assessed_by: context.user.id,
        },
        { onConflict: "tenant_id,criteria_id" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MQAP_ASSESSMENT_UPDATED,
      entityType: "mqap_assessment",
      entityId: data.id,
      metadata: {
        criteria_id: parsed.data.criteria_id,
        rating: parsed.data.rating,
      },
    });

    return success(data as MqapAssessment);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GOALS
// ============================================================

export interface MqapGoalFilters {
  criteria_id?: string;
  status?: MqapGoalStatus;
  quality_area?: number;
}

export async function getGoals(
  filters?: MqapGoalFilters,
): Promise<ActionResponse<MqapGoal[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("mqap_goals")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters?.criteria_id) {
      query = query.eq("criteria_id", filters.criteria_id);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    let goals = (data ?? []) as MqapGoal[];

    // Filter by QA if needed (requires criteria lookup)
    if (filters?.quality_area) {
      const criteriaRes = await supabase
        .from("mqap_criteria")
        .select("id")
        .eq("quality_area", filters.quality_area);
      const criteriaIds = new Set(
        (criteriaRes.data ?? []).map((c: { id: string }) => c.id),
      );
      goals = goals.filter((g) => criteriaIds.has(g.criteria_id));
    }

    return success(goals);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createGoal(
  input: CreateMqapGoalInput,
): Promise<ActionResponse<MqapGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();

    const parsed = createMqapGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("mqap_goals")
      .insert({
        tenant_id: context.tenant.id,
        criteria_id: parsed.data.criteria_id,
        description: parsed.data.description,
        strategies: parsed.data.strategies,
        responsible_person_id: parsed.data.responsible_person_id,
        due_date: parsed.data.due_date,
        success_measures: parsed.data.success_measures,
        status: "not_started",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MQAP_GOAL_CREATED,
      entityType: "mqap_goal",
      entityId: data.id,
      metadata: {
        criteria_id: parsed.data.criteria_id,
        description: parsed.data.description,
      },
    });

    return success(data as MqapGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateGoal(
  input: UpdateMqapGoalInput,
): Promise<ActionResponse<MqapGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateMqapGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { id, ...updates } = parsed.data;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("mqap_goals")
      .update(cleanUpdates)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MQAP_GOAL_UPDATED,
      entityType: "mqap_goal",
      entityId: id,
      metadata: { updates: cleanUpdates },
    });

    return success(data as MqapGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function markGoalAchieved(
  goalId: string,
): Promise<ActionResponse<MqapGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("mqap_goals")
      .update({
        status: "achieved",
        achieved_at: new Date().toISOString(),
      })
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MQAP_GOAL_ACHIEVED,
      entityType: "mqap_goal",
      entityId: goalId,
    });

    return success(data as MqapGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteGoal(
  goalId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("mqap_goals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MQAP_GOAL_DELETED,
      entityType: "mqap_goal",
      entityId: goalId,
      metadata: { action: "soft_delete" },
    });

    return success({ id: goalId });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STAFF LOOKUP (for goal assignment)
// ============================================================

export async function getStaffForGoalAssignment(): Promise<
  ActionResponse<
    Array<{ id: string; first_name: string | null; last_name: string | null }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenant_users")
      .select("user_id, users!inner(id, first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .neq("status", "suspended");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const staff = (data ?? [])
      .filter((r) => r.users && !Array.isArray(r.users))
      .map((r) => {
        const u = r.users as unknown as {
          id: string;
          first_name: string | null;
          last_name: string | null;
        };
        return { id: u.id, first_name: u.first_name, last_name: u.last_name };
      });

    return success(staff);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD + ALIGNMENT
// ============================================================

export interface MqapDashboardSummary {
  quality_areas: Array<{
    qa_number: number;
    qa_name: string;
    total_criteria: number;
    assessed_count: number;
    working_towards_count: number;
    meeting_count: number;
    exceeding_count: number;
    goal_count: number;
    active_goal_count: number;
  }>;
  overall: {
    total_criteria: number;
    assessed_count: number;
    completion_percentage: number;
    goals_total: number;
    goals_achieved: number;
    goals_in_progress: number;
  };
  gap_items: Array<{
    type: "unassessed_qa" | "working_towards" | "overdue_goal" | "no_goals";
    message: string;
    qa_number?: number;
    criteria_code?: string;
    goal_id?: string;
  }>;
}

export async function getMqapDashboardSummary(): Promise<
  ActionResponse<MqapDashboardSummary>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch criteria, assessments, and goals in parallel
    const [criteriaRes, assessmentsRes, goalsRes] = await Promise.all([
      supabase
        .from("mqap_criteria")
        .select("id, code, quality_area")
        .eq("is_active", true),
      supabase
        .from("mqap_assessments")
        .select("criteria_id, rating")
        .eq("tenant_id", tenantId),
      supabase
        .from("mqap_goals")
        .select("id, criteria_id, status, due_date")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null),
    ]);

    const criteria = (criteriaRes.data ?? []) as Array<{
      id: string;
      code: string;
      quality_area: number;
    }>;
    const assessments = (assessmentsRes.data ?? []) as Array<{
      criteria_id: string;
      rating: MqapRating;
    }>;
    const goals = (goalsRes.data ?? []) as Array<{
      id: string;
      criteria_id: string;
      status: MqapGoalStatus;
      due_date: string | null;
    }>;

    const assessmentMap = new Map<string, MqapRating>();
    for (const a of assessments) {
      assessmentMap.set(a.criteria_id, a.rating);
    }

    const today = new Date().toISOString().split("T")[0];
    const gaps: MqapDashboardSummary["gap_items"] = [];
    let totalAssessed = 0;
    let totalGoals = 0;
    let totalGoalsAchieved = 0;
    let totalGoalsInProgress = 0;

    // Group criteria by QA
    const criteriaByQA = new Map<number, typeof criteria>();
    for (const c of criteria) {
      const list = criteriaByQA.get(c.quality_area) ?? [];
      list.push(c);
      criteriaByQA.set(c.quality_area, list);
    }

    const qaStats = MQAP_QUALITY_AREAS.map((qa) => {
      const qaCriteria = criteriaByQA.get(qa.id) ?? [];
      const criteriaIds = new Set(qaCriteria.map((c) => c.id));
      const totalCriteria = qaCriteria.length;

      let assessed = 0;
      let workingTowards = 0;
      let meeting = 0;
      let exceeding = 0;

      for (const c of qaCriteria) {
        const rating = assessmentMap.get(c.id);
        if (rating) {
          assessed++;
          if (rating === "working_towards") workingTowards++;
          else if (rating === "meeting") meeting++;
          else if (rating === "exceeding") exceeding++;
        }
      }

      const qaGoals = goals.filter((g) => criteriaIds.has(g.criteria_id));
      const activeGoals = qaGoals.filter((g) => g.status !== "achieved");

      totalAssessed += assessed;
      totalGoals += qaGoals.length;
      totalGoalsAchieved += qaGoals.filter(
        (g) => g.status === "achieved",
      ).length;
      totalGoalsInProgress += qaGoals.filter(
        (g) => g.status === "in_progress",
      ).length;

      if (assessed === 0 && totalCriteria > 0) {
        gaps.push({
          type: "unassessed_qa",
          message: `QA${qa.id}: ${qa.name} has no assessments`,
          qa_number: qa.id,
        });
      }

      // Flag working_towards criteria with no improvement goals
      for (const c of qaCriteria) {
        const rating = assessmentMap.get(c.id);
        if (rating === "working_towards") {
          const hasGoal = goals.some(
            (g) => g.criteria_id === c.id && g.status !== "achieved",
          );
          if (!hasGoal) {
            const criterion = qaCriteria.find((cr) => cr.id === c.id);
            gaps.push({
              type: "no_goals",
              message: `${criterion?.code ?? c.id}: Rated "Working Towards" but no active improvement goal`,
              qa_number: qa.id,
              criteria_code: criterion?.code,
            });
          }
        }
      }

      return {
        qa_number: qa.id,
        qa_name: qa.name,
        total_criteria: totalCriteria,
        assessed_count: assessed,
        working_towards_count: workingTowards,
        meeting_count: meeting,
        exceeding_count: exceeding,
        goal_count: qaGoals.length,
        active_goal_count: activeGoals.length,
      };
    });

    // Flag overdue goals
    for (const goal of goals) {
      if (
        goal.status !== "achieved" &&
        goal.due_date &&
        goal.due_date < today
      ) {
        gaps.push({
          type: "overdue_goal",
          message: `Overdue improvement goal`,
          goal_id: goal.id,
        });
      }
    }

    const totalCriteria = criteria.length;

    return success({
      quality_areas: qaStats,
      overall: {
        total_criteria: totalCriteria,
        assessed_count: totalAssessed,
        completion_percentage:
          totalCriteria > 0
            ? Math.round((totalAssessed / totalCriteria) * 100)
            : 0,
        goals_total: totalGoals,
        goals_achieved: totalGoalsAchieved,
        goals_in_progress: totalGoalsInProgress,
      },
      gap_items: gaps,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// NQS ↔ MQ:AP ALIGNMENT VIEW
// ============================================================

export interface AlignmentItem {
  mqap_criterion: MqapCriterion;
  mqap_assessment: MqapAssessment | null;
  nqs_element_id: string | null;
  nqs_assessment: QipElementAssessment | null;
}

export async function getAlignmentView(): Promise<
  ActionResponse<AlignmentItem[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const [criteriaRes, mqapAssessmentsRes, nqsAssessmentsRes] =
      await Promise.all([
        supabase
          .from("mqap_criteria")
          .select("*")
          .eq("is_active", true)
          .order("quality_area")
          .order("sequence_order"),
        supabase.from("mqap_assessments").select("*").eq("tenant_id", tenantId),
        supabase
          .from("qip_element_assessments")
          .select("*")
          .eq("tenant_id", tenantId),
      ]);

    const mqapCriteria = (criteriaRes.data ?? []) as MqapCriterion[];
    const mqapAssessments = (mqapAssessmentsRes.data ?? []) as MqapAssessment[];
    const nqsAssessments = (nqsAssessmentsRes.data ??
      []) as QipElementAssessment[];

    const mqapMap = new Map<string, MqapAssessment>();
    for (const a of mqapAssessments) {
      mqapMap.set(a.criteria_id, a);
    }

    const nqsMap = new Map<string, QipElementAssessment>();
    for (const a of nqsAssessments) {
      nqsMap.set(a.nqs_element_id, a);
    }

    const items: AlignmentItem[] = mqapCriteria.map((criterion) => ({
      mqap_criterion: criterion,
      mqap_assessment: mqapMap.get(criterion.id) ?? null,
      nqs_element_id: criterion.nqs_element_alignment,
      nqs_assessment: criterion.nqs_element_alignment
        ? (nqsMap.get(criterion.nqs_element_alignment) ?? null)
        : null,
    }));

    return success(items);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CRITERIA WITH ASSESSMENTS (full loaded view)
// ============================================================

export async function getCriteriaWithAssessments(): Promise<
  ActionResponse<MqapCriterionWithAssessment[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_MQAP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const [criteriaRes, assessmentsRes, goalsRes, nqsAssessmentsRes] =
      await Promise.all([
        supabase
          .from("mqap_criteria")
          .select("*")
          .eq("is_active", true)
          .order("quality_area")
          .order("sequence_order"),
        supabase.from("mqap_assessments").select("*").eq("tenant_id", tenantId),
        supabase
          .from("mqap_goals")
          .select("*")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("qip_element_assessments")
          .select("*")
          .eq("tenant_id", tenantId),
      ]);

    const criteria = (criteriaRes.data ?? []) as MqapCriterion[];
    const assessments = (assessmentsRes.data ?? []) as MqapAssessment[];
    const goals = (goalsRes.data ?? []) as MqapGoal[];
    const nqsAssessments = (nqsAssessmentsRes.data ??
      []) as QipElementAssessment[];

    const assessmentMap = new Map<string, MqapAssessment>();
    for (const a of assessments) {
      assessmentMap.set(a.criteria_id, a);
    }

    const goalsByCriteria = new Map<string, MqapGoal[]>();
    for (const g of goals) {
      const list = goalsByCriteria.get(g.criteria_id) ?? [];
      list.push(g);
      goalsByCriteria.set(g.criteria_id, list);
    }

    const nqsMap = new Map<string, QipElementAssessment>();
    for (const a of nqsAssessments) {
      nqsMap.set(a.nqs_element_id, a);
    }

    const result: MqapCriterionWithAssessment[] = criteria.map((criterion) => ({
      criterion,
      assessment: assessmentMap.get(criterion.id) ?? null,
      goals: goalsByCriteria.get(criterion.id) ?? [],
      nqs_assessment: criterion.nqs_element_alignment
        ? (nqsMap.get(criterion.nqs_element_alignment) ?? null)
        : null,
    }));

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT (PDF or structured data for Montessori Australia)
// ============================================================

export interface MqapExportData {
  school_name: string;
  export_date: string;
  quality_areas: Array<{
    number: number;
    name: string;
    standards: Array<{
      id: string;
      name: string;
      criteria: Array<{
        code: string;
        text: string;
        nqs_alignment: string | null;
        rating: MqapRating | null;
        nqs_rating: string | null;
        strengths: string | null;
        goals: Array<{
          description: string;
          strategies: string | null;
          responsible_person: string | null;
          due_date: string | null;
          status: string;
        }>;
      }>;
    }>;
  }>;
  summary: {
    total_criteria: number;
    assessed: number;
    meeting_or_exceeding: number;
    working_towards: number;
    unassessed: number;
  };
}

export async function exportMqapData(): Promise<
  ActionResponse<MqapExportData>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_MQAP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const [criteriaRes, assessmentsRes, goalsRes, nqsRes, tenantRes] =
      await Promise.all([
        supabase
          .from("mqap_criteria")
          .select("*")
          .eq("is_active", true)
          .order("quality_area")
          .order("sequence_order"),
        supabase.from("mqap_assessments").select("*").eq("tenant_id", tenantId),
        supabase
          .from("mqap_goals")
          .select(
            "*, users!mqap_goals_responsible_person_id_fkey(first_name, last_name)",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
        supabase
          .from("qip_element_assessments")
          .select("nqs_element_id, rating")
          .eq("tenant_id", tenantId),
        supabase.from("tenants").select("name").eq("id", tenantId).single(),
      ]);

    const criteria = (criteriaRes.data ?? []) as MqapCriterion[];
    const assessments = (assessmentsRes.data ?? []) as MqapAssessment[];
    const goals = goalsRes.data ?? [];
    const nqsAssessments = (nqsRes.data ?? []) as Array<{
      nqs_element_id: string;
      rating: string;
    }>;
    const schoolName = tenantRes.data?.name ?? "School";

    const assessmentMap = new Map<string, MqapAssessment>();
    for (const a of assessments) {
      assessmentMap.set(a.criteria_id, a);
    }

    const goalsByCriteria = new Map<string, typeof goals>();
    for (const g of goals) {
      const list = goalsByCriteria.get(g.criteria_id) ?? [];
      list.push(g);
      goalsByCriteria.set(g.criteria_id, list);
    }

    const nqsMap = new Map<string, string>();
    for (const a of nqsAssessments) {
      nqsMap.set(a.nqs_element_id, a.rating);
    }

    // Group criteria by QA and standard
    let totalAssessed = 0;
    let meetingOrExceeding = 0;
    let workingTowards = 0;

    const qualityAreas = MQAP_QUALITY_AREAS.map((qa) => ({
      number: qa.id,
      name: qa.name,
      standards: qa.standards.map((s) => ({
        id: s.id,
        name: s.name,
        criteria: s.criteria.map((cDef) => {
          const dbCriterion = criteria.find((c) => c.code === cDef.code);
          const assessment = dbCriterion
            ? assessmentMap.get(dbCriterion.id)
            : null;
          const criteriaGoals = dbCriterion
            ? (goalsByCriteria.get(dbCriterion.id) ?? [])
            : [];

          if (assessment?.rating) {
            totalAssessed++;
            if (
              assessment.rating === "meeting" ||
              assessment.rating === "exceeding"
            ) {
              meetingOrExceeding++;
            } else {
              workingTowards++;
            }
          }

          return {
            code: cDef.code,
            text: cDef.criterion_text,
            nqs_alignment: cDef.nqs_element_alignment,
            rating: (assessment?.rating as MqapRating) ?? null,
            nqs_rating: cDef.nqs_element_alignment
              ? (nqsMap.get(cDef.nqs_element_alignment) ?? null)
              : null,
            strengths: assessment?.strengths ?? null,
            goals: criteriaGoals.map((g: Record<string, unknown>) => {
              const user = g.users as {
                first_name: string | null;
                last_name: string | null;
              } | null;
              return {
                description: g.description as string,
                strategies: (g.strategies as string | null) ?? null,
                responsible_person: user
                  ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                  : null,
                due_date: (g.due_date as string | null) ?? null,
                status: g.status as string,
              };
            }),
          };
        }),
      })),
    }));

    const totalCriteria = criteria.length;

    await logAudit({
      context,
      action: AuditActions.MQAP_EXPORTED,
      entityType: "mqap_export",
      metadata: {
        total_criteria: totalCriteria,
        assessed: totalAssessed,
      },
    });

    return success({
      school_name: schoolName,
      export_date: new Date().toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      quality_areas: qualityAreas,
      summary: {
        total_criteria: totalCriteria,
        assessed: totalAssessed,
        meeting_or_exceeding: meetingOrExceeding,
        working_towards: workingTowards,
        unassessed: totalCriteria - totalAssessed,
      },
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
