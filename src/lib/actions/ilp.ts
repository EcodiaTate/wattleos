"use server";

// src/lib/actions/ilp.ts
//
// ============================================================
// WattleOS V2 - Module Q: Individual Learning Plans
// ============================================================
// Manages ILPs for children with additional needs, including
// goals, strategies, reviews, collaborators, evidence, and
// transition-to-school statements (EYLF / NQS links).
//
// Permissions:
//   VIEW_ILP                    - read plans, goals, reviews, evidence
//   MANAGE_ILP                  - write/update plans, goals, strategies, evidence
//   MANAGE_TRANSITION_STATEMENTS - write/update transition statements
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  VALID_PLAN_TRANSITIONS,
  VALID_GOAL_TRANSITIONS,
  DEFAULT_REVIEW_CYCLE_DAYS,
} from "@/lib/constants/ilp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditAction, AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createPlanSchema,
  updatePlanSchema,
  createGoalSchema,
  updateGoalSchema,
  createStrategySchema,
  updateStrategySchema,
  createReviewSchema,
  addCollaboratorSchema,
  updateCollaboratorSchema,
  attachEvidenceSchema,
  createTransitionStatementSchema,
  updateTransitionStatementSchema,
  listPlansFilterSchema,
  type CreatePlanRawInput,
  type UpdatePlanRawInput,
  type CreateGoalRawInput,
  type UpdateGoalRawInput,
  type CreateStrategyRawInput,
  type UpdateStrategyRawInput,
  type CreateReviewRawInput,
  type AddCollaboratorRawInput,
  type UpdateCollaboratorRawInput,
  type AttachEvidenceRawInput,
  type CreateTransitionStatementRawInput,
  type UpdateTransitionStatementRawInput,
  type ListPlansFilter,
} from "@/lib/validations/ilp";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  IndividualLearningPlan,
  IndividualLearningPlanWithDetails,
  IndividualLearningPlanListItem,
  IlpGoal,
  IlpGoalWithStrategies,
  IlpStrategy,
  IlpReview,
  IlpCollaborator,
  IlpEvidence,
  TransitionStatement,
  TransitionStatementWithStudent,
  IlpDashboardData,
  IlpPlanStatus,
  IlpGoalStatus,
} from "@/types/domain";

// ============================================================
// PLAN - CREATE
// ============================================================

export async function createPlan(
  input: CreatePlanRawInput,
): Promise<ActionResponse<IndividualLearningPlan>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = createPlanSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("individual_learning_plans")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        plan_title: v.plan_title,
        plan_status: "draft" as IlpPlanStatus,
        support_categories: v.support_categories,
        funding_source: v.funding_source || null,
        funding_reference: v.funding_reference || null,
        start_date: v.start_date,
        review_due_date: v.review_due_date || null,
        child_strengths: v.child_strengths || null,
        child_interests: v.child_interests || null,
        background_information: v.background_information || null,
        family_goals: v.family_goals || null,
        parent_consent_given: v.parent_consent_given,
        parent_consent_date: v.parent_consent_date || null,
        parent_consent_by: v.parent_consent_by || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create plan",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_PLAN_CREATED,
      entityType: "individual_learning_plan",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        plan_title: v.plan_title,
        support_categories: v.support_categories,
        funding_source: v.funding_source,
      },
    });

    return success(data as IndividualLearningPlan);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create plan",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - UPDATE
// ============================================================

export async function updatePlan(
  planId: string,
  input: UpdatePlanRawInput,
): Promise<ActionResponse<IndividualLearningPlan>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = updatePlanSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Fetch existing plan for status transition validation
    const { data: existing } = await supabase
      .from("individual_learning_plans")
      .select("plan_status")
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Plan not found", ErrorCodes.ILP_PLAN_NOT_FOUND);
    }

    // Validate status transition if changing
    const isStatusChange =
      v.plan_status !== undefined && v.plan_status !== existing.plan_status;

    if (isStatusChange) {
      const allowed =
        VALID_PLAN_TRANSITIONS[existing.plan_status as string] ?? [];
      if (!allowed.includes(v.plan_status as string)) {
        return failure(
          `Cannot transition plan from "${existing.plan_status}" to "${v.plan_status}"`,
          ErrorCodes.INVALID_ILP_STATUS_TRANSITION,
        );
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: context.user.id,
    };
    if (v.plan_title !== undefined) updatePayload.plan_title = v.plan_title;
    if (v.plan_status !== undefined) updatePayload.plan_status = v.plan_status;
    if (v.support_categories !== undefined)
      updatePayload.support_categories = v.support_categories;
    if (v.funding_source !== undefined)
      updatePayload.funding_source = v.funding_source;
    if (v.funding_reference !== undefined)
      updatePayload.funding_reference = v.funding_reference;
    if (v.start_date !== undefined) updatePayload.start_date = v.start_date;
    if (v.review_due_date !== undefined)
      updatePayload.review_due_date = v.review_due_date;
    if (v.next_review_date !== undefined)
      updatePayload.next_review_date = v.next_review_date;
    if (v.end_date !== undefined) updatePayload.end_date = v.end_date;
    if (v.child_strengths !== undefined)
      updatePayload.child_strengths = v.child_strengths;
    if (v.child_interests !== undefined)
      updatePayload.child_interests = v.child_interests;
    if (v.background_information !== undefined)
      updatePayload.background_information = v.background_information;
    if (v.family_goals !== undefined)
      updatePayload.family_goals = v.family_goals;
    if (v.parent_consent_given !== undefined)
      updatePayload.parent_consent_given = v.parent_consent_given;
    if (v.parent_consent_date !== undefined)
      updatePayload.parent_consent_date = v.parent_consent_date;
    if (v.parent_consent_by !== undefined)
      updatePayload.parent_consent_by = v.parent_consent_by;

    const { data, error } = await supabase
      .from("individual_learning_plans")
      .update(updatePayload)
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update plan",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: isStatusChange
        ? AuditActions.ILP_PLAN_STATUS_CHANGED
        : AuditActions.ILP_PLAN_UPDATED,
      entityType: "individual_learning_plan",
      entityId: planId,
      metadata: isStatusChange
        ? {
            from_status: existing.plan_status,
            to_status: v.plan_status,
          }
        : { updated_fields: Object.keys(updatePayload) },
    });

    return success(data as IndividualLearningPlan);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update plan",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - GET (with details)
// ============================================================

export async function getPlan(
  planId: string,
): Promise<ActionResponse<IndividualLearningPlanWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    // 1. Plan with student join
    const { data: plan, error: planError } = await supabase
      .from("individual_learning_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url, dob)",
      )
      .eq("id", planId)
      .is("deleted_at", null)
      .single();

    if (planError || !plan) {
      return failure("Plan not found", ErrorCodes.ILP_PLAN_NOT_FOUND);
    }

    // 2. Goals (non-deleted)
    const { data: goals } = await supabase
      .from("ilp_goals")
      .select("*")
      .eq("plan_id", planId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    const goalRows = (goals ?? []) as IlpGoal[];
    const goalIds = goalRows.map((g) => g.id);

    // 3. Strategies for those goals
    let strategyRows: IlpStrategy[] = [];
    if (goalIds.length > 0) {
      const { data: strategies } = await supabase
        .from("ilp_strategies")
        .select("*")
        .in("goal_id", goalIds)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      strategyRows = (strategies ?? []) as IlpStrategy[];
    }

    // 4. Evidence counts per goal
    let evidenceByGoal: Record<string, number> = {};
    if (goalIds.length > 0) {
      const { data: evidenceCounts } = await supabase
        .from("ilp_evidence")
        .select("goal_id")
        .eq("plan_id", planId)
        .not("goal_id", "is", null);
      for (const row of evidenceCounts ?? []) {
        if (row.goal_id) {
          evidenceByGoal[row.goal_id] = (evidenceByGoal[row.goal_id] ?? 0) + 1;
        }
      }
    }

    // Assemble goals with strategies
    const goalsWithStrategies: IlpGoalWithStrategies[] = goalRows.map(
      (goal) => ({
        ...goal,
        strategies: strategyRows.filter((s) => s.goal_id === goal.id),
        evidence_count: evidenceByGoal[goal.id] ?? 0,
      }),
    );

    // 5. Collaborators
    const { data: collaborators } = await supabase
      .from("ilp_collaborators")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });

    // 6. Reviews
    const { data: reviews } = await supabase
      .from("ilp_reviews")
      .select("*")
      .eq("plan_id", planId)
      .order("review_date", { ascending: false });

    // 7. Total evidence count for plan
    const { count: evidenceCount } = await supabase
      .from("ilp_evidence")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId);

    // 8. Created-by user
    const { data: createdByUser } = plan.created_by
      ? await supabase
          .from("users")
          .select("id, first_name, last_name")
          .eq("id", plan.created_by)
          .single()
      : { data: null };

    const result: IndividualLearningPlanWithDetails = {
      ...(plan as unknown as IndividualLearningPlan),
      student: plan.student as IndividualLearningPlanWithDetails["student"],
      goals: goalsWithStrategies,
      collaborators: (collaborators ?? []) as IlpCollaborator[],
      reviews: (reviews ?? []) as IlpReview[],
      evidence_count: evidenceCount ?? 0,
      created_by_user:
        createdByUser as IndividualLearningPlanWithDetails["created_by_user"],
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get plan",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - LIST
// ============================================================

export async function listPlans(
  filter?: ListPlansFilter,
): Promise<ActionResponse<IndividualLearningPlanListItem[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = listPlansFilterSchema.safeParse(filter ?? {});
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("individual_learning_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (f.plan_status) {
      query = query.eq("plan_status", f.plan_status);
    }
    if (f.student_id) {
      query = query.eq("student_id", f.student_id);
    }
    if (f.support_category) {
      query = query.contains("support_categories", [f.support_category]);
    }
    if (f.review_overdue) {
      const today = new Date().toISOString().split("T")[0];
      query = query
        .lt("review_due_date", today)
        .in("plan_status", ["active", "in_review"]);
    }

    const { data: plans, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!plans || plans.length === 0) {
      return success([]);
    }

    const planIds = plans.map((p) => p.id);

    // Fetch goal counts per plan
    const { data: goalRows } = await supabase
      .from("ilp_goals")
      .select("plan_id, goal_status")
      .in("plan_id", planIds)
      .is("deleted_at", null);

    const goalCountMap: Record<string, number> = {};
    const goalAchievedMap: Record<string, number> = {};
    for (const g of goalRows ?? []) {
      goalCountMap[g.plan_id] = (goalCountMap[g.plan_id] ?? 0) + 1;
      if (g.goal_status === "achieved") {
        goalAchievedMap[g.plan_id] = (goalAchievedMap[g.plan_id] ?? 0) + 1;
      }
    }

    const items: IndividualLearningPlanListItem[] = plans.map((plan) => ({
      ...(plan as unknown as IndividualLearningPlan),
      student: plan.student as IndividualLearningPlanListItem["student"],
      goal_count: goalCountMap[plan.id] ?? 0,
      goals_achieved: goalAchievedMap[plan.id] ?? 0,
      next_review: (plan.review_due_date as string | null) ?? null,
    }));

    return success(items);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list plans",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - ARCHIVE (soft delete)
// ============================================================

export async function archivePlan(
  planId: string,
): Promise<ActionResponse<{ archived: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("individual_learning_plans")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: context.user.id,
      })
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_PLAN_ARCHIVED,
      entityType: "individual_learning_plan",
      entityId: planId,
      metadata: {},
    });

    return success({ archived: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to archive plan",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - ACTIVATE (draft → active)
// ============================================================

export async function activatePlan(
  planId: string,
): Promise<ActionResponse<IndividualLearningPlan>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("individual_learning_plans")
      .select("plan_status, start_date, next_review_date")
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Plan not found", ErrorCodes.ILP_PLAN_NOT_FOUND);
    }

    if (existing.plan_status !== "draft") {
      return failure(
        "Only draft plans can be activated",
        ErrorCodes.INVALID_ILP_STATUS_TRANSITION,
      );
    }

    // Auto-set next_review_date if not already set
    const updatePayload: Record<string, unknown> = {
      plan_status: "active" as IlpPlanStatus,
      updated_by: context.user.id,
    };

    if (!existing.next_review_date) {
      const startDate = new Date(existing.start_date);
      startDate.setDate(startDate.getDate() + DEFAULT_REVIEW_CYCLE_DAYS);
      updatePayload.next_review_date = startDate.toISOString().split("T")[0];
      updatePayload.review_due_date = startDate.toISOString().split("T")[0];
    }

    const { data, error } = await supabase
      .from("individual_learning_plans")
      .update(updatePayload)
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to activate plan",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_PLAN_ACTIVATED,
      entityType: "individual_learning_plan",
      entityId: planId,
      metadata: {
        from_status: "draft",
        next_review_date:
          updatePayload.next_review_date ?? existing.next_review_date,
      },
    });

    return success(data as IndividualLearningPlan);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to activate plan",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GOAL - CREATE
// ============================================================

export async function createGoal(
  input: CreateGoalRawInput,
): Promise<ActionResponse<IlpGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = createGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Get max sort_order for this plan
    const { data: maxRow } = await supabase
      .from("ilp_goals")
      .select("sort_order")
      .eq("plan_id", v.plan_id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("ilp_goals")
      .insert({
        tenant_id: context.tenant.id,
        plan_id: v.plan_id,
        goal_title: v.goal_title,
        goal_description: v.goal_description || null,
        developmental_domain: v.developmental_domain,
        eylf_outcome_ids: v.eylf_outcome_ids,
        goal_status: "not_started" as IlpGoalStatus,
        priority: v.priority,
        target_date: v.target_date || null,
        baseline_notes: v.baseline_notes || null,
        success_criteria: v.success_criteria || null,
        sort_order: nextSort,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create goal",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_GOAL_CREATED,
      entityType: "ilp_goal",
      entityId: data.id,
      metadata: {
        plan_id: v.plan_id,
        goal_title: v.goal_title,
        developmental_domain: v.developmental_domain,
        priority: v.priority,
      },
    });

    return success(data as IlpGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create goal",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GOAL - UPDATE
// ============================================================

export async function updateGoal(
  goalId: string,
  input: UpdateGoalRawInput,
): Promise<ActionResponse<IlpGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Fetch existing for status transition validation
    const { data: existing } = await supabase
      .from("ilp_goals")
      .select("goal_status, plan_id")
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Goal not found", ErrorCodes.ILP_GOAL_NOT_FOUND);
    }

    const isStatusChange =
      v.goal_status !== undefined && v.goal_status !== existing.goal_status;

    if (isStatusChange) {
      const allowed =
        VALID_GOAL_TRANSITIONS[existing.goal_status as string] ?? [];
      if (!allowed.includes(v.goal_status as string)) {
        return failure(
          `Cannot transition goal from "${existing.goal_status}" to "${v.goal_status}"`,
          ErrorCodes.INVALID_ILP_STATUS_TRANSITION,
        );
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (v.goal_title !== undefined) updatePayload.goal_title = v.goal_title;
    if (v.goal_description !== undefined)
      updatePayload.goal_description = v.goal_description;
    if (v.developmental_domain !== undefined)
      updatePayload.developmental_domain = v.developmental_domain;
    if (v.eylf_outcome_ids !== undefined)
      updatePayload.eylf_outcome_ids = v.eylf_outcome_ids;
    if (v.goal_status !== undefined) updatePayload.goal_status = v.goal_status;
    if (v.priority !== undefined) updatePayload.priority = v.priority;
    if (v.target_date !== undefined) updatePayload.target_date = v.target_date;
    if (v.baseline_notes !== undefined)
      updatePayload.baseline_notes = v.baseline_notes;
    if (v.success_criteria !== undefined)
      updatePayload.success_criteria = v.success_criteria;

    const { data, error } = await supabase
      .from("ilp_goals")
      .update(updatePayload)
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update goal",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    // Choose audit action based on status change
    let auditAction: AuditAction = AuditActions.ILP_GOAL_UPDATED;
    if (isStatusChange && v.goal_status === "achieved") {
      auditAction = AuditActions.ILP_GOAL_ACHIEVED;
    } else if (isStatusChange && v.goal_status === "discontinued") {
      auditAction = AuditActions.ILP_GOAL_DISCONTINUED;
    }

    await logAudit({
      context,
      action: auditAction,
      entityType: "ilp_goal",
      entityId: goalId,
      metadata: isStatusChange
        ? {
            plan_id: existing.plan_id,
            from_status: existing.goal_status,
            to_status: v.goal_status,
          }
        : {
            plan_id: existing.plan_id,
            updated_fields: Object.keys(updatePayload),
          },
    });

    return success(data as IlpGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update goal",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GOAL - DELETE (soft)
// ============================================================

export async function deleteGoal(
  goalId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("ilp_goals")
      .select("plan_id, goal_title")
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Goal not found", ErrorCodes.ILP_GOAL_NOT_FOUND);
    }

    const { error } = await supabase
      .from("ilp_goals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_GOAL_DELETED,
      entityType: "ilp_goal",
      entityId: goalId,
      metadata: {
        plan_id: existing.plan_id,
        goal_title: existing.goal_title,
      },
    });

    return success({ deleted: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete goal",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GOAL - REORDER
// ============================================================

export async function reorderGoals(
  planId: string,
  goalIds: string[],
): Promise<ActionResponse<{ reordered: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    // Update sort_order for each goal
    for (let i = 0; i < goalIds.length; i++) {
      const { error } = await supabase
        .from("ilp_goals")
        .update({ sort_order: i + 1 })
        .eq("id", goalIds[i])
        .eq("plan_id", planId)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null);

      if (error) {
        return failure(error.message, ErrorCodes.DATABASE_ERROR);
      }
    }

    return success({ reordered: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to reorder goals",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STRATEGY - CREATE
// ============================================================

export async function createStrategy(
  input: CreateStrategyRawInput,
): Promise<ActionResponse<IlpStrategy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = createStrategySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Get max sort_order for this goal
    const { data: maxRow } = await supabase
      .from("ilp_strategies")
      .select("sort_order")
      .eq("goal_id", v.goal_id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("ilp_strategies")
      .insert({
        tenant_id: context.tenant.id,
        goal_id: v.goal_id,
        strategy_description: v.strategy_description,
        strategy_type: v.strategy_type,
        responsible_role: v.responsible_role || null,
        responsible_user_id: v.responsible_user_id || null,
        implementation_frequency: v.implementation_frequency || null,
        is_active: true,
        sort_order: nextSort,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create strategy",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_STRATEGY_CREATED,
      entityType: "ilp_strategy",
      entityId: data.id,
      metadata: {
        goal_id: v.goal_id,
        strategy_type: v.strategy_type,
      },
    });

    return success(data as IlpStrategy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create strategy",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STRATEGY - UPDATE
// ============================================================

export async function updateStrategy(
  strategyId: string,
  input: UpdateStrategyRawInput,
): Promise<ActionResponse<IlpStrategy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateStrategySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const updatePayload: Record<string, unknown> = {};
    if (v.strategy_description !== undefined)
      updatePayload.strategy_description = v.strategy_description;
    if (v.strategy_type !== undefined)
      updatePayload.strategy_type = v.strategy_type;
    if (v.responsible_role !== undefined)
      updatePayload.responsible_role = v.responsible_role;
    if (v.responsible_user_id !== undefined)
      updatePayload.responsible_user_id = v.responsible_user_id;
    if (v.implementation_frequency !== undefined)
      updatePayload.implementation_frequency = v.implementation_frequency;
    if (v.is_active !== undefined) updatePayload.is_active = v.is_active;

    const { data, error } = await supabase
      .from("ilp_strategies")
      .update(updatePayload)
      .eq("id", strategyId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update strategy",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_STRATEGY_UPDATED,
      entityType: "ilp_strategy",
      entityId: strategyId,
      metadata: {
        goal_id: data.goal_id,
        updated_fields: Object.keys(updatePayload),
      },
    });

    return success(data as IlpStrategy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update strategy",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STRATEGY - DELETE (soft)
// ============================================================

export async function deleteStrategy(
  strategyId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("ilp_strategies")
      .select("goal_id, strategy_description")
      .eq("id", strategyId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Strategy not found", ErrorCodes.ILP_STRATEGY_NOT_FOUND);
    }

    const { error } = await supabase
      .from("ilp_strategies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", strategyId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_STRATEGY_DELETED,
      entityType: "ilp_strategy",
      entityId: strategyId,
      metadata: {
        goal_id: existing.goal_id,
      },
    });

    return success({ deleted: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete strategy",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// REVIEW - CREATE
// ============================================================

export async function createReview(
  input: CreateReviewRawInput,
): Promise<ActionResponse<IlpReview>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = createReviewSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("ilp_reviews")
      .insert({
        tenant_id: context.tenant.id,
        plan_id: v.plan_id,
        review_type: v.review_type,
        review_date: v.review_date,
        attendees: v.attendees,
        parent_attended: v.parent_attended,
        overall_progress: v.overall_progress,
        summary_notes: v.summary_notes || null,
        family_feedback: v.family_feedback || null,
        next_steps: v.next_steps || null,
        goal_updates: v.goal_updates,
        new_review_due_date: v.new_review_due_date || null,
        conducted_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create review",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // If new_review_due_date is set, update the plan's review dates
    if (v.new_review_due_date) {
      await supabase
        .from("individual_learning_plans")
        .update({
          review_due_date: v.new_review_due_date,
          next_review_date: v.new_review_due_date,
          updated_by: context.user.id,
        })
        .eq("id", v.plan_id)
        .eq("tenant_id", context.tenant.id);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_REVIEW_CREATED,
      entityType: "ilp_review",
      entityId: data.id,
      metadata: {
        plan_id: v.plan_id,
        review_type: v.review_type,
        review_date: v.review_date,
        overall_progress: v.overall_progress,
        parent_attended: v.parent_attended,
        goal_update_count: v.goal_updates.length,
        new_review_due_date: v.new_review_due_date,
      },
    });

    return success(data as IlpReview);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create review",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// REVIEW - LIST
// ============================================================

export async function listReviews(
  planId: string,
): Promise<ActionResponse<IlpReview[]>> {
  try {
    await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ilp_reviews")
      .select("*")
      .eq("plan_id", planId)
      .order("review_date", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as IlpReview[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list reviews",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COLLABORATOR - ADD
// ============================================================

export async function addCollaborator(
  input: AddCollaboratorRawInput,
): Promise<ActionResponse<IlpCollaborator>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = addCollaboratorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("ilp_collaborators")
      .insert({
        tenant_id: context.tenant.id,
        plan_id: v.plan_id,
        collaborator_name: v.collaborator_name,
        collaborator_role: v.collaborator_role,
        organisation: v.organisation || null,
        email: v.email || null,
        phone: v.phone || null,
        user_id: v.user_id || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to add collaborator",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_COLLABORATOR_ADDED,
      entityType: "ilp_collaborator",
      entityId: data.id,
      metadata: {
        plan_id: v.plan_id,
        collaborator_name: v.collaborator_name,
        collaborator_role: v.collaborator_role,
      },
    });

    return success(data as IlpCollaborator);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add collaborator",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COLLABORATOR - UPDATE
// ============================================================

export async function updateCollaborator(
  collaboratorId: string,
  input: UpdateCollaboratorRawInput,
): Promise<ActionResponse<IlpCollaborator>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateCollaboratorSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const updatePayload: Record<string, unknown> = {};
    if (v.collaborator_name !== undefined)
      updatePayload.collaborator_name = v.collaborator_name;
    if (v.collaborator_role !== undefined)
      updatePayload.collaborator_role = v.collaborator_role;
    if (v.organisation !== undefined)
      updatePayload.organisation = v.organisation;
    if (v.email !== undefined) updatePayload.email = v.email;
    if (v.phone !== undefined) updatePayload.phone = v.phone;
    if (v.user_id !== undefined) updatePayload.user_id = v.user_id;
    if (v.is_active !== undefined) updatePayload.is_active = v.is_active;

    const { data, error } = await supabase
      .from("ilp_collaborators")
      .update(updatePayload)
      .eq("id", collaboratorId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update collaborator",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    return success(data as IlpCollaborator);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update collaborator",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COLLABORATOR - REMOVE (hard delete)
// ============================================================

export async function removeCollaborator(
  collaboratorId: string,
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("ilp_collaborators")
      .select("plan_id, collaborator_name, collaborator_role")
      .eq("id", collaboratorId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) {
      return failure("Collaborator not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("ilp_collaborators")
      .delete()
      .eq("id", collaboratorId)
      .eq("tenant_id", context.tenant.id);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_COLLABORATOR_REMOVED,
      entityType: "ilp_collaborator",
      entityId: collaboratorId,
      metadata: {
        plan_id: existing.plan_id,
        collaborator_name: existing.collaborator_name,
        collaborator_role: existing.collaborator_role,
      },
    });

    return success({ removed: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to remove collaborator",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COLLABORATOR - TOGGLE ACTIVE
// ============================================================

export async function toggleCollaboratorActive(
  collaboratorId: string,
  isActive: boolean,
): Promise<ActionResponse<IlpCollaborator>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("ilp_collaborators")
      .update({ is_active: isActive })
      .eq("id", collaboratorId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update collaborator",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    return success(data as IlpCollaborator);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to toggle collaborator",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EVIDENCE - ATTACH
// ============================================================

export async function attachEvidence(
  input: AttachEvidenceRawInput,
): Promise<ActionResponse<IlpEvidence>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const parsed = attachEvidenceSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("ilp_evidence")
      .insert({
        tenant_id: context.tenant.id,
        plan_id: v.plan_id,
        goal_id: v.goal_id || null,
        review_id: v.review_id || null,
        evidence_type: v.evidence_type,
        observation_id: v.observation_id || null,
        title: v.title,
        description: v.description || null,
        file_url: v.file_url || null,
        file_name: v.file_name || null,
        attached_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to attach evidence",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.ILP_EVIDENCE_ATTACHED,
      entityType: "ilp_evidence",
      entityId: data.id,
      metadata: {
        plan_id: v.plan_id,
        goal_id: v.goal_id,
        evidence_type: v.evidence_type,
        title: v.title,
      },
    });

    return success(data as IlpEvidence);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to attach evidence",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EVIDENCE - REMOVE (hard delete)
// ============================================================

export async function removeEvidence(
  evidenceId: string,
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("ilp_evidence")
      .select("plan_id, title, evidence_type")
      .eq("id", evidenceId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) {
      return failure("Evidence not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("ilp_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("tenant_id", context.tenant.id);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.ILP_EVIDENCE_REMOVED,
      entityType: "ilp_evidence",
      entityId: evidenceId,
      metadata: {
        plan_id: existing.plan_id,
        title: existing.title,
        evidence_type: existing.evidence_type,
      },
    });

    return success({ removed: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to remove evidence",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EVIDENCE - LIST
// ============================================================

export async function listEvidence(
  planId: string,
  goalId?: string,
): Promise<ActionResponse<IlpEvidence[]>> {
  try {
    await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("ilp_evidence")
      .select("*")
      .eq("plan_id", planId)
      .order("attached_at", { ascending: false });

    if (goalId) {
      query = query.eq("goal_id", goalId);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as IlpEvidence[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list evidence",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - CREATE
// ============================================================

export async function createTransitionStatement(
  input: CreateTransitionStatementRawInput,
): Promise<ActionResponse<TransitionStatement>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = createTransitionStatementSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Check for duplicate (one per student per year)
    const { data: existingStatement } = await supabase
      .from("transition_statements")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", v.student_id)
      .eq("statement_year", v.statement_year)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingStatement) {
      return failure(
        "A transition statement already exists for this student and year",
        ErrorCodes.TRANSITION_STATEMENT_DUPLICATE,
      );
    }

    const { data, error } = await supabase
      .from("transition_statements")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        plan_id: v.plan_id || null,
        statement_year: v.statement_year,
        transition_status: "draft",
        identity_summary: v.identity_summary || null,
        community_summary: v.community_summary || null,
        wellbeing_summary: v.wellbeing_summary || null,
        learning_summary: v.learning_summary || null,
        communication_summary: v.communication_summary || null,
        strengths_summary: v.strengths_summary || null,
        interests_summary: v.interests_summary || null,
        approaches_to_learning: v.approaches_to_learning || null,
        additional_needs_summary: v.additional_needs_summary || null,
        family_input: v.family_input || null,
        educator_recommendations: v.educator_recommendations || null,
        receiving_school_name: v.receiving_school_name || null,
        receiving_school_contact: v.receiving_school_contact || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create transition statement",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.TRANSITION_STATEMENT_CREATED,
      entityType: "transition_statement",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        statement_year: v.statement_year,
        plan_id: v.plan_id,
      },
    });

    return success(data as TransitionStatement);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to create transition statement",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - UPDATE
// ============================================================

export async function updateTransitionStatement(
  statementId: string,
  input: UpdateTransitionStatementRawInput,
): Promise<ActionResponse<TransitionStatement>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = updateTransitionStatementSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const updatePayload: Record<string, unknown> = {};
    if (v.transition_status !== undefined)
      updatePayload.transition_status = v.transition_status;
    if (v.plan_id !== undefined) updatePayload.plan_id = v.plan_id;
    if (v.identity_summary !== undefined)
      updatePayload.identity_summary = v.identity_summary;
    if (v.community_summary !== undefined)
      updatePayload.community_summary = v.community_summary;
    if (v.wellbeing_summary !== undefined)
      updatePayload.wellbeing_summary = v.wellbeing_summary;
    if (v.learning_summary !== undefined)
      updatePayload.learning_summary = v.learning_summary;
    if (v.communication_summary !== undefined)
      updatePayload.communication_summary = v.communication_summary;
    if (v.strengths_summary !== undefined)
      updatePayload.strengths_summary = v.strengths_summary;
    if (v.interests_summary !== undefined)
      updatePayload.interests_summary = v.interests_summary;
    if (v.approaches_to_learning !== undefined)
      updatePayload.approaches_to_learning = v.approaches_to_learning;
    if (v.additional_needs_summary !== undefined)
      updatePayload.additional_needs_summary = v.additional_needs_summary;
    if (v.family_input !== undefined)
      updatePayload.family_input = v.family_input;
    if (v.educator_recommendations !== undefined)
      updatePayload.educator_recommendations = v.educator_recommendations;
    if (v.receiving_school_name !== undefined)
      updatePayload.receiving_school_name = v.receiving_school_name;
    if (v.receiving_school_contact !== undefined)
      updatePayload.receiving_school_contact = v.receiving_school_contact;

    const { data, error } = await supabase
      .from("transition_statements")
      .update(updatePayload)
      .eq("id", statementId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update transition statement",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.TRANSITION_STATEMENT_UPDATED,
      entityType: "transition_statement",
      entityId: statementId,
      metadata: {
        updated_fields: Object.keys(updatePayload),
      },
    });

    return success(data as TransitionStatement);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to update transition statement",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - GET (with student)
// ============================================================

export async function getTransitionStatement(
  statementId: string,
): Promise<ActionResponse<TransitionStatementWithStudent>> {
  try {
    await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    const { data: statement, error } = await supabase
      .from("transition_statements")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url, dob)",
      )
      .eq("id", statementId)
      .is("deleted_at", null)
      .single();

    if (error || !statement) {
      return failure(
        "Transition statement not found",
        ErrorCodes.TRANSITION_STATEMENT_NOT_FOUND,
      );
    }

    // Join plan (if linked)
    let planData: TransitionStatementWithStudent["plan"] = null;
    if (statement.plan_id) {
      const { data: plan } = await supabase
        .from("individual_learning_plans")
        .select("id, plan_title")
        .eq("id", statement.plan_id)
        .single();
      planData = plan as TransitionStatementWithStudent["plan"];
    }

    // Join created_by user
    let createdByUser: TransitionStatementWithStudent["created_by_user"] = null;
    if (statement.created_by) {
      const { data: user } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("id", statement.created_by)
        .single();
      createdByUser = user as TransitionStatementWithStudent["created_by_user"];
    }

    const result: TransitionStatementWithStudent = {
      ...(statement as unknown as TransitionStatement),
      student: statement.student as TransitionStatementWithStudent["student"],
      plan: planData,
      created_by_user: createdByUser,
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get transition statement",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - LIST
// ============================================================

export async function listTransitionStatements(
  year?: number,
): Promise<ActionResponse<TransitionStatementWithStudent[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();

    const filterYear = year ?? new Date().getFullYear();

    const { data: statements, error } = await supabase
      .from("transition_statements")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url, dob)",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("statement_year", filterYear)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!statements || statements.length === 0) {
      return success([]);
    }

    // Collect plan_ids and created_by user ids for batch lookup
    const planIds = [
      ...new Set(
        statements.filter((s) => s.plan_id).map((s) => s.plan_id as string),
      ),
    ];
    const createdByIds = [
      ...new Set(
        statements
          .filter((s) => s.created_by)
          .map((s) => s.created_by as string),
      ),
    ];

    // Batch fetch plans
    let planMap: Record<string, { id: string; plan_title: string }> = {};
    if (planIds.length > 0) {
      const { data: plans } = await supabase
        .from("individual_learning_plans")
        .select("id, plan_title")
        .in("id", planIds);
      for (const p of plans ?? []) {
        planMap[p.id] = { id: p.id, plan_title: p.plan_title };
      }
    }

    // Batch fetch created_by users
    let userMap: Record<
      string,
      { id: string; first_name: string | null; last_name: string | null }
    > = {};
    if (createdByIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", createdByIds);
      for (const u of users ?? []) {
        userMap[u.id] = {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
        };
      }
    }

    const results: TransitionStatementWithStudent[] = statements.map((s) => ({
      ...(s as unknown as TransitionStatement),
      student: s.student as TransitionStatementWithStudent["student"],
      plan: s.plan_id ? (planMap[s.plan_id] ?? null) : null,
      created_by_user: s.created_by ? (userMap[s.created_by] ?? null) : null,
    }));

    // Sort by student name (last_name, first_name)
    results.sort((a, b) => {
      const aName =
        `${a.student.last_name} ${a.student.first_name}`.toLowerCase();
      const bName =
        `${b.student.last_name} ${b.student.first_name}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    return success(results);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to list transition statements",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - SHARE WITH FAMILY
// ============================================================

export async function shareTransitionStatementWithFamily(
  statementId: string,
): Promise<ActionResponse<TransitionStatement>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("transition_statements")
      .update({
        shared_with_family_at: new Date().toISOString(),
        transition_status: "ready_for_family",
      })
      .eq("id", statementId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to share with family",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.TRANSITION_SHARED_WITH_FAMILY,
      entityType: "transition_statement",
      entityId: statementId,
      metadata: {
        student_id: data.student_id,
        statement_year: data.statement_year,
      },
    });

    return success(data as TransitionStatement);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to share with family",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TRANSITION STATEMENT - SHARE WITH SCHOOL
// ============================================================

export async function shareTransitionStatementWithSchool(
  statementId: string,
): Promise<ActionResponse<TransitionStatement>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("transition_statements")
      .update({
        shared_with_school_at: new Date().toISOString(),
        transition_status: "shared_with_school",
      })
      .eq("id", statementId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to share with school",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.TRANSITION_SHARED_WITH_SCHOOL,
      entityType: "transition_statement",
      entityId: statementId,
      metadata: {
        student_id: data.student_id,
        statement_year: data.statement_year,
        receiving_school_name: data.receiving_school_name,
      },
    });

    return success(data as TransitionStatement);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to share with school",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getIlpDashboard(): Promise<
  ActionResponse<IlpDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_ILP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const today = new Date().toISOString().split("T")[0];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // 1. Count active plans
    const { count: totalActivePlans } = await supabase
      .from("individual_learning_plans")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("plan_status", "active")
      .is("deleted_at", null);

    // 2. Count plans overdue for review (review_due_date < today, active/in_review)
    const { count: plansOverdueReview } = await supabase
      .from("individual_learning_plans")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("plan_status", ["active", "in_review"])
      .lt("review_due_date", today)
      .is("deleted_at", null);

    // 3. Count plans due for review (review_due_date between today and 14 days out)
    const fourteenDaysOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { count: plansDueForReview } = await supabase
      .from("individual_learning_plans")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("plan_status", ["active", "in_review"])
      .gte("review_due_date", today)
      .lte("review_due_date", fourteenDaysOut)
      .is("deleted_at", null);

    // 4. Count goals in progress (across active plans)
    const { data: activePlanIds } = await supabase
      .from("individual_learning_plans")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("plan_status", "active")
      .is("deleted_at", null);

    const activePlanIdList = (activePlanIds ?? []).map((p) => p.id);

    let goalsInProgress = 0;
    let goalsAchievedThisTerm = 0;

    if (activePlanIdList.length > 0) {
      const { count: inProgressCount } = await supabase
        .from("ilp_goals")
        .select("id", { count: "exact", head: true })
        .in("plan_id", activePlanIdList)
        .eq("goal_status", "in_progress")
        .is("deleted_at", null);
      goalsInProgress = inProgressCount ?? 0;

      // Goals achieved in last 90 days
      const { count: achievedCount } = await supabase
        .from("ilp_goals")
        .select("id", { count: "exact", head: true })
        .in("plan_id", activePlanIdList)
        .eq("goal_status", "achieved")
        .gte("updated_at", ninetyDaysAgo)
        .is("deleted_at", null);
      goalsAchievedThisTerm = achievedCount ?? 0;
    }

    // 5. Transition statements in progress
    const currentYear = new Date().getFullYear();
    const { count: transitionInProgress } = await supabase
      .from("transition_statements")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("statement_year", currentYear)
      .in("transition_status", ["draft", "in_progress", "ready_for_family"])
      .is("deleted_at", null);

    // 6. Plans needing review (overdue + due soon, limit 10)
    const { data: plansNeedingReview } = await supabase
      .from("individual_learning_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", tenantId)
      .in("plan_status", ["active", "in_review"])
      .lte("review_due_date", fourteenDaysOut)
      .is("deleted_at", null)
      .order("review_due_date", { ascending: true })
      .limit(10);

    // Get goal counts for plans needing review
    const needingReviewIds = (plansNeedingReview ?? []).map((p) => p.id);
    let nrGoalCountMap: Record<string, number> = {};
    let nrGoalAchievedMap: Record<string, number> = {};
    if (needingReviewIds.length > 0) {
      const { data: nrGoals } = await supabase
        .from("ilp_goals")
        .select("plan_id, goal_status")
        .in("plan_id", needingReviewIds)
        .is("deleted_at", null);
      for (const g of nrGoals ?? []) {
        nrGoalCountMap[g.plan_id] = (nrGoalCountMap[g.plan_id] ?? 0) + 1;
        if (g.goal_status === "achieved") {
          nrGoalAchievedMap[g.plan_id] =
            (nrGoalAchievedMap[g.plan_id] ?? 0) + 1;
        }
      }
    }

    const plansNeedingReviewItems: IndividualLearningPlanListItem[] = (
      plansNeedingReview ?? []
    ).map((p) => ({
      ...(p as unknown as IndividualLearningPlan),
      student: p.student as IndividualLearningPlanListItem["student"],
      goal_count: nrGoalCountMap[p.id] ?? 0,
      goals_achieved: nrGoalAchievedMap[p.id] ?? 0,
      next_review: (p.review_due_date as string | null) ?? null,
    }));

    // 7. Recently updated plans (limit 10)
    const { data: recentPlans } = await supabase
      .from("individual_learning_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", tenantId)
      .in("plan_status", ["draft", "active", "in_review"])
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10);

    const recentIds = (recentPlans ?? []).map((p) => p.id);
    let recentGoalCountMap: Record<string, number> = {};
    let recentGoalAchievedMap: Record<string, number> = {};
    if (recentIds.length > 0) {
      const { data: recentGoals } = await supabase
        .from("ilp_goals")
        .select("plan_id, goal_status")
        .in("plan_id", recentIds)
        .is("deleted_at", null);
      for (const g of recentGoals ?? []) {
        recentGoalCountMap[g.plan_id] =
          (recentGoalCountMap[g.plan_id] ?? 0) + 1;
        if (g.goal_status === "achieved") {
          recentGoalAchievedMap[g.plan_id] =
            (recentGoalAchievedMap[g.plan_id] ?? 0) + 1;
        }
      }
    }

    const recentlyUpdatedItems: IndividualLearningPlanListItem[] = (
      recentPlans ?? []
    ).map((p) => ({
      ...(p as unknown as IndividualLearningPlan),
      student: p.student as IndividualLearningPlanListItem["student"],
      goal_count: recentGoalCountMap[p.id] ?? 0,
      goals_achieved: recentGoalAchievedMap[p.id] ?? 0,
      next_review: (p.review_due_date as string | null) ?? null,
    }));

    // 8. Transition statements for current year
    const { data: tsRows } = await supabase
      .from("transition_statements")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url, dob)",
      )
      .eq("tenant_id", tenantId)
      .eq("statement_year", currentYear)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    // Batch-fetch plan + user data for transition statements
    const tsPlanIds = [
      ...new Set(
        (tsRows ?? []).filter((s) => s.plan_id).map((s) => s.plan_id as string),
      ),
    ];
    const tsCreatedByIds = [
      ...new Set(
        (tsRows ?? [])
          .filter((s) => s.created_by)
          .map((s) => s.created_by as string),
      ),
    ];

    let tsPlanMap: Record<string, { id: string; plan_title: string }> = {};
    if (tsPlanIds.length > 0) {
      const { data: tsPlans } = await supabase
        .from("individual_learning_plans")
        .select("id, plan_title")
        .in("id", tsPlanIds);
      for (const p of tsPlans ?? []) {
        tsPlanMap[p.id] = { id: p.id, plan_title: p.plan_title };
      }
    }

    let tsUserMap: Record<
      string,
      { id: string; first_name: string | null; last_name: string | null }
    > = {};
    if (tsCreatedByIds.length > 0) {
      const { data: tsUsers } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", tsCreatedByIds);
      for (const u of tsUsers ?? []) {
        tsUserMap[u.id] = {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
        };
      }
    }

    const transitionStatements: TransitionStatementWithStudent[] = (
      tsRows ?? []
    ).map((s) => ({
      ...(s as unknown as TransitionStatement),
      student: s.student as TransitionStatementWithStudent["student"],
      plan: s.plan_id ? (tsPlanMap[s.plan_id] ?? null) : null,
      created_by_user: s.created_by ? (tsUserMap[s.created_by] ?? null) : null,
    }));

    const dashboard: IlpDashboardData = {
      summary: {
        total_active_plans: totalActivePlans ?? 0,
        plans_due_for_review: plansDueForReview ?? 0,
        plans_overdue_review: plansOverdueReview ?? 0,
        goals_in_progress: goalsInProgress,
        goals_achieved_this_term: goalsAchievedThisTerm,
        transition_statements_in_progress: transitionInProgress ?? 0,
      },
      plans_needing_review: plansNeedingReviewItems,
      recently_updated: recentlyUpdatedItems,
      transition_statements: transitionStatements,
    };

    return success(dashboard);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PLAN - UPDATE STATUS (convenience wrapper)
// ============================================================

export async function updatePlanStatus(
  planId: string,
  newStatus: IlpPlanStatus,
): Promise<ActionResponse<IndividualLearningPlan>> {
  return updatePlan(planId, { plan_status: newStatus });
}
