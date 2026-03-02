"use server";

// src/lib/actions/three-period-lessons.ts
// ============================================================
// WattleOS V2 - Three-Period Lesson & Sensitive Period Actions
// ============================================================
// Three-Period Lesson (3PL): The foundational Montessori
// instructional technique for introducing concepts.
//   Period 1 - Introduction/Naming  ("This is...")
//   Period 2 - Association/Recognition ("Show me...")
//   Period 3 - Recall/Naming ("What is this?")
//
// Progression gating is enforced at:
//   1. This action layer (explicit check before update)
//   2. DB constraint (period_2_requires_period_1, etc.)
//
// Sensitive Periods: Records developmental windows of heightened
// receptivity observed in a child, with optional material links.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  CreateSensitivePeriodSchema,
  CreateThreePeriodLessonSchema,
  ListThreePeriodLessonsSchema,
  UpdateSensitivePeriodSchema,
  UpdateThreePeriodLessonSchema,
  type CreateSensitivePeriodInput,
  type CreateThreePeriodLessonInput,
  type ListThreePeriodLessonsInput,
  type UpdateSensitivePeriodInput,
  type UpdateThreePeriodLessonInput,
} from "@/lib/validations/three-period-lessons";
import { failure, success } from "@/types/api";
import type {
  ActionResponse,
  MaterialThreePeriodProgress,
  MontessoriArea,
  MontessoriMaterial,
  SensitivePeriodMaterial,
  SensitivePeriodMaterialWithDetails,
  StudentSensitivePeriod,
  StudentSensitivePeriodFull,
  StudentSensitivePeriodWithDetails,
  ThreePeriodDashboardData,
  ThreePeriodLesson,
  ThreePeriodLessonWithDetails,
  User,
} from "@/types/domain";

// ============================================================
// THREE-PERIOD LESSONS
// ============================================================

// ── CREATE ───────────────────────────────────────────────────

export async function createThreePeriodLesson(
  input: CreateThreePeriodLessonInput,
): Promise<ActionResponse<ThreePeriodLesson>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = CreateThreePeriodLessonSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    // Default period statuses: period_1 is always provided; 2 and 3 default to not_started
    const period2Status = data.period_2_status ?? "not_started";
    const period3Status = data.period_3_status ?? "not_started";

    // Progression gate
    if (
      period2Status !== "not_started" &&
      data.period_1_status === "not_started"
    ) {
      return failure(
        "Period 2 cannot be recorded until Period 1 is completed.",
        "VALIDATION_ERROR",
      );
    }
    if (period3Status !== "not_started" && period2Status === "not_started") {
      return failure(
        "Period 3 cannot be recorded until Period 2 is completed.",
        "VALIDATION_ERROR",
      );
    }

    const now = new Date().toISOString();

    const { data: lesson, error } = await supabase
      .from("three_period_lessons")
      .insert({
        tenant_id: context.tenant.id,
        student_id: data.student_id,
        material_id: data.material_id,
        educator_id: context.user.id,
        lesson_date: data.lesson_date,
        period_1_status: data.period_1_status,
        period_1_notes: data.period_1_notes ?? null,
        period_1_completed_at:
          data.period_1_status === "completed" ? now : null,
        period_2_status: period2Status,
        period_2_notes: data.period_2_notes ?? null,
        period_2_completed_at: period2Status === "completed" ? now : null,
        period_3_status: period3Status,
        period_3_notes: data.period_3_notes ?? null,
        period_3_completed_at: period3Status === "completed" ? now : null,
        session_notes: data.session_notes ?? null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DATABASE_ERROR");
    }

    const isComplete = period3Status === "completed";

    await logAudit({
      context,
      action: isComplete
        ? AuditActions.THREE_PERIOD_LESSON_COMPLETE
        : AuditActions.THREE_PERIOD_LESSON_CREATED,
      entityType: "three_period_lesson",
      entityId: lesson.id,
      metadata: {
        student_id: data.student_id,
        material_id: data.material_id,
        lesson_date: data.lesson_date,
        period_1_status: data.period_1_status,
        period_2_status: period2Status,
        period_3_status: period3Status,
      },
    });

    return success(lesson as ThreePeriodLesson);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── UPDATE ───────────────────────────────────────────────────

export async function updateThreePeriodLesson(
  id: string,
  input: UpdateThreePeriodLessonInput,
): Promise<ActionResponse<ThreePeriodLesson>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = UpdateThreePeriodLessonSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    // Fetch current state for progression gating
    const { data: existing, error: fetchError } = await supabase
      .from("three_period_lessons")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Lesson not found.", "NOT_FOUND");
    }

    const next1 = data.period_1_status ?? existing.period_1_status;
    const next2 = data.period_2_status ?? existing.period_2_status;
    const next3 = data.period_3_status ?? existing.period_3_status;

    if (next2 !== "not_started" && next1 === "not_started") {
      return failure(
        "Period 2 cannot be recorded until Period 1 is completed.",
        "VALIDATION_ERROR",
      );
    }
    if (next3 !== "not_started" && next2 === "not_started") {
      return failure(
        "Period 3 cannot be recorded until Period 2 is completed.",
        "VALIDATION_ERROR",
      );
    }

    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { ...data };
    // Set completed_at timestamps when status moves to completed
    if (
      data.period_1_status === "completed" &&
      existing.period_1_status !== "completed"
    ) {
      updates.period_1_completed_at = now;
    }
    if (
      data.period_2_status === "completed" &&
      existing.period_2_status !== "completed"
    ) {
      updates.period_2_completed_at = now;
    }
    if (
      data.period_3_status === "completed" &&
      existing.period_3_status !== "completed"
    ) {
      updates.period_3_completed_at = now;
    }

    const { data: updated, error } = await supabase
      .from("three_period_lessons")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DATABASE_ERROR");
    }

    const wasJustCompleted =
      next3 === "completed" && existing.period_3_status !== "completed";

    await logAudit({
      context,
      action: wasJustCompleted
        ? AuditActions.THREE_PERIOD_LESSON_COMPLETE
        : data.period_2_status !== undefined ||
            data.period_3_status !== undefined
          ? AuditActions.THREE_PERIOD_LESSON_PERIOD_ADVANCED
          : AuditActions.THREE_PERIOD_LESSON_UPDATED,
      entityType: "three_period_lesson",
      entityId: id,
      metadata: {
        period_1_status: next1,
        period_2_status: next2,
        period_3_status: next3,
      },
    });

    return success(updated as ThreePeriodLesson);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── DELETE (soft) ────────────────────────────────────────────

export async function deleteThreePeriodLesson(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("three_period_lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context,
      action: AuditActions.THREE_PERIOD_LESSON_DELETED,
      entityType: "three_period_lesson",
      entityId: id,
    });

    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── LIST ─────────────────────────────────────────────────────

export async function listThreePeriodLessons(
  input: Partial<ListThreePeriodLessonsInput> = {},
): Promise<ActionResponse<ThreePeriodLessonWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = ListThreePeriodLessonsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const filters = parsed.data;

    let query = supabase
      .from("three_period_lessons")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        material:montessori_materials(id, name, area, age_level),
        educator:users(id, first_name, last_name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("lesson_date", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (filters.student_id) query = query.eq("student_id", filters.student_id);
    if (filters.material_id)
      query = query.eq("material_id", filters.material_id);
    if (filters.date_from) query = query.gte("lesson_date", filters.date_from);
    if (filters.date_to) query = query.lte("lesson_date", filters.date_to);

    const { data, error } = await query;
    if (error) return failure(error.message, "DATABASE_ERROR");

    return success((data ?? []) as unknown as ThreePeriodLessonWithDetails[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── STUDENT PROGRESS ─────────────────────────────────────────
// Returns one MaterialThreePeriodProgress entry per material
// this student has had at least one 3PL session on.

export async function getStudentThreePeriodProgress(
  studentId: string,
): Promise<ActionResponse<MaterialThreePeriodProgress[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("three_period_lessons")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        material:montessori_materials(id, name, area, age_level),
        educator:users(id, first_name, last_name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("lesson_date", { ascending: false });

    if (error) return failure(error.message, "DATABASE_ERROR");

    // Group by material and compute current period
    const byMaterial = new Map<string, MaterialThreePeriodProgress>();

    for (const row of data ?? []) {
      const materialId = row.material_id as string;
      const material = row.material as Pick<
        MontessoriMaterial,
        "id" | "name" | "area" | "age_level"
      >;

      if (!byMaterial.has(materialId)) {
        byMaterial.set(materialId, {
          material_id: materialId,
          material_name: material.name,
          area: material.area as MontessoriArea,
          age_level: material.age_level,
          lessons: [],
          current_period: 1,
          last_lesson_date: null,
        });
      }

      const entry = byMaterial.get(materialId)!;
      entry.lessons.push(row as unknown as ThreePeriodLessonWithDetails);

      // Track latest lesson date
      if (!entry.last_lesson_date || row.lesson_date > entry.last_lesson_date) {
        entry.last_lesson_date = row.lesson_date as string;
      }
    }

    // Compute current_period from the best status across all sessions
    for (const entry of byMaterial.values()) {
      const allLessons = entry.lessons;
      const best3 = allLessons.some((l) => l.period_3_status === "completed");
      const best2 = allLessons.some((l) => l.period_2_status === "completed");
      const best1 = allLessons.some((l) => l.period_1_status === "completed");

      if (best3) {
        entry.current_period = "complete";
      } else if (best2) {
        entry.current_period = 3;
      } else if (best1) {
        entry.current_period = 2;
      } else {
        entry.current_period = 1;
      }
    }

    return success(Array.from(byMaterial.values()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── DASHBOARD ────────────────────────────────────────────────

export async function getThreePeriodDashboard(): Promise<
  ActionResponse<ThreePeriodDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const [lessonsResult, sensitivePeriodResult] = await Promise.all([
      supabase
        .from("three_period_lessons")
        .select(
          "student_id, lesson_date, period_3_status, period_1_status, period_2_status, material:montessori_materials(area)",
        )
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null),
      supabase
        .from("student_sensitive_periods")
        .select("id")
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .is("observed_end_date", null),
    ]);

    if (lessonsResult.error)
      return failure(lessonsResult.error.message, "DATABASE_ERROR");

    const rows = lessonsResult.data ?? [];

    // Unique students
    const studentSet = new Set(rows.map((r) => r.student_id as string));

    // Lessons this week
    const lessonsThisWeek = rows.filter(
      (r) => (r.lesson_date as string) >= weekAgoStr,
    ).length;

    // Per-material progress (track best period per student+material)
    const materialKey = (row: { student_id: unknown; material_id?: unknown }) =>
      `${row.student_id}`;

    // Distinct student+material combos
    const progressMap = new Map<
      string,
      {
        complete: boolean;
        in_progress: boolean;
        needs_repeat: boolean;
        area: string;
      }
    >();

    for (const row of rows) {
      const mat = row.material as { area: string } | null;
      if (!mat) continue;
      // Use a composite key for student+material tracking
      // Since we don't have material_id in this select, group by what we have
    }

    // Re-query with material_id for accurate grouping
    const { data: detailRows, error: detailError } = await supabase
      .from("three_period_lessons")
      .select(
        "student_id, material_id, period_1_status, period_2_status, period_3_status, material:montessori_materials(area)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (detailError) return failure(detailError.message, "DATABASE_ERROR");

    for (const row of detailRows ?? []) {
      const key = `${row.student_id}:${row.material_id}`;
      const mat = row.material as { area: string } | null;
      const area = mat?.area ?? "unknown";

      const existing = progressMap.get(key);
      const isComplete = row.period_3_status === "completed";
      const hasP2 = row.period_2_status === "completed";
      const hasP1 = row.period_1_status === "completed";
      const needsRepeat =
        row.period_1_status === "needs_repeat" ||
        row.period_2_status === "needs_repeat" ||
        row.period_3_status === "needs_repeat";

      if (!existing || isComplete) {
        progressMap.set(key, {
          complete: isComplete,
          in_progress: !isComplete && (hasP1 || hasP2),
          needs_repeat: needsRepeat,
          area,
        });
      }
    }

    const areas: MontessoriArea[] = [
      "practical_life",
      "sensorial",
      "language",
      "mathematics",
      "cultural",
    ];
    const byArea = {} as Record<
      MontessoriArea,
      { in_progress: number; complete: number; needs_repeat: number }
    >;
    for (const a of areas) {
      byArea[a] = { in_progress: 0, complete: 0, needs_repeat: 0 };
    }

    let totalInProgress = 0;
    let totalComplete = 0;

    for (const v of progressMap.values()) {
      const area = v.area as MontessoriArea;
      if (!byArea[area]) continue;
      if (v.complete) {
        byArea[area].complete++;
        totalComplete++;
      } else if (v.in_progress) {
        byArea[area].in_progress++;
        totalInProgress++;
      }
      if (v.needs_repeat) byArea[area].needs_repeat++;
    }

    return success({
      total_students_with_lessons: studentSet.size,
      total_lessons: rows.length,
      lessons_this_week: lessonsThisWeek,
      materials_in_progress: totalInProgress,
      materials_complete: totalComplete,
      by_area: byArea,
      active_sensitive_periods: (sensitivePeriodResult.data ?? []).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ============================================================
// SENSITIVE PERIODS
// ============================================================

// ── UPSERT (create or update for the same student+period) ────

export async function upsertSensitivePeriod(
  input: CreateSensitivePeriodInput,
): Promise<ActionResponse<StudentSensitivePeriod>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = CreateSensitivePeriodSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const data = parsed.data;

    // Check if an active period already exists for this student + period type
    const { data: existing } = await supabase
      .from("student_sensitive_periods")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", data.student_id)
      .eq("sensitive_period", data.sensitive_period)
      .is("observed_end_date", null)
      .is("deleted_at", null)
      .maybeSingle();

    let result: StudentSensitivePeriod;

    if (existing) {
      // Update the existing active record
      const { data: updated, error } = await supabase
        .from("student_sensitive_periods")
        .update({
          intensity: data.intensity,
          observed_start_date: data.observed_start_date ?? null,
          observed_end_date: data.observed_end_date ?? null,
          suggested_material_ids: data.suggested_material_ids,
          notes: data.notes ?? null,
          recorded_by: context.user.id,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return failure(error.message, "DATABASE_ERROR");

      await logAudit({
        context,
        action: AuditActions.SENSITIVE_PERIOD_UPDATED,
        entityType: "student_sensitive_period",
        entityId: existing.id,
        metadata: {
          student_id: data.student_id,
          sensitive_period: data.sensitive_period,
          intensity: data.intensity,
        },
      });

      result = updated as StudentSensitivePeriod;
    } else {
      // Create new
      const { data: created, error } = await supabase
        .from("student_sensitive_periods")
        .insert({
          tenant_id: context.tenant.id,
          student_id: data.student_id,
          sensitive_period: data.sensitive_period,
          intensity: data.intensity,
          observed_start_date: data.observed_start_date ?? null,
          observed_end_date: data.observed_end_date ?? null,
          suggested_material_ids: data.suggested_material_ids,
          notes: data.notes ?? null,
          recorded_by: context.user.id,
        })
        .select()
        .single();

      if (error) return failure(error.message, "DATABASE_ERROR");

      await logAudit({
        context,
        action: AuditActions.SENSITIVE_PERIOD_RECORDED,
        entityType: "student_sensitive_period",
        entityId: created.id,
        metadata: {
          student_id: data.student_id,
          sensitive_period: data.sensitive_period,
          intensity: data.intensity,
        },
      });

      result = created as StudentSensitivePeriod;
    }

    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── UPDATE ───────────────────────────────────────────────────

export async function updateSensitivePeriod(
  id: string,
  input: UpdateSensitivePeriodInput,
): Promise<ActionResponse<StudentSensitivePeriod>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = UpdateSensitivePeriodSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("student_sensitive_periods")
      .update(parsed.data)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    const isClosing =
      parsed.data.observed_end_date !== undefined &&
      parsed.data.observed_end_date !== null;

    await logAudit({
      context,
      action: isClosing
        ? AuditActions.SENSITIVE_PERIOD_CLOSED
        : AuditActions.SENSITIVE_PERIOD_UPDATED,
      entityType: "student_sensitive_period",
      entityId: id,
    });

    return success(data as StudentSensitivePeriod);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── CLOSE (set end date) ─────────────────────────────────────

export async function closeSensitivePeriod(
  id: string,
  endDate: string,
): Promise<ActionResponse<StudentSensitivePeriod>> {
  return updateSensitivePeriod(id, { observed_end_date: endDate });
}

// ── DELETE (soft) ────────────────────────────────────────────

export async function deleteSensitivePeriod(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("student_sensitive_periods")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context,
      action: AuditActions.SENSITIVE_PERIOD_DELETED,
      entityType: "student_sensitive_period",
      entityId: id,
    });

    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── GET STUDENT SENSITIVE PERIODS ────────────────────────────

export async function getStudentSensitivePeriods(
  studentId: string,
  activeOnly = false,
): Promise<ActionResponse<StudentSensitivePeriodWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("student_sensitive_periods")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        recorded_by_user:users!student_sensitive_periods_recorded_by_fkey(id, first_name, last_name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.is("observed_end_date", null);

    const { data, error } = await query;
    if (error) return failure(error.message, "DATABASE_ERROR");

    // Resolve suggested materials if any exist
    const allMaterialIds = (data ?? []).flatMap(
      (r) => (r.suggested_material_ids as string[]) ?? [],
    );
    const uniqueMaterialIds = [...new Set(allMaterialIds)];

    let materialMap = new Map<
      string,
      Pick<MontessoriMaterial, "id" | "name" | "area">
    >();
    if (uniqueMaterialIds.length > 0) {
      const { data: mats } = await supabase
        .from("montessori_materials")
        .select("id, name, area")
        .in("id", uniqueMaterialIds);
      for (const m of mats ?? []) {
        materialMap.set(
          m.id as string,
          m as Pick<MontessoriMaterial, "id" | "name" | "area">,
        );
      }
    }

    const result = (data ?? []).map((row) => {
      const materialIds = (row.suggested_material_ids as string[]) ?? [];
      return {
        ...row,
        suggested_materials: materialIds
          .map((mid) => materialMap.get(mid))
          .filter(Boolean) as Pick<
          MontessoriMaterial,
          "id" | "name" | "area"
        >[],
        recorded_by_user: row.recorded_by_user as Pick<
          User,
          "id" | "first_name" | "last_name"
        > | null,
      };
    });

    return success(result as unknown as StudentSensitivePeriodWithDetails[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── MATERIAL SUGGESTIONS ─────────────────────────────────────
// (continued below - new actions appended at end of file)
// Returns materials from montessori_materials that are most relevant
// for a given sensitive period type, based on area and age-level heuristics.
//
// Mapping rationale (Montessori pedagogy):
//   language         → language area (all ages)
//   order            → practical_life (0_3, 3_6) + sensorial (0_3, 3_6)
//   movement         → practical_life (0_3, 3_6)
//   small_objects    → sensorial (0_3, 3_6) + practical_life (0_3, 3_6)
//   music            → cultural (all ages)
//   social_behavior  → practical_life (3_6, 6_9)
//   reading          → language (3_6, 6_9)
//   writing          → language (3_6, 6_9)
//   mathematics      → mathematics (all ages)
//   refinement_of_senses → sensorial (all ages)

const SENSITIVE_PERIOD_AREA_MAP: Record<
  MontessoriSensitivePeriod,
  { areas: string[]; age_levels: string[] }
> = {
  language: { areas: ["language"], age_levels: ["0_3", "3_6", "6_9", "9_12"] },
  order: { areas: ["practical_life", "sensorial"], age_levels: ["0_3", "3_6"] },
  movement: { areas: ["practical_life"], age_levels: ["0_3", "3_6"] },
  small_objects: {
    areas: ["sensorial", "practical_life"],
    age_levels: ["0_3", "3_6"],
  },
  music: { areas: ["cultural"], age_levels: ["0_3", "3_6", "6_9", "9_12"] },
  social_behavior: { areas: ["practical_life"], age_levels: ["3_6", "6_9"] },
  reading: { areas: ["language"], age_levels: ["3_6", "6_9"] },
  writing: { areas: ["language"], age_levels: ["3_6", "6_9"] },
  mathematics: {
    areas: ["mathematics"],
    age_levels: ["0_3", "3_6", "6_9", "9_12"],
  },
  refinement_of_senses: {
    areas: ["sensorial"],
    age_levels: ["0_3", "3_6", "6_9", "9_12"],
  },
};

export async function getMaterialSuggestions(
  sensitivePeriod: MontessoriSensitivePeriod,
  ageLevelFilter?: string,
): Promise<
  ActionResponse<
    Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">[]
  >
> {
  try {
    await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { areas, age_levels } = SENSITIVE_PERIOD_AREA_MAP[sensitivePeriod];
    const effectiveAgeLevels = ageLevelFilter ? [ageLevelFilter] : age_levels;

    const { data, error } = await supabase
      .from("montessori_materials")
      .select("id, name, area, age_level")
      .in("area", areas)
      .in("age_level", effectiveAgeLevels)
      .eq("is_active", true)
      .order("area")
      .order("sequence_order")
      .order("name")
      .limit(30);

    if (error) return failure(error.message, "DATABASE_ERROR");

    return success(
      (data ?? []) as Pick<
        MontessoriMaterial,
        "id" | "name" | "area" | "age_level"
      >[],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ── LIST ALL ACTIVE SENSITIVE PERIODS ────────────────────────

export async function listActiveSensitivePeriods(): Promise<
  ActionResponse<StudentSensitivePeriodWithDetails[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_sensitive_periods")
      .select(
        `
        *,
        student:students(id, first_name, last_name),
        recorded_by_user:users!student_sensitive_periods_recorded_by_fkey(id, first_name, last_name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .is("observed_end_date", null)
      .order("intensity", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, "DATABASE_ERROR");

    // Resolve suggested materials
    const allMaterialIds = (data ?? []).flatMap(
      (r) => (r.suggested_material_ids as string[]) ?? [],
    );
    const uniqueMaterialIds = [...new Set(allMaterialIds)];

    let materialMap = new Map<
      string,
      Pick<MontessoriMaterial, "id" | "name" | "area">
    >();
    if (uniqueMaterialIds.length > 0) {
      const { data: mats } = await supabase
        .from("montessori_materials")
        .select("id, name, area")
        .in("id", uniqueMaterialIds);
      for (const m of mats ?? []) {
        materialMap.set(
          m.id as string,
          m as Pick<MontessoriMaterial, "id" | "name" | "area">,
        );
      }
    }

    const result = (data ?? []).map((row) => {
      const materialIds = (row.suggested_material_ids as string[]) ?? [];
      return {
        ...row,
        suggested_materials: materialIds
          .map((mid) => materialMap.get(mid))
          .filter(Boolean) as Pick<
          MontessoriMaterial,
          "id" | "name" | "area"
        >[],
        recorded_by_user: row.recorded_by_user as Pick<
          User,
          "id" | "first_name" | "last_name"
        > | null,
      };
    });

    return success(result as unknown as StudentSensitivePeriodWithDetails[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ============================================================
// SENSITIVE PERIOD - MATERIAL LINKS (junction table)
// ============================================================

// -- ADD ----------------------------------------------------

export async function addMaterialToSensitivePeriod(
  sensitivePeriodId: string,
  materialId: string,
  introducedDate?: string,
  notes?: string,
): Promise<ActionResponse<SensitivePeriodMaterial>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sensitive_period_materials")
      .insert({
        tenant_id: context.tenant.id,
        student_sensitive_period_id: sensitivePeriodId,
        material_id: materialId,
        introduced_date: introducedDate ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "This material is already linked to the sensitive period.",
          "VALIDATION_ERROR",
        );
      }
      return failure(error.message, "DATABASE_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.SENSITIVE_PERIOD_MATERIAL_LINKED,
      entityType: "sensitive_period_material",
      entityId: data.id,
      metadata: {
        sensitive_period_id: sensitivePeriodId,
        material_id: materialId,
      },
    });

    return success(data as SensitivePeriodMaterial);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// -- REMOVE -------------------------------------------------

export async function removeMaterialFromSensitivePeriod(
  sensitivePeriodId: string,
  materialId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("sensitive_period_materials")
      .delete()
      .eq("tenant_id", context.tenant.id)
      .eq("student_sensitive_period_id", sensitivePeriodId)
      .eq("material_id", materialId);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context,
      action: AuditActions.SENSITIVE_PERIOD_MATERIAL_UNLINKED,
      entityType: "sensitive_period_material",
      entityId: sensitivePeriodId,
      metadata: {
        sensitive_period_id: sensitivePeriodId,
        material_id: materialId,
      },
    });

    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// -- GET FULL (periods + junction materials + obs count) ----

export async function getStudentSensitivePeriodsWithMaterials(
  studentId: string,
  activeOnly = false,
): Promise<ActionResponse<StudentSensitivePeriodFull[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    let periodsQuery = supabase
      .from("student_sensitive_periods")
      .select(
        `*,
        student:students(id, first_name, last_name),
        recorded_by_user:users!student_sensitive_periods_recorded_by_fkey(id, first_name, last_name)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (activeOnly) periodsQuery = periodsQuery.is("observed_end_date", null);

    const { data: periods, error: periodsError } = await periodsQuery;
    if (periodsError) return failure(periodsError.message, "DATABASE_ERROR");
    if (!periods || periods.length === 0) return success([]);

    const periodIds = periods.map((p) => p.id as string);

    const { data: linkRows, error: linksError } = await supabase
      .from("sensitive_period_materials")
      .select("*, material:montessori_materials(id, name, area)")
      .eq("tenant_id", context.tenant.id)
      .in("student_sensitive_period_id", periodIds)
      .order("introduced_date", { ascending: true });

    if (linksError) return failure(linksError.message, "DATABASE_ERROR");

    const { data: obsRows, error: obsError } = await supabase
      .from("observations")
      .select("sensitive_period_ids")
      .eq("tenant_id", context.tenant.id)
      .overlaps("sensitive_period_ids", periodIds);

    if (obsError) return failure(obsError.message, "DATABASE_ERROR");

    const linksByPeriod = new Map<
      string,
      SensitivePeriodMaterialWithDetails[]
    >();
    for (const pid of periodIds) linksByPeriod.set(pid, []);
    for (const row of linkRows ?? []) {
      const pid = row.student_sensitive_period_id as string;
      const mat = row.material as Pick<
        MontessoriMaterial,
        "id" | "name" | "area"
      > | null;
      if (!mat) continue;
      linksByPeriod.get(pid)?.push({
        ...(row as unknown as SensitivePeriodMaterial),
        material: mat,
      });
    }

    const obsByPeriod = new Map<string, number>();
    for (const pid of periodIds) obsByPeriod.set(pid, 0);
    for (const row of obsRows ?? []) {
      for (const pid of (row.sensitive_period_ids as string[]) ?? []) {
        if (obsByPeriod.has(pid)) {
          obsByPeriod.set(pid, (obsByPeriod.get(pid) ?? 0) + 1);
        }
      }
    }

    const allSuggestedIds = (periods ?? []).flatMap(
      (r) => (r.suggested_material_ids as string[]) ?? [],
    );
    const uniqueSuggestedIds = [...new Set(allSuggestedIds)];
    const suggestedMaterialMap = new Map<
      string,
      Pick<MontessoriMaterial, "id" | "name" | "area">
    >();
    if (uniqueSuggestedIds.length > 0) {
      const { data: mats } = await supabase
        .from("montessori_materials")
        .select("id, name, area")
        .in("id", uniqueSuggestedIds);
      for (const m of mats ?? []) {
        suggestedMaterialMap.set(
          m.id as string,
          m as Pick<MontessoriMaterial, "id" | "name" | "area">,
        );
      }
    }

    const result: StudentSensitivePeriodFull[] = (periods ?? []).map((row) => {
      const pid = row.id as string;
      const suggestedIds = (row.suggested_material_ids as string[]) ?? [];
      return {
        ...(row as unknown as StudentSensitivePeriodWithDetails),
        student: row.student as Pick<User, "id" | "first_name" | "last_name">,
        suggested_materials: suggestedIds
          .map((mid) => suggestedMaterialMap.get(mid))
          .filter(Boolean) as Pick<
          MontessoriMaterial,
          "id" | "name" | "area"
        >[],
        recorded_by_user: row.recorded_by_user as Pick<
          User,
          "id" | "first_name" | "last_name"
        > | null,
        linked_materials: linksByPeriod.get(pid) ?? [],
        recent_observation_count: obsByPeriod.get(pid) ?? 0,
      };
    });

    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}

// ============================================================
// OBSERVATION - SENSITIVE PERIOD TAGGING
// ============================================================

export async function tagObservationWithSensitivePeriods(
  observationId: string,
  sensitivePeriodIds: string[],
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("observations")
      .update({ sensitive_period_ids: sensitivePeriodIds })
      .eq("id", observationId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    if (sensitivePeriodIds.length > 0) {
      await logAudit({
        context,
        action: AuditActions.SENSITIVE_PERIOD_OBS_TAGGED,
        entityType: "observation",
        entityId: observationId,
        metadata: { sensitive_period_ids: sensitivePeriodIds },
      });
    }

    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return failure(message, "DATABASE_ERROR");
  }
}
