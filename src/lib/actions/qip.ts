"use server";

// src/lib/actions/qip.ts
//
// ============================================================
// WattleOS V2 - Module E: QIP Builder (Reg 55)
// ============================================================
// Quality Improvement Plan actions: service philosophy
// (versioned), NQS self-assessment per element, improvement
// goals, and polymorphic evidence linking.
//
// Permissions:
//   VIEW_QIP   - read assessments, goals, evidence, philosophy
//   MANAGE_QIP - write/update all of the above
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  QipElementAssessment,
  QipEvidence,
  QipEvidenceType,
  QipGoal,
  QipGoalStatus,
  QipRating,
  ServicePhilosophy,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  upsertAssessmentSchema,
  type UpsertAssessmentInput,
  createGoalSchema,
  type CreateGoalInput,
  updateGoalSchema,
  type UpdateGoalInput,
  attachEvidenceSchema,
  type AttachEvidenceInput,
  publishPhilosophySchema,
  type PublishPhilosophyInput,
} from "@/lib/validations/qip";
import {
  NQS_QUALITY_AREAS,
  NQS_TOTAL_ELEMENTS,
} from "@/lib/constants/nqs-elements";

// ============================================================
// SERVICE PHILOSOPHY
// ============================================================

export async function getCurrentPhilosophy(): Promise<
  ActionResponse<ServicePhilosophy | null>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("service_philosophies")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as ServicePhilosophy | null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function publishPhilosophy(
  input: PublishPhilosophyInput,
): Promise<ActionResponse<ServicePhilosophy>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = publishPhilosophySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Get current max version
    const { data: latest } = await supabase
      .from("service_philosophies")
      .select("version")
      .eq("tenant_id", tenantId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latest?.version ?? 0) + 1;

    const { data, error } = await supabase
      .from("service_philosophies")
      .insert({
        tenant_id: tenantId,
        content: parsed.data.content,
        version: nextVersion,
        published_at: new Date().toISOString(),
        published_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.SERVICE_PHILOSOPHY_PUBLISHED,
      entityType: "service_philosophy",
      entityId: data.id,
      metadata: { version: nextVersion },
    });

    return success(data as ServicePhilosophy);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getPhilosophyVersionHistory(): Promise<
  ActionResponse<ServicePhilosophy[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("service_philosophies")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("version", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as ServicePhilosophy[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ELEMENT ASSESSMENTS
// ============================================================

export async function getAllAssessments(): Promise<
  ActionResponse<QipElementAssessment[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("qip_element_assessments")
      .select("*")
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as QipElementAssessment[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function upsertAssessment(
  input: UpsertAssessmentInput,
): Promise<ActionResponse<QipElementAssessment>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = upsertAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("qip_element_assessments")
      .upsert(
        {
          tenant_id: tenantId,
          nqs_element_id: parsed.data.nqs_element_id,
          rating: parsed.data.rating,
          strengths: parsed.data.strengths,
          assessed_at: new Date().toISOString(),
          assessed_by: context.user.id,
        },
        { onConflict: "tenant_id,nqs_element_id" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.QIP_ASSESSMENT_UPDATED,
      entityType: "qip_element_assessment",
      entityId: data.id,
      metadata: {
        nqs_element_id: parsed.data.nqs_element_id,
        rating: parsed.data.rating,
      },
    });

    return success(data as QipElementAssessment);
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

export interface GoalFilters {
  nqs_element_id?: string;
  status?: QipGoalStatus;
  quality_area?: number;
}

export async function getGoals(
  filters?: GoalFilters,
): Promise<ActionResponse<QipGoal[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("qip_goals")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters?.nqs_element_id) {
      query = query.eq("nqs_element_id", filters.nqs_element_id);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.quality_area) {
      // Filter by QA prefix: QA1 elements start with "1."
      query = query.like("nqs_element_id", `${filters.quality_area}.%`);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as QipGoal[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createGoal(
  input: CreateGoalInput,
): Promise<ActionResponse<QipGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const parsed = createGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("qip_goals")
      .insert({
        tenant_id: context.tenant.id,
        nqs_element_id: parsed.data.nqs_element_id,
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
      action: AuditActions.QIP_GOAL_CREATED,
      entityType: "qip_goal",
      entityId: data.id,
      metadata: {
        nqs_element_id: parsed.data.nqs_element_id,
        description: parsed.data.description,
      },
    });

    return success(data as QipGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateGoal(
  input: UpdateGoalInput,
): Promise<ActionResponse<QipGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const parsed = updateGoalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { id, ...updates } = parsed.data;

    // Remove undefined fields - only send explicitly set values
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
      .from("qip_goals")
      .update(cleanUpdates)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.QIP_GOAL_UPDATED,
      entityType: "qip_goal",
      entityId: id,
      metadata: { updates: cleanUpdates },
    });

    return success(data as QipGoal);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function markGoalAchieved(
  goalId: string,
): Promise<ActionResponse<QipGoal>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("qip_goals")
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
      action: AuditActions.QIP_GOAL_ACHIEVED,
      entityType: "qip_goal",
      entityId: goalId,
    });

    return success(data as QipGoal);
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
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("qip_goals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", goalId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.QIP_GOAL_UPDATED,
      entityType: "qip_goal",
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
// EVIDENCE
// ============================================================

export async function getEvidence(params: {
  nqs_element_id?: string;
  qip_goal_id?: string;
}): Promise<ActionResponse<QipEvidence[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("qip_evidence")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false });

    if (params.nqs_element_id) {
      query = query.eq("nqs_element_id", params.nqs_element_id);
    }
    if (params.qip_goal_id) {
      query = query.eq("qip_goal_id", params.qip_goal_id);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as QipEvidence[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function attachEvidence(
  input: AttachEvidenceInput,
): Promise<ActionResponse<QipEvidence>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const parsed = attachEvidenceSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("qip_evidence")
      .insert({
        tenant_id: context.tenant.id,
        nqs_element_id: parsed.data.nqs_element_id,
        qip_goal_id: parsed.data.qip_goal_id,
        evidence_type: parsed.data.evidence_type,
        evidence_id: parsed.data.evidence_id,
        title: parsed.data.title,
        notes: parsed.data.notes,
        attached_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.QIP_EVIDENCE_ATTACHED,
      entityType: "qip_evidence",
      entityId: data.id,
      metadata: {
        nqs_element_id: parsed.data.nqs_element_id,
        evidence_type: parsed.data.evidence_type,
      },
    });

    return success(data as QipEvidence);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function removeEvidence(
  evidenceId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("qip_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.QIP_EVIDENCE_REMOVED,
      entityType: "qip_evidence",
      entityId: evidenceId,
    });

    return success({ id: evidenceId });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD SUMMARY
// ============================================================

export interface QipDashboardSummary {
  quality_areas: Array<{
    qa_number: number;
    qa_name: string;
    total_elements: number;
    assessed_count: number;
    working_towards_count: number;
    meeting_count: number;
    exceeding_count: number;
    goal_count: number;
    active_goal_count: number;
    evidence_count: number;
  }>;
  overall: {
    total_elements: number;
    assessed_count: number;
    completion_percentage: number;
    goals_total: number;
    goals_achieved: number;
    goals_in_progress: number;
    evidence_total: number;
  };
  philosophy: {
    exists: boolean;
    last_published_at: string | null;
    version: number | null;
  };
  urgent_items: Array<{
    type: "unassessed_qa" | "overdue_goal" | "missing_philosophy";
    message: string;
    qa_number?: number;
    goal_id?: string;
  }>;
}

export async function getQipDashboardSummary(): Promise<
  ActionResponse<QipDashboardSummary>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch all data in parallel
    const [assessmentsRes, goalsRes, evidenceRes, philosophyRes] =
      await Promise.all([
        supabase
          .from("qip_element_assessments")
          .select("nqs_element_id, rating")
          .eq("tenant_id", tenantId),
        supabase
          .from("qip_goals")
          .select("id, nqs_element_id, status, due_date")
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
        supabase
          .from("qip_evidence")
          .select("nqs_element_id")
          .eq("tenant_id", tenantId),
        supabase
          .from("service_philosophies")
          .select("version, published_at")
          .eq("tenant_id", tenantId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const assessments = (assessmentsRes.data ?? []) as Array<{
      nqs_element_id: string;
      rating: QipRating;
    }>;
    const goals = (goalsRes.data ?? []) as Array<{
      id: string;
      nqs_element_id: string;
      status: QipGoalStatus;
      due_date: string | null;
    }>;
    const evidence = (evidenceRes.data ?? []) as Array<{
      nqs_element_id: string | null;
    }>;
    const philosophy = philosophyRes.data as {
      version: number;
      published_at: string;
    } | null;

    // Build assessment map by element
    const assessmentMap = new Map<string, QipRating>();
    for (const a of assessments) {
      assessmentMap.set(a.nqs_element_id, a.rating);
    }

    // Build per-QA stats
    const today = new Date().toISOString().split("T")[0];
    const urgent: QipDashboardSummary["urgent_items"] = [];
    let totalAssessed = 0;
    let totalGoals = 0;
    let totalGoalsAchieved = 0;
    let totalGoalsInProgress = 0;
    let totalEvidence = evidence.length;

    const qaStats = NQS_QUALITY_AREAS.map((qa) => {
      const elementIds = qa.standards.flatMap((s) =>
        s.elements.map((e) => e.id),
      );
      const totalElements = elementIds.length;

      let assessed = 0;
      let workingTowards = 0;
      let meeting = 0;
      let exceeding = 0;

      for (const elId of elementIds) {
        const rating = assessmentMap.get(elId);
        if (rating) {
          assessed++;
          if (rating === "working_towards") workingTowards++;
          else if (rating === "meeting") meeting++;
          else if (rating === "exceeding") exceeding++;
        }
      }

      const qaGoals = goals.filter((g) =>
        elementIds.includes(g.nqs_element_id),
      );
      const activeGoals = qaGoals.filter((g) => g.status !== "achieved");

      const qaEvidence = evidence.filter(
        (e) => e.nqs_element_id && elementIds.includes(e.nqs_element_id),
      );

      totalAssessed += assessed;
      totalGoals += qaGoals.length;
      totalGoalsAchieved += qaGoals.filter(
        (g) => g.status === "achieved",
      ).length;
      totalGoalsInProgress += qaGoals.filter(
        (g) => g.status === "in_progress",
      ).length;

      // Flag QAs with zero assessments
      if (assessed === 0) {
        urgent.push({
          type: "unassessed_qa",
          message: `QA${qa.id}: ${qa.name} has no assessments`,
          qa_number: qa.id,
        });
      }

      return {
        qa_number: qa.id,
        qa_name: qa.name,
        total_elements: totalElements,
        assessed_count: assessed,
        working_towards_count: workingTowards,
        meeting_count: meeting,
        exceeding_count: exceeding,
        goal_count: qaGoals.length,
        active_goal_count: activeGoals.length,
        evidence_count: qaEvidence.length,
      };
    });

    // Flag overdue goals
    for (const goal of goals) {
      if (
        goal.status !== "achieved" &&
        goal.due_date &&
        goal.due_date < today
      ) {
        urgent.push({
          type: "overdue_goal",
          message: `Overdue goal in ${goal.nqs_element_id}`,
          goal_id: goal.id,
        });
      }
    }

    // Flag missing philosophy
    if (!philosophy) {
      urgent.push({
        type: "missing_philosophy",
        message: "Service philosophy has not been published",
      });
    }

    return success({
      quality_areas: qaStats,
      overall: {
        total_elements: NQS_TOTAL_ELEMENTS,
        assessed_count: totalAssessed,
        completion_percentage:
          NQS_TOTAL_ELEMENTS > 0
            ? Math.round((totalAssessed / NQS_TOTAL_ELEMENTS) * 100)
            : 0,
        goals_total: totalGoals,
        goals_achieved: totalGoalsAchieved,
        goals_in_progress: totalGoalsInProgress,
        evidence_total: totalEvidence,
      },
      philosophy: {
        exists: !!philosophy,
        last_published_at: philosophy?.published_at ?? null,
        version: philosophy?.version ?? null,
      },
      urgent_items: urgent,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// HELPERS: Staff lookup for goal assignment
// ============================================================

export async function getStaffForGoalAssignment(): Promise<
  ActionResponse<
    Array<{ id: string; first_name: string | null; last_name: string | null }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
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
        return {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
        };
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
// HELPERS: Evidence source search
// ============================================================

export interface EvidenceSearchResult {
  id: string;
  title: string;
  type: QipEvidenceType;
  date: string;
  preview?: string;
}

export async function searchEvidenceSources(params: {
  query: string;
  type: QipEvidenceType;
}): Promise<ActionResponse<EvidenceSearchResult[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_QIP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const q = `%${params.query}%`;

    let results: EvidenceSearchResult[] = [];

    switch (params.type) {
      case "observation": {
        const { data } = await supabase
          .from("observations")
          .select("id, content, created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "published")
          .ilike("content", q)
          .order("created_at", { ascending: false })
          .limit(20);

        results = (data ?? []).map((o) => ({
          id: o.id,
          title:
            (o.content?.substring(0, 80) ?? "Observation") +
            (o.content && o.content.length > 80 ? "..." : ""),
          type: "observation" as const,
          date: o.created_at,
          preview: o.content?.substring(0, 200) ?? undefined,
        }));
        break;
      }
      case "incident": {
        const { data } = await supabase
          .from("incidents")
          .select("id, description, incident_type, occurred_at")
          .eq("tenant_id", tenantId)
          .ilike("description", q)
          .order("occurred_at", { ascending: false })
          .limit(20);

        results = (data ?? []).map((i) => ({
          id: i.id,
          title: `${i.incident_type}: ${i.description?.substring(0, 60) ?? ""}`,
          type: "incident" as const,
          date: i.occurred_at,
          preview: i.description?.substring(0, 200) ?? undefined,
        }));
        break;
      }
      case "policy": {
        const { data } = await supabase
          .from("policies")
          .select("id, title, category, effective_date")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .ilike("title", q)
          .order("effective_date", { ascending: false })
          .limit(20);

        results = (data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          type: "policy" as const,
          date: p.effective_date,
          preview: p.category ?? undefined,
        }));
        break;
      }
      default:
        // For photo, document, other - no search, manual entry
        break;
    }

    return success(results);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PDF EXPORT
// ============================================================

export async function exportQipToPdf(): Promise<
  ActionResponse<{
    download_url: string;
    filename: string;
    size_bytes: number;
  }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_QIP);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch all data in parallel
    const [assessmentsRes, goalsRes, evidenceRes, philosophyRes, tenantRes] =
      await Promise.all([
        supabase
          .from("qip_element_assessments")
          .select("*")
          .eq("tenant_id", tenantId),
        supabase
          .from("qip_goals")
          .select(
            "*, users!qip_goals_responsible_person_id_fkey(first_name, last_name)",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null),
        supabase.from("qip_evidence").select("*").eq("tenant_id", tenantId),
        supabase
          .from("service_philosophies")
          .select("content")
          .eq("tenant_id", tenantId)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("tenants").select("name").eq("id", tenantId).single(),
      ]);

    const assessments = assessmentsRes.data ?? [];
    const goals = goalsRes.data ?? [];
    const allEvidence = evidenceRes.data ?? [];
    const philosophy = philosophyRes.data?.content ?? null;
    const schoolName = tenantRes.data?.name ?? "School";

    // Build assessment + goals + evidence maps
    const assessmentMap = new Map(
      assessments.map(
        (a: {
          nqs_element_id: string;
          rating: string | null;
          strengths: string | null;
        }) => [a.nqs_element_id, a],
      ),
    );
    const goalsByElement = new Map<string, typeof goals>();
    for (const g of goals) {
      const existing = goalsByElement.get(g.nqs_element_id) ?? [];
      existing.push(g);
      goalsByElement.set(g.nqs_element_id, existing);
    }
    const evidenceByElement = new Map<string, typeof allEvidence>();
    for (const e of allEvidence) {
      if (e.nqs_element_id) {
        const existing = evidenceByElement.get(e.nqs_element_id) ?? [];
        existing.push(e);
        evidenceByElement.set(e.nqs_element_id, existing);
      }
    }

    // Assemble PDF content
    const { QipDocument } = await import("@/lib/integrations/pdf/qip-renderer");
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const React = (await import("react")).default;

    const pdfContent = {
      school_name: schoolName,
      export_date: new Date().toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      philosophy,
      quality_areas: NQS_QUALITY_AREAS.map((qa) => ({
        number: qa.id,
        name: qa.name,
        standards: qa.standards.map((s) => ({
          id: s.id,
          name: s.name,
          elements: s.elements.map((el) => {
            const assessment = assessmentMap.get(el.id);
            const elGoals = goalsByElement.get(el.id) ?? [];
            const elEvidence = evidenceByElement.get(el.id) ?? [];

            return {
              id: el.id,
              name: el.name,
              rating:
                ((assessment as { rating: string | null } | undefined)
                  ?.rating as
                  | "working_towards"
                  | "meeting"
                  | "exceeding"
                  | null) ?? null,
              strengths:
                (assessment as { strengths: string | null } | undefined)
                  ?.strengths ?? null,
              goals: elGoals.map((g: Record<string, unknown>) => {
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
                  success_measures:
                    (g.success_measures as string | null) ?? null,
                  status: g.status as string,
                };
              }),
              evidence: elEvidence.map(
                (e: { evidence_type: string; title: string }) => ({
                  type: e.evidence_type,
                  title: e.title,
                }),
              ),
            };
          }),
        })),
      })),
    };

    // Render PDF
    const doc = React.createElement(QipDocument, {
      content: pdfContent,
    }) as unknown as React.ReactElement;
    const bufferLike = await renderToBuffer(doc as never);
    const buffer = Buffer.isBuffer(bufferLike)
      ? bufferLike
      : Buffer.from(bufferLike as ArrayBuffer);

    // Upload to storage
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_QIP_${dateStr}.pdf`;
    const storagePath = `qip/${tenantId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return failure(
        `Upload failed: ${uploadError.message}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Get signed URL (valid 1 hour)
    const { data: urlData } = await supabase.storage
      .from("reports")
      .createSignedUrl(storagePath, 3600);

    if (!urlData?.signedUrl) {
      return failure(
        "Failed to generate download URL",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.QIP_EXPORTED,
      entityType: "qip_export",
      entityId: storagePath,
      metadata: { filename, size_bytes: buffer.length },
    });

    return success({
      download_url: urlData.signedUrl,
      filename,
      size_bytes: buffer.length,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
