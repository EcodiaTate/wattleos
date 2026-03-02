"use server";

// src/lib/actions/lesson-tracking.ts
//
// ============================================================
// WattleOS V2 - Montessori Lesson Tracking (Module J)
// ============================================================
// Lesson records, material selections, and work cycle sessions
// for Montessori-aligned pedagogy tracking.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  LessonRecord,
  MontessoriMaterial,
  MontessoriArea,
  LessonWorkCycleSession,
  WorkCycleMaterialSelection,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  createLessonRecordSchema,
  updateLessonRecordSchema,
  createWorkCycleSessionSchema,
  materialSelectionSchema,
  type CreateLessonRecordInput,
  type UpdateLessonRecordInput,
  type CreateWorkCycleSessionInput,
  type MaterialSelectionInput,
} from "@/lib/validations/lessons";

// ============================================================
// LESSON RECORDS
// ============================================================

export async function createLessonRecord(
  input: CreateLessonRecordInput,
): Promise<ActionResponse<LessonRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = createLessonRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("lesson_records")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        material_id: v.material_id,
        educator_id: context.user.id,
        presentation_date: v.presentation_date,
        stage: v.stage,
        child_response: v.child_response ?? null,
        notes: v.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create lesson record",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.LESSON_RECORDED,
      entityType: "lesson_record",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        material_id: v.material_id,
        stage: v.stage,
      },
    });

    return success(data as LessonRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateLessonRecord(
  id: string,
  input: UpdateLessonRecordInput,
): Promise<ActionResponse<LessonRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateLessonRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    const v = parsed.data;
    if (v.student_id !== undefined) updateData.student_id = v.student_id;
    if (v.material_id !== undefined) updateData.material_id = v.material_id;
    if (v.presentation_date !== undefined) updateData.presentation_date = v.presentation_date;
    if (v.stage !== undefined) updateData.stage = v.stage;
    if (v.child_response !== undefined) updateData.child_response = v.child_response ?? null;
    if (v.notes !== undefined) updateData.notes = v.notes ?? null;

    const { data, error } = await supabase
      .from("lesson_records")
      .update(updateData)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update lesson record",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.LESSON_UPDATED,
      entityType: "lesson_record",
      entityId: id,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as LessonRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listLessonRecords(filters?: {
  student_id?: string;
  material_id?: string;
  area?: MontessoriArea;
}): Promise<ActionResponse<LessonRecord[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("lesson_records")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("presentation_date", { ascending: false });

    if (filters?.student_id) {
      query = query.eq("student_id", filters.student_id);
    }
    if (filters?.material_id) {
      query = query.eq("material_id", filters.material_id);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as LessonRecord[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getStudentLessonProgress(
  studentId: string,
): Promise<
  ActionResponse<{
    records: LessonRecord[];
    materials: MontessoriMaterial[];
  }>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const [recordsResult, materialsResult] = await Promise.all([
      supabase
        .from("lesson_records")
        .select("*")
        .eq("tenant_id", context.tenant.id)
        .eq("student_id", studentId)
        .order("presentation_date", { ascending: false }),
      supabase
        .from("montessori_materials")
        .select("*")
        .eq("is_active", true)
        .order("area")
        .order("sequence_order"),
    ]);

    return success({
      records: (recordsResult.data ?? []) as LessonRecord[],
      materials: (materialsResult.data ?? []) as MontessoriMaterial[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// MATERIAL LIBRARY
// ============================================================

export async function getMaterialLibrary(filters?: {
  area?: MontessoriArea;
}): Promise<ActionResponse<MontessoriMaterial[]>> {
  try {
    await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("montessori_materials")
      .select("*")
      .eq("is_active", true)
      .order("area")
      .order("sequence_order");

    if (filters?.area) {
      query = query.eq("area", filters.area);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as MontessoriMaterial[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WORK CYCLE SESSIONS
// ============================================================

export async function createLessonWorkCycleSession(
  input: CreateWorkCycleSessionInput,
): Promise<ActionResponse<LessonWorkCycleSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = createWorkCycleSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("work_cycle_sessions")
      .insert({
        tenant_id: context.tenant.id,
        class_id: v.class_id ?? null,
        session_date: v.session_date,
        start_time: v.start_time,
        end_time: v.end_time ?? null,
        interruptions: v.interruptions,
        recorded_by: context.user.id,
        notes: v.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create session",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_SESSION_CREATED,
      entityType: "work_cycle_session",
      entityId: data.id,
      metadata: {
        session_date: v.session_date,
        start_time: v.start_time,
      },
    });

    return success(data as LessonWorkCycleSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listLessonWorkCycleSessions(filters?: {
  class_id?: string;
}): Promise<ActionResponse<LessonWorkCycleSession[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("work_cycle_sessions")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (filters?.class_id) {
      query = query.eq("class_id", filters.class_id);
    }

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as LessonWorkCycleSession[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// MATERIAL SELECTIONS (during work cycles)
// ============================================================

export async function recordMaterialSelection(
  input: MaterialSelectionInput,
): Promise<ActionResponse<WorkCycleMaterialSelection>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const parsed = materialSelectionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("work_cycle_material_selections")
      .insert({
        tenant_id: context.tenant.id,
        session_id: v.session_id,
        student_id: v.student_id,
        material_id: v.material_id ?? null,
        material_free_text: v.material_free_text ?? null,
        concentration_level: v.concentration_level ?? null,
        notes: v.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to record selection",
        ErrorCodes.CREATE_FAILED,
      );
    }

    return success(data as WorkCycleMaterialSelection);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getMaterialSelections(
  sessionId: string,
): Promise<ActionResponse<WorkCycleMaterialSelection[]>> {
  try {
    await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("work_cycle_material_selections")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as WorkCycleMaterialSelection[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STUDENT PROGRESS SUMMARY (per-child overview)
// ============================================================

export interface AreaProgressSummary {
  area: MontessoriArea;
  total_materials: number;
  introduced: number;
  practicing: number;
  mastered: number;
  not_started: number;
  completion_percent: number;
}

export interface StudentLessonProgressSummary {
  student_id: string;
  student_name: string;
  total_materials: number;
  total_lessons: number;
  areas: AreaProgressSummary[];
  recent_lessons: Array<{
    material_name: string;
    area: string;
    stage: string;
    child_response: string | null;
    date: string;
  }>;
}

export async function getStudentProgressSummary(
  studentId: string,
): Promise<ActionResponse<StudentLessonProgressSummary>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    // Get student info
    const { data: student } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("id", studentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!student) return failure("Student not found", ErrorCodes.NOT_FOUND);

    const displayName = student.preferred_name
      ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
      : `${student.first_name} ${student.last_name}`;

    // Get all active materials
    const { data: materials } = await supabase
      .from("montessori_materials")
      .select("id, name, area, age_level")
      .eq("is_active", true)
      .order("area")
      .order("sequence_order");

    // Get all lesson records for this student
    const { data: records } = await supabase
      .from("lesson_records")
      .select("material_id, stage, child_response, presentation_date")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .order("presentation_date", { ascending: false });

    // Build best-stage-per-material map
    const stageRank: Record<string, number> = { introduction: 1, practice: 2, mastery: 3 };
    const progressMap = new Map<string, { stage: string; response: string | null }>();
    for (const r of records ?? []) {
      const rec = r as Record<string, unknown>;
      const matId = rec.material_id as string;
      const stage = rec.stage as string;
      const existing = progressMap.get(matId);
      if (!existing || (stageRank[stage] ?? 0) > (stageRank[existing.stage] ?? 0)) {
        progressMap.set(matId, { stage, response: rec.child_response as string | null });
      }
    }

    // Group materials by area
    const AREAS: MontessoriArea[] = ["practical_life", "sensorial", "language", "mathematics", "cultural"];
    const areaProgress: AreaProgressSummary[] = AREAS.map((area) => {
      const areaMaterials = (materials ?? []).filter((m) => m.area === area);
      let introduced = 0;
      let practicing = 0;
      let mastered = 0;

      for (const m of areaMaterials) {
        const progress = progressMap.get(m.id);
        if (!progress) continue;
        if (progress.stage === "mastery") mastered++;
        else if (progress.stage === "practice") practicing++;
        else introduced++;
      }

      const total = areaMaterials.length;
      const notStarted = total - introduced - practicing - mastered;

      return {
        area,
        total_materials: total,
        introduced,
        practicing,
        mastered,
        not_started: notStarted,
        completion_percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
      };
    });

    // Recent lessons (top 10)
    const materialMap = new Map(
      (materials ?? []).map((m) => [m.id, { name: m.name, area: m.area }]),
    );

    const recentLessons = (records ?? []).slice(0, 10).map((r) => {
      const rec = r as Record<string, unknown>;
      const mat = materialMap.get(rec.material_id as string);
      return {
        material_name: mat?.name ?? "Unknown",
        area: mat?.area ?? "unknown",
        stage: rec.stage as string,
        child_response: rec.child_response as string | null,
        date: rec.presentation_date as string,
      };
    });

    return success({
      student_id: studentId,
      student_name: displayName,
      total_materials: (materials ?? []).length,
      total_lessons: (records ?? []).length,
      areas: areaProgress,
      recent_lessons: recentLessons,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
