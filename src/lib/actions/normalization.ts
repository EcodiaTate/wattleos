"use server";

// src/lib/actions/normalization.ts
//
// ============================================================
// Normalization Indicators - Server Actions
// ============================================================
// Montessori normalization tracking: structured periodic
// observations of five indicators (concentration, independence,
// order, coordination, social harmony) with trend analysis
// and per-student goal setting.
//
// Average rating classification:
//   1.0–1.99  → Emerging
//   2.0–3.49  → Developing
//   3.5–4.49  → Normalized
//   4.5–5.0   → Flourishing
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  NormalizationObservation,
  NormalizationObservationWithDetails,
  NormalizationGoal,
  NormalizationGoalWithDetails,
  NormalizationDashboardData,
  StudentNormalizationSummary,
  StudentNormalizationDetail,
  NormalizationTrendPoint,
  NormalizationIndicator,
  WorkCycleEngagement,
} from "@/types/domain";
import {
  CreateNormalizationObservationSchema,
  UpdateNormalizationObservationSchema,
  ListNormalizationObservationsSchema,
  CreateNormalizationGoalSchema,
  UpdateNormalizationGoalSchema,
  ListNormalizationGoalsSchema,
} from "@/lib/validations/normalization";
import type {
  CreateNormalizationObservationInput,
  UpdateNormalizationObservationInput,
  ListNormalizationObservationsInput,
  CreateNormalizationGoalInput,
  UpdateNormalizationGoalInput,
  ListNormalizationGoalsInput,
} from "@/lib/validations/normalization";

// ============================================================
// Internal helpers
// ============================================================

function calcAvgRating(obs: NormalizationObservation): number {
  return (
    (obs.concentration_rating +
      obs.independence_rating +
      obs.order_rating +
      obs.coordination_rating +
      obs.social_harmony_rating) /
    5
  );
}

function determineTrend(
  observations: NormalizationObservation[],
): "improving" | "stable" | "declining" | "insufficient_data" {
  if (observations.length < 3) return "insufficient_data";
  // Compare average of last 3 vs previous 3
  const sorted = [...observations].sort(
    (a, b) =>
      new Date(b.observation_date).getTime() -
      new Date(a.observation_date).getTime(),
  );
  const recent = sorted.slice(0, 3);
  const previous = sorted.slice(3, 6);
  if (previous.length < 2) return "insufficient_data";

  const recentAvg =
    recent.reduce((s, o) => s + calcAvgRating(o), 0) / recent.length;
  const previousAvg =
    previous.reduce((s, o) => s + calcAvgRating(o), 0) / previous.length;
  const diff = recentAvg - previousAvg;

  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "declining";
  return "stable";
}

// ============================================================
// Dashboard
// ============================================================

export async function getNormalizationDashboard(
  classId?: string | null,
): Promise<ActionResponse<NormalizationDashboardData>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_NORMALIZATION);
    const db = await createSupabaseServerClient();

    // Get students in class (or all enrolled students)
    let studentQuery = db
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .eq("tenant_id", ctx.tenant.id)
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null)
      .order("last_name");

    if (classId) {
      const { data: enrollments } = await db
        .from("enrollments")
        .select("student_id")
        .eq("tenant_id", ctx.tenant.id)
        .eq("class_id", classId)
        .eq("status", "active");
      const studentIds = (enrollments ?? []).map((e) => e.student_id);
      if (studentIds.length > 0) {
        studentQuery = studentQuery.in("id", studentIds);
      } else {
        return success({
          students: [],
          class_averages: {
            concentration: 0,
            independence: 0,
            order: 0,
            coordination: 0,
            social_harmony: 0,
          },
          total_observations_this_term: 0,
          students_with_observations: 0,
          students_without_observations: 0,
          engagement_distribution: {
            deep: 0,
            moderate: 0,
            surface: 0,
            disengaged: 0,
          },
          joyful_count: 0,
        });
      }
    }

    const { data: students, error: studentsErr } = await studentQuery;
    if (studentsErr) return failure(studentsErr.message, "DB_ERROR");

    // Get all observations for these students (last 90 days for dashboard)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoff = ninetyDaysAgo.toISOString().split("T")[0];

    const studentIds = (students ?? []).map((s) => s.id);
    const { data: observations, error: obsErr } = await db
      .from("normalization_observations")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .in(
        "student_id",
        studentIds.length > 0
          ? studentIds
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .gte("observation_date", cutoff)
      .is("deleted_at", null)
      .order("observation_date", { ascending: false });

    if (obsErr) return failure(obsErr.message, "DB_ERROR");

    // Get active goals count per student
    const { data: goals } = await db
      .from("normalization_goals")
      .select("student_id")
      .eq("tenant_id", ctx.tenant.id)
      .in(
        "student_id",
        studentIds.length > 0
          ? studentIds
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .eq("status", "active")
      .is("deleted_at", null);

    const goalCountMap = new Map<string, number>();
    for (const g of goals ?? []) {
      goalCountMap.set(g.student_id, (goalCountMap.get(g.student_id) ?? 0) + 1);
    }

    // Build per-student summaries
    const obsByStudent = new Map<string, NormalizationObservation[]>();
    for (const obs of (observations ?? []) as NormalizationObservation[]) {
      const arr = obsByStudent.get(obs.student_id) ?? [];
      arr.push(obs);
      obsByStudent.set(obs.student_id, arr);
    }

    const summaries: StudentNormalizationSummary[] = (students ?? []).map(
      (s) => {
        const studentObs = obsByStudent.get(s.id) ?? [];
        const latest = studentObs[0] ?? null;
        const avgRating = latest ? calcAvgRating(latest) : null;

        return {
          student_id: s.id,
          student_first_name: s.first_name,
          student_last_name: s.last_name,
          student_preferred_name: s.preferred_name,
          student_photo_url: s.photo_url,
          latest_observation: latest,
          avg_rating: avgRating,
          observation_count: studentObs.length,
          active_goals_count: goalCountMap.get(s.id) ?? 0,
          trend: determineTrend(studentObs),
        };
      },
    );

    // Class-level indicator averages
    const allObs = (observations as NormalizationObservation[]) ?? [];
    const indicators: NormalizationIndicator[] = [
      "concentration",
      "independence",
      "order",
      "coordination",
      "social_harmony",
    ];
    const classAverages: Record<NormalizationIndicator, number> = {
      concentration: 0,
      independence: 0,
      order: 0,
      coordination: 0,
      social_harmony: 0,
    };
    if (allObs.length > 0) {
      for (const ind of indicators) {
        const key = `${ind}_rating` as keyof NormalizationObservation;
        classAverages[ind] =
          allObs.reduce((s, o) => s + (o[key] as number), 0) / allObs.length;
      }
    }

    // Engagement distribution
    const engDist: Record<WorkCycleEngagement, number> = {
      deep: 0,
      moderate: 0,
      surface: 0,
      disengaged: 0,
    };
    let joyfulCount = 0;
    for (const o of allObs) {
      engDist[o.work_cycle_engagement] =
        (engDist[o.work_cycle_engagement] ?? 0) + 1;
      if (o.joyful_engagement) joyfulCount++;
    }

    const studentsWithObs = new Set(allObs.map((o) => o.student_id));

    return success({
      students: summaries,
      class_averages: classAverages,
      total_observations_this_term: allObs.length,
      students_with_observations: studentsWithObs.size,
      students_without_observations:
        (students ?? []).length - studentsWithObs.size,
      engagement_distribution: engDist,
      joyful_count: joyfulCount,
    });
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Student Detail
// ============================================================

export async function getStudentNormalizationDetail(
  studentId: string,
): Promise<ActionResponse<StudentNormalizationDetail>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_NORMALIZATION);
    const db = await createSupabaseServerClient();

    // Student info
    const { data: student, error: studentErr } = await db
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .eq("id", studentId)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (studentErr || !student)
      return failure("Student not found", "NOT_FOUND");

    // Observations with observer info
    const { data: rawObs, error: obsErr } = await db
      .from("normalization_observations")
      .select("*, observer:auth_users_view(id, first_name, last_name)")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("observation_date", { ascending: false })
      .limit(50);

    if (obsErr) return failure(obsErr.message, "DB_ERROR");

    const observations: NormalizationObservationWithDetails[] = (
      rawObs ?? []
    ).map((o) => {
      const obs = o as Record<string, unknown>;
      const observer = Array.isArray(obs.observer)
        ? obs.observer[0]
        : obs.observer;
      const base = obs as unknown as NormalizationObservation;
      return {
        ...base,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          preferred_name: student.preferred_name,
          photo_url: student.photo_url,
        },
        observer: observer as {
          id: string;
          first_name: string;
          last_name: string;
        },
        class_name: null,
        avg_rating: calcAvgRating(base),
      };
    });

    // Goals with creator info
    const { data: rawGoals, error: goalsErr } = await db
      .from("normalization_goals")
      .select(
        "*, created_by_user:auth_users_view!created_by(id, first_name, last_name)",
      )
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (goalsErr) return failure(goalsErr.message, "DB_ERROR");

    const goals: NormalizationGoalWithDetails[] = (rawGoals ?? []).map((g) => {
      const goal = g as Record<string, unknown>;
      const createdByUser = Array.isArray(goal.created_by_user)
        ? goal.created_by_user[0]
        : goal.created_by_user;
      return {
        ...(goal as unknown as NormalizationGoal),
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          preferred_name: student.preferred_name,
        },
        created_by_user: createdByUser as {
          id: string;
          first_name: string;
          last_name: string;
        },
      };
    });

    // Build trend data
    const trend: NormalizationTrendPoint[] = [...observations]
      .reverse()
      .map((o) => ({
        date: o.observation_date,
        concentration: o.concentration_rating,
        independence: o.independence_rating,
        order: o.order_rating,
        coordination: o.coordination_rating,
        social_harmony: o.social_harmony_rating,
        avg: o.avg_rating,
      }));

    return success({
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        preferred_name: student.preferred_name,
        photo_url: student.photo_url,
      },
      observations,
      goals,
      trend,
      latest_avg: observations[0]?.avg_rating ?? null,
      observation_count: observations.length,
    });
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// List Observations (with filters)
// ============================================================

export async function listNormalizationObservations(
  input: ListNormalizationObservationsInput,
): Promise<ActionResponse<NormalizationObservationWithDetails[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = ListNormalizationObservationsSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    const filters = parsed.data;

    let query = db
      .from("normalization_observations")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url), observer:auth_users_view(id, first_name, last_name)",
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("observation_date", { ascending: false })
      .limit(100);

    if (filters.student_id) query = query.eq("student_id", filters.student_id);
    if (filters.class_id) query = query.eq("class_id", filters.class_id);
    if (filters.observer_id)
      query = query.eq("observer_id", filters.observer_id);
    if (filters.date_from)
      query = query.gte("observation_date", filters.date_from);
    if (filters.date_to) query = query.lte("observation_date", filters.date_to);

    const { data, error } = await query;
    if (error) return failure(error.message, "DB_ERROR");

    const results: NormalizationObservationWithDetails[] = (data ?? []).map(
      (row) => {
        const r = row as Record<string, unknown>;
        const studentArr = Array.isArray(r.student) ? r.student[0] : r.student;
        const observerArr = Array.isArray(r.observer)
          ? r.observer[0]
          : r.observer;
        const base = r as unknown as NormalizationObservation;
        return {
          ...base,
          student: studentArr as NormalizationObservationWithDetails["student"],
          observer:
            observerArr as NormalizationObservationWithDetails["observer"],
          class_name: null,
          avg_rating: calcAvgRating(base),
        };
      },
    );

    return success(results);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Create Observation
// ============================================================

export async function createNormalizationObservation(
  input: CreateNormalizationObservationInput,
): Promise<ActionResponse<NormalizationObservation>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = CreateNormalizationObservationSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("normalization_observations")
      .insert({
        tenant_id: ctx.tenant.id,
        observer_id: ctx.user.id,
        ...parsed.data,
        class_id: parsed.data.class_id || null,
        concentration_duration_minutes:
          parsed.data.concentration_duration_minutes || null,
        concentration_notes: parsed.data.concentration_notes || null,
        independence_notes: parsed.data.independence_notes || null,
        order_notes: parsed.data.order_notes || null,
        coordination_notes: parsed.data.coordination_notes || null,
        social_harmony_notes: parsed.data.social_harmony_notes || null,
        overall_notes: parsed.data.overall_notes || null,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.NORMALIZATION_OBSERVATION_CREATED,
      entityType: "normalization_observation",
      entityId: (data as { id: string }).id,
      metadata: {
        student_id: parsed.data.student_id,
        avg_rating: calcAvgRating(data as NormalizationObservation),
      },
    });

    return success(data as NormalizationObservation);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Update Observation
// ============================================================

export async function updateNormalizationObservation(
  id: string,
  input: UpdateNormalizationObservationInput,
): Promise<ActionResponse<NormalizationObservation>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = UpdateNormalizationObservationSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const updateData: Record<string, unknown> = { ...parsed.data };
    // Normalize nullish fields
    if ("class_id" in updateData)
      updateData.class_id = updateData.class_id || null;
    if ("concentration_duration_minutes" in updateData)
      updateData.concentration_duration_minutes =
        updateData.concentration_duration_minutes || null;
    if ("concentration_notes" in updateData)
      updateData.concentration_notes = updateData.concentration_notes || null;
    if ("independence_notes" in updateData)
      updateData.independence_notes = updateData.independence_notes || null;
    if ("order_notes" in updateData)
      updateData.order_notes = updateData.order_notes || null;
    if ("coordination_notes" in updateData)
      updateData.coordination_notes = updateData.coordination_notes || null;
    if ("social_harmony_notes" in updateData)
      updateData.social_harmony_notes = updateData.social_harmony_notes || null;
    if ("overall_notes" in updateData)
      updateData.overall_notes = updateData.overall_notes || null;

    const { data, error } = await db
      .from("normalization_observations")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.NORMALIZATION_OBSERVATION_UPDATED,
      entityType: "normalization_observation",
      entityId: id,
      metadata: parsed.data,
    });

    return success(data as NormalizationObservation);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Delete Observation (soft)
// ============================================================

export async function deleteNormalizationObservation(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("normalization_observations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.NORMALIZATION_OBSERVATION_DELETED,
      entityType: "normalization_observation",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Create Goal
// ============================================================

export async function createNormalizationGoal(
  input: CreateNormalizationGoalInput,
): Promise<ActionResponse<NormalizationGoal>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = CreateNormalizationGoalSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("normalization_goals")
      .insert({
        tenant_id: ctx.tenant.id,
        created_by: ctx.user.id,
        ...parsed.data,
        target_date: parsed.data.target_date || null,
        progress_notes: parsed.data.progress_notes || null,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.NORMALIZATION_GOAL_CREATED,
      entityType: "normalization_goal",
      entityId: (data as { id: string }).id,
      metadata: {
        student_id: parsed.data.student_id,
        indicator: parsed.data.indicator,
        target_rating: parsed.data.target_rating,
      },
    });

    return success(data as NormalizationGoal);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Update Goal
// ============================================================

export async function updateNormalizationGoal(
  id: string,
  input: UpdateNormalizationGoalInput,
): Promise<ActionResponse<NormalizationGoal>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = UpdateNormalizationGoalSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const updateData: Record<string, unknown> = { ...parsed.data };
    if ("target_date" in updateData)
      updateData.target_date = updateData.target_date || null;
    if ("progress_notes" in updateData)
      updateData.progress_notes = updateData.progress_notes || null;

    // If status is being set to achieved, record the timestamp
    if (parsed.data.status === "achieved") {
      updateData.achieved_at = new Date().toISOString();
    }

    const { data, error } = await db
      .from("normalization_goals")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    const auditAction =
      parsed.data.status === "achieved"
        ? AuditActions.NORMALIZATION_GOAL_ACHIEVED
        : AuditActions.NORMALIZATION_GOAL_UPDATED;

    await logAudit({
      context: ctx,
      action: auditAction,
      entityType: "normalization_goal",
      entityId: id,
      metadata: parsed.data,
    });

    return success(data as NormalizationGoal);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Delete Goal (soft)
// ============================================================

export async function deleteNormalizationGoal(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const { error } = await db
      .from("normalization_goals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.NORMALIZATION_GOAL_DELETED,
      entityType: "normalization_goal",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// List Goals (with filters)
// ============================================================

export async function listNormalizationGoals(
  input: ListNormalizationGoalsInput,
): Promise<ActionResponse<NormalizationGoalWithDetails[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_NORMALIZATION);
    const db = await createSupabaseServerClient();

    const parsed = ListNormalizationGoalsSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    const filters = parsed.data;

    let query = db
      .from("normalization_goals")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name), created_by_user:auth_users_view!created_by(id, first_name, last_name)",
      )
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filters.student_id) query = query.eq("student_id", filters.student_id);
    if (filters.indicator) query = query.eq("indicator", filters.indicator);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query;
    if (error) return failure(error.message, "DB_ERROR");

    const results: NormalizationGoalWithDetails[] = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const studentArr = Array.isArray(r.student) ? r.student[0] : r.student;
      const createdByArr = Array.isArray(r.created_by_user)
        ? r.created_by_user[0]
        : r.created_by_user;
      return {
        ...(r as unknown as NormalizationGoal),
        student: studentArr as NormalizationGoalWithDetails["student"],
        created_by_user:
          createdByArr as NormalizationGoalWithDetails["created_by_user"],
      };
    });

    return success(results);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}
