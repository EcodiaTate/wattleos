"use server";

// src/lib/actions/cosmic-education.ts
//
// ============================================================
// Cosmic Education Unit Planning - Server Actions
// ============================================================
// Supports the full planning and tracking lifecycle:
//   1. Browse the five Great Lessons (global seed + custom)
//   2. Create and manage unit plans
//   3. Add cultural study topics (sub-projects) to units
//   4. Enrol students in units (from class or individually)
//   5. Record per-student study progress (upsert)
//   6. Dashboard - active/completed units, lesson coverage
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  CosmicGreatLesson,
  CosmicGreatLessonRow,
  CosmicUnit,
  CosmicUnitWithDetails,
  CosmicUnitStudy,
  CosmicStudyWithRecords,
  CosmicUnitParticipantWithStudent,
  CosmicStudyRecord,
  CosmicStudyRecordWithStudent,
  CosmicUnitSummary,
  CosmicEducationDashboardData,
} from "@/types/domain";
import {
  CreateCustomGreatLessonSchema,
  CreateCosmicUnitSchema,
  UpdateCosmicUnitSchema,
  ListCosmicUnitsSchema,
  CreateCosmicUnitStudySchema,
  UpdateCosmicUnitStudySchema,
  AddCosmicParticipantsSchema,
  UpsertCosmicStudyRecordSchema,
  BulkUpdateStudyStatusSchema,
} from "@/lib/validations/cosmic-education";
import type {
  CreateCustomGreatLessonInput,
  CreateCosmicUnitInput,
  UpdateCosmicUnitInput,
  ListCosmicUnitsInput,
  CreateCosmicUnitStudyInput,
  UpdateCosmicUnitStudyInput,
  AddCosmicParticipantsInput,
  UpsertCosmicStudyRecordInput,
  BulkUpdateStudyStatusInput,
} from "@/lib/validations/cosmic-education";

// ============================================================
// Great Lessons
// ============================================================

/** Returns all active Great Lessons (global + tenant custom). */
export async function listGreatLessons(): Promise<
  ActionResponse<CosmicGreatLessonRow[]>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("cosmic_great_lessons")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenant.id}`)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) return failure(error.message, "DATABASE_ERROR");
    return success((data ?? []) as CosmicGreatLessonRow[]);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

/** Creates a custom Great Lesson for the tenant. */
export async function createCustomGreatLesson(
  input: CreateCustomGreatLessonInput,
): Promise<ActionResponse<CosmicGreatLessonRow>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = CreateCustomGreatLessonSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cosmic_great_lessons")
      .insert({
        tenant_id: ctx.tenant.id,
        lesson_key: "custom",
        title: parsed.data.title,
        subtitle: parsed.data.subtitle ?? null,
        description: parsed.data.description ?? null,
        age_range: parsed.data.age_range ?? "6-12",
        related_areas: parsed.data.related_areas,
        display_order: parsed.data.display_order ?? 99,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_GREAT_LESSON_CREATED,
      entityType: "cosmic_great_lesson",
      entityId: (data as CosmicGreatLessonRow).id,
      metadata: { title: parsed.data.title },
    });

    return success(data as CosmicGreatLessonRow);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Dashboard
// ============================================================

export async function getCosmicEducationDashboard(): Promise<
  ActionResponse<CosmicEducationDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    // Fetch all units (non-deleted)
    const { data: units, error: unitsError } = await supabase
      .from("cosmic_units")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("planned_start", { ascending: false });

    if (unitsError) return failure(unitsError.message, "DATABASE_ERROR");

    // Fetch great lessons for lookup
    const { data: lessons } = await supabase
      .from("cosmic_great_lessons")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenant.id}`)
      .eq("is_active", true)
      .order("display_order");

    const lessonMap = new Map<string, CosmicGreatLessonRow>(
      ((lessons ?? []) as CosmicGreatLessonRow[]).map((l) => [l.id, l]),
    );

    // For each unit, fetch participant + study counts to build summary
    const summaries: CosmicUnitSummary[] = await Promise.all(
      (units ?? []).map(async (u) => {
        const [{ count: participantCount }, { data: studies }] =
          await Promise.all([
            supabase
              .from("cosmic_unit_participants")
              .select("id", { count: "exact", head: true })
              .eq("unit_id", u.id),
            supabase
              .from("cosmic_unit_studies")
              .select("id")
              .eq("unit_id", u.id)
              .is("deleted_at", null),
          ]);

        // Compute completion pct from study records
        const studyIds = ((studies ?? []) as { id: string }[]).map((s) => s.id);
        let completionPct = 0;
        if (studyIds.length > 0 && (participantCount ?? 0) > 0) {
          const { count: completedCount } = await supabase
            .from("cosmic_study_records")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", u.id)
            .eq("status", "completed");
          const totalPossible = studyIds.length * (participantCount ?? 0);
          completionPct =
            totalPossible > 0
              ? Math.round(((completedCount ?? 0) / totalPossible) * 100)
              : 0;
        }

        const gl = lessonMap.get(u.great_lesson_id as string);

        return {
          id: u.id as string,
          title: u.title as string,
          status: u.status as CosmicUnit["status"],
          great_lesson_title: gl?.title ?? "",
          lesson_key: (gl?.lesson_key ?? "custom") as CosmicGreatLesson,
          planned_start: (u.planned_start as string | null) ?? null,
          planned_end: (u.planned_end as string | null) ?? null,
          participant_count: participantCount ?? 0,
          study_count: studyIds.length,
          completion_pct: completionPct,
        } satisfies CosmicUnitSummary;
      }),
    );

    const active_units = summaries.filter((s) => s.status === "active");
    const draft_units = summaries.filter((s) => s.status === "draft");
    const completed_units = summaries.filter((s) => s.status === "completed");

    // Build units_by_lesson map
    const LESSON_KEYS: CosmicGreatLesson[] = [
      "story_of_universe",
      "story_of_life",
      "story_of_humans",
      "story_of_communication",
      "story_of_numbers",
      "custom",
    ];
    const units_by_lesson = Object.fromEntries(
      LESSON_KEYS.map((k) => [
        k,
        summaries.filter((s) => s.lesson_key === k).length,
      ]),
    ) as Record<CosmicGreatLesson, number>;

    return success({
      active_units,
      draft_units,
      completed_units,
      great_lessons: (lessons ?? []) as CosmicGreatLessonRow[],
      total_units: summaries.length,
      active_count: active_units.length,
      completed_count: completed_units.length,
      units_by_lesson,
    });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Units - CRUD
// ============================================================

export async function listCosmicUnits(
  filter: ListCosmicUnitsInput = {},
): Promise<ActionResponse<CosmicUnit[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const parsed = ListCosmicUnitsSchema.safeParse(filter);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("cosmic_units")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("planned_start", { ascending: false });

    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.great_lesson_id)
      query = query.eq("great_lesson_id", parsed.data.great_lesson_id);
    if (parsed.data.target_class_id)
      query = query.eq("target_class_id", parsed.data.target_class_id);

    const { data, error } = await query;
    if (error) return failure(error.message, "DATABASE_ERROR");
    return success((data ?? []) as CosmicUnit[]);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function getCosmicUnit(
  id: string,
): Promise<ActionResponse<CosmicUnitWithDetails>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { data: unit, error } = await supabase
      .from("cosmic_units")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    // Fetch related data in parallel
    const [
      { data: lesson },
      { data: studies },
      { count: participantCount },
      { data: leadStaff },
    ] = await Promise.all([
      supabase
        .from("cosmic_great_lessons")
        .select("*")
        .eq("id", (unit as CosmicUnit).great_lesson_id)
        .single(),
      supabase
        .from("cosmic_unit_studies")
        .select("*")
        .eq("unit_id", id)
        .is("deleted_at", null)
        .order("display_order"),
      supabase
        .from("cosmic_unit_participants")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", id),
      (unit as CosmicUnit).lead_staff_id
        ? supabase
            .from("profiles")
            .select("full_name")
            .eq("id", (unit as CosmicUnit).lead_staff_id as string)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    // Completion pct
    let completionPct = 0;
    const studyIds = ((studies ?? []) as CosmicUnitStudy[]).map((s) => s.id);
    if (studyIds.length > 0 && (participantCount ?? 0) > 0) {
      const { count: completedCount } = await supabase
        .from("cosmic_study_records")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", id)
        .eq("status", "completed");
      const totalPossible = studyIds.length * (participantCount ?? 0);
      completionPct =
        totalPossible > 0
          ? Math.round(((completedCount ?? 0) / totalPossible) * 100)
          : 0;
    }

    // Target class name
    let target_class_name: string | null = null;
    if ((unit as CosmicUnit).target_class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", (unit as CosmicUnit).target_class_id as string)
        .single();
      target_class_name = (cls as { name?: string } | null)?.name ?? null;
    }

    return success({
      ...(unit as CosmicUnit),
      great_lesson: lesson as CosmicGreatLessonRow,
      studies: (studies ?? []) as CosmicUnitStudy[],
      participant_count: participantCount ?? 0,
      lead_staff_name:
        (leadStaff as { full_name?: string } | null)?.full_name ?? null,
      target_class_name,
      completion_pct: completionPct,
    } as CosmicUnitWithDetails);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function createCosmicUnit(
  input: CreateCosmicUnitInput,
): Promise<ActionResponse<CosmicUnit>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = CreateCosmicUnitSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cosmic_units")
      .insert({
        tenant_id: ctx.tenant.id,
        great_lesson_id: parsed.data.great_lesson_id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        key_questions: parsed.data.key_questions ?? [],
        age_range: parsed.data.age_range ?? "6-12",
        planned_start: parsed.data.planned_start ?? null,
        planned_end: parsed.data.planned_end ?? null,
        lead_staff_id: parsed.data.lead_staff_id ?? null,
        target_class_id: parsed.data.target_class_id ?? null,
        linked_material_ids: parsed.data.linked_material_ids ?? [],
        linked_lesson_ids: parsed.data.linked_lesson_ids ?? [],
        notes: parsed.data.notes ?? null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_UNIT_CREATED,
      entityType: "cosmic_unit",
      entityId: (data as CosmicUnit).id,
      metadata: { title: parsed.data.title },
    });

    return success(data as CosmicUnit);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function updateCosmicUnit(
  id: string,
  input: UpdateCosmicUnitInput,
): Promise<ActionResponse<CosmicUnit>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = UpdateCosmicUnitSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cosmic_units")
      .update({ ...parsed.data })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_UNIT_UPDATED,
      entityType: "cosmic_unit",
      entityId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    return success(data as CosmicUnit);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function deleteCosmicUnit(
  id: string,
): Promise<ActionResponse<null>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("cosmic_units")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_UNIT_DELETED,
      entityType: "cosmic_unit",
      entityId: id,
      metadata: {},
    });

    return success(null);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Unit Studies - CRUD
// ============================================================

export async function createCosmicUnitStudy(
  input: CreateCosmicUnitStudyInput,
): Promise<ActionResponse<CosmicUnitStudy>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = CreateCosmicUnitStudySchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cosmic_unit_studies")
      .insert({
        tenant_id: ctx.tenant.id,
        unit_id: parsed.data.unit_id,
        title: parsed.data.title,
        study_area: parsed.data.study_area,
        description: parsed.data.description ?? null,
        learning_outcomes: parsed.data.learning_outcomes ?? [],
        key_vocabulary: parsed.data.key_vocabulary ?? [],
        materials_needed: parsed.data.materials_needed ?? [],
        resources: parsed.data.resources ?? [],
        display_order: parsed.data.display_order ?? 0,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_STUDY_CREATED,
      entityType: "cosmic_unit_study",
      entityId: (data as CosmicUnitStudy).id,
      metadata: {
        title: parsed.data.title,
        study_area: parsed.data.study_area,
        unit_id: parsed.data.unit_id,
      },
    });

    return success(data as CosmicUnitStudy);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function updateCosmicUnitStudy(
  id: string,
  input: UpdateCosmicUnitStudyInput,
): Promise<ActionResponse<CosmicUnitStudy>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = UpdateCosmicUnitStudySchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cosmic_unit_studies")
      .update({ ...parsed.data })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_STUDY_UPDATED,
      entityType: "cosmic_unit_study",
      entityId: id,
      metadata: { changes: Object.keys(parsed.data) },
    });

    return success(data as CosmicUnitStudy);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function deleteCosmicUnitStudy(
  id: string,
): Promise<ActionResponse<null>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("cosmic_unit_studies")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_STUDY_DELETED,
      entityType: "cosmic_unit_study",
      entityId: id,
      metadata: {},
    });

    return success(null);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

/** Returns studies for a unit with per-study student completion summary. */
export async function getUnitStudiesWithRecords(
  unitId: string,
): Promise<ActionResponse<CosmicStudyWithRecords[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { data: studies, error } = await supabase
      .from("cosmic_unit_studies")
      .select("*")
      .eq("unit_id", unitId)
      .eq("tenant_id", ctx.tenant.id)
      .is("deleted_at", null)
      .order("display_order");

    if (error) return failure(error.message, "DATABASE_ERROR");

    const enriched: CosmicStudyWithRecords[] = await Promise.all(
      ((studies ?? []) as CosmicUnitStudy[]).map(async (study) => {
        const { data: records } = await supabase
          .from("cosmic_study_records")
          .select("*, student:students(id, first_name, last_name)")
          .eq("study_id", study.id)
          .eq("tenant_id", ctx.tenant.id);

        const typedRecords = ((records ?? []) as unknown[]).map((r) => {
          const rec = r as Record<string, unknown>;
          const studentArr = rec.student;
          const student = Array.isArray(studentArr)
            ? studentArr[0]
            : studentArr;
          return {
            ...rec,
            student,
          } as CosmicStudyRecordWithStudent;
        });

        return {
          ...study,
          records: typedRecords,
          completed_count: typedRecords.filter((r) => r.status === "completed")
            .length,
          total_students: typedRecords.length,
        } satisfies CosmicStudyWithRecords;
      }),
    );

    return success(enriched);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Participants
// ============================================================

export async function addCosmicParticipants(
  input: AddCosmicParticipantsInput,
): Promise<ActionResponse<null>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = AddCosmicParticipantsSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const rows = parsed.data.student_ids.map((studentId) => ({
      tenant_id: ctx.tenant.id,
      unit_id: parsed.data.unit_id,
      student_id: studentId,
      notes: parsed.data.notes ?? null,
    }));

    const { error } = await supabase
      .from("cosmic_unit_participants")
      .upsert(rows, {
        onConflict: "unit_id,student_id",
        ignoreDuplicates: true,
      });

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_PARTICIPANTS_UPDATED,
      entityType: "cosmic_unit",
      entityId: parsed.data.unit_id,
      metadata: { added_count: parsed.data.student_ids.length },
    });

    return success(null);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function seedParticipantsFromClass(
  unitId: string,
  classId: string,
): Promise<ActionResponse<{ added: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    // Get active enrollments for the class
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("class_id", classId)
      .eq("status", "active");

    if (enrollError) return failure(enrollError.message, "DATABASE_ERROR");

    const studentIds = ((enrollments ?? []) as { student_id: string }[])
      .map((e) => e.student_id)
      .filter(Boolean);

    if (studentIds.length === 0) return success({ added: 0 });

    const rows = studentIds.map((studentId) => ({
      tenant_id: ctx.tenant.id,
      unit_id: unitId,
      student_id: studentId,
      notes: null,
    }));

    const { error } = await supabase
      .from("cosmic_unit_participants")
      .upsert(rows, {
        onConflict: "unit_id,student_id",
        ignoreDuplicates: true,
      });

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_PARTICIPANTS_UPDATED,
      entityType: "cosmic_unit",
      entityId: unitId,
      metadata: { seeded_from_class: classId, added_count: studentIds.length },
    });

    return success({ added: studentIds.length });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function removeCosmicParticipant(
  unitId: string,
  studentId: string,
): Promise<ActionResponse<null>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("cosmic_unit_participants")
      .delete()
      .eq("unit_id", unitId)
      .eq("student_id", studentId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");
    return success(null);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function listUnitParticipants(
  unitId: string,
): Promise<ActionResponse<CosmicUnitParticipantWithStudent[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    const { data: participants, error } = await supabase
      .from("cosmic_unit_participants")
      .select("*, student:students(id, first_name, last_name, dob)")
      .eq("unit_id", unitId)
      .eq("tenant_id", ctx.tenant.id)
      .order("enrolled_at");

    if (error) return failure(error.message, "DATABASE_ERROR");

    // Fetch studies so we can compute per-participant progress
    const { data: studies } = await supabase
      .from("cosmic_unit_studies")
      .select("id, title, study_area")
      .eq("unit_id", unitId)
      .is("deleted_at", null)
      .order("display_order");

    const studyList = (studies ?? []) as Array<{
      id: string;
      title: string;
      study_area: string;
    }>;

    // Fetch all study records for this unit in one query
    const { data: allRecords } = await supabase
      .from("cosmic_study_records")
      .select("student_id, study_id, status")
      .eq("unit_id", unitId)
      .eq("tenant_id", ctx.tenant.id);

    const recordMap = new Map<string, string>();
    (
      (allRecords ?? []) as Array<{
        student_id: string;
        study_id: string;
        status: string;
      }>
    ).forEach((r) => recordMap.set(`${r.student_id}:${r.study_id}`, r.status));

    const result: CosmicUnitParticipantWithStudent[] = (
      (participants ?? []) as unknown[]
    ).map((p) => {
      const part = p as Record<string, unknown>;
      const studentArr = part.student;
      const student = (
        Array.isArray(studentArr) ? studentArr[0] : studentArr
      ) as {
        id: string;
        first_name: string;
        last_name: string;
        dob: string | null;
      };

      const study_progress = studyList.map((s) => ({
        study_id: s.id,
        study_title: s.title,
        study_area: s.study_area as CosmicUnitStudy["study_area"],
        status: (recordMap.get(`${student.id}:${s.id}`) ?? null) as
          | CosmicStudyRecord["status"]
          | null,
      }));

      const completed_studies = study_progress.filter(
        (sp) => sp.status === "completed",
      ).length;

      return {
        id: part.id as string,
        tenant_id: part.tenant_id as string,
        unit_id: part.unit_id as string,
        student_id: part.student_id as string,
        enrolled_at: part.enrolled_at as string,
        notes: (part.notes as string | null) ?? null,
        student,
        study_progress,
        completed_studies,
        total_studies: studyList.length,
      } satisfies CosmicUnitParticipantWithStudent;
    });

    return success(result);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

// ============================================================
// Study Records
// ============================================================

export async function upsertCosmicStudyRecord(
  input: UpsertCosmicStudyRecordInput,
): Promise<ActionResponse<CosmicStudyRecord>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = UpsertCosmicStudyRecordSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();

    // Auto-set date fields if not provided, based on status
    const today = new Date().toISOString().slice(0, 10);
    const statusDates: Record<string, string> = {
      introduced: "introduced_at",
      exploring: "exploring_at",
      presenting: "presenting_at",
      completed: "completed_at",
    };
    const dateField = statusDates[parsed.data.status];

    const payload: Record<string, unknown> = {
      tenant_id: ctx.tenant.id,
      unit_id: parsed.data.unit_id,
      study_id: parsed.data.study_id,
      student_id: parsed.data.student_id,
      status: parsed.data.status,
      introduced_at: parsed.data.introduced_at ?? null,
      exploring_at: parsed.data.exploring_at ?? null,
      presenting_at: parsed.data.presenting_at ?? null,
      completed_at: parsed.data.completed_at ?? null,
      presentation_notes: parsed.data.presentation_notes ?? null,
      staff_notes: parsed.data.staff_notes ?? null,
      recorded_by: ctx.user.id,
    };

    // Auto-populate the date for the current status if not set
    if (dateField && !payload[dateField]) {
      payload[dateField] = today;
    }

    const { data, error } = await supabase
      .from("cosmic_study_records")
      .upsert(payload, { onConflict: "study_id,student_id" })
      .select()
      .single();

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_STUDY_RECORD_UPDATED,
      entityType: "cosmic_study_record",
      entityId: (data as CosmicStudyRecord).id,
      metadata: {
        study_id: parsed.data.study_id,
        student_id: parsed.data.student_id,
        status: parsed.data.status,
      },
    });

    return success(data as CosmicStudyRecord);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

export async function bulkUpdateStudyStatus(
  input: BulkUpdateStudyStatusInput,
): Promise<ActionResponse<{ updated: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_COSMIC_EDUCATION);
    const parsed = BulkUpdateStudyStatusSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);

    const statusDates: Record<string, string> = {
      introduced: "introduced_at",
      exploring: "exploring_at",
      presenting: "presenting_at",
      completed: "completed_at",
    };
    const dateField = statusDates[parsed.data.status];

    const rows = parsed.data.student_ids.map((studentId) => {
      const payload: Record<string, unknown> = {
        tenant_id: ctx.tenant.id,
        unit_id: parsed.data.unit_id,
        study_id: parsed.data.study_id,
        student_id: studentId,
        status: parsed.data.status,
        recorded_by: ctx.user.id,
      };
      if (dateField) payload[dateField] = today;
      return payload;
    });

    const { error } = await supabase
      .from("cosmic_study_records")
      .upsert(rows, { onConflict: "study_id,student_id" });

    if (error) return failure(error.message, "DATABASE_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.COSMIC_STUDY_RECORD_UPDATED,
      entityType: "cosmic_unit_study",
      entityId: parsed.data.study_id,
      metadata: {
        bulk: true,
        student_count: parsed.data.student_ids.length,
        status: parsed.data.status,
      },
    });

    return success({ updated: parsed.data.student_ids.length });
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}

/** Per-student view: all study records across all units they participate in. */
export async function getStudentCosmicProgress(studentId: string): Promise<
  ActionResponse<
    Array<{
      unit: CosmicUnit;
      great_lesson: Pick<CosmicGreatLessonRow, "id" | "lesson_key" | "title">;
      records: Array<
        CosmicStudyRecord & {
          study_title: string;
          study_area: CosmicUnitStudy["study_area"];
        }
      >;
      completed_count: number;
      total_studies: number;
    }>
  >
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_COSMIC_EDUCATION);
    const supabase = await createSupabaseServerClient();

    // Get all units this student is enrolled in
    const { data: participations, error } = await supabase
      .from("cosmic_unit_participants")
      .select("unit_id")
      .eq("student_id", studentId)
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, "DATABASE_ERROR");
    const unitIds = ((participations ?? []) as { unit_id: string }[]).map(
      (p) => p.unit_id,
    );
    if (unitIds.length === 0) return success([]);

    const { data: units } = await supabase
      .from("cosmic_units")
      .select("*")
      .in("id", unitIds)
      .is("deleted_at", null);

    const { data: allStudies } = await supabase
      .from("cosmic_unit_studies")
      .select("id, unit_id, title, study_area")
      .in("unit_id", unitIds)
      .is("deleted_at", null);

    const { data: allRecords } = await supabase
      .from("cosmic_study_records")
      .select("*")
      .eq("student_id", studentId)
      .in("unit_id", unitIds)
      .eq("tenant_id", ctx.tenant.id);

    const studyMap = new Map(
      (
        (allStudies ?? []) as Array<{
          id: string;
          unit_id: string;
          title: string;
          study_area: string;
        }>
      ).map((s) => [s.id, s]),
    );

    const recordsByUnit = new Map<string, typeof allRecords>();
    ((allRecords ?? []) as CosmicStudyRecord[]).forEach((r) => {
      const existing = recordsByUnit.get(r.unit_id) ?? [];
      existing.push(r as never);
      recordsByUnit.set(r.unit_id, existing);
    });

    const { data: lessons } = await supabase
      .from("cosmic_great_lessons")
      .select("id, lesson_key, title")
      .or(`tenant_id.is.null,tenant_id.eq.${ctx.tenant.id}`);
    const lessonMap = new Map(
      (
        (lessons ?? []) as Array<{
          id: string;
          lesson_key: string;
          title: string;
        }>
      ).map((l) => [l.id, l]),
    );

    const unitStudyMap = new Map<
      string,
      Array<{ id: string; title: string; study_area: string }>
    >();
    (
      (allStudies ?? []) as Array<{
        id: string;
        unit_id: string;
        title: string;
        study_area: string;
      }>
    ).forEach((s) => {
      const arr = unitStudyMap.get(s.unit_id) ?? [];
      arr.push(s);
      unitStudyMap.set(s.unit_id, arr);
    });

    const result = ((units ?? []) as CosmicUnit[]).map((unit) => {
      const unitStudies = unitStudyMap.get(unit.id) ?? [];
      const unitRecords = (
        (recordsByUnit.get(unit.id) ?? []) as CosmicStudyRecord[]
      ).map((r) => ({
        ...r,
        study_title: studyMap.get(r.study_id)?.title ?? "",
        study_area: (studyMap.get(r.study_id)?.study_area ??
          "integrated") as CosmicUnitStudy["study_area"],
      }));

      const gl = lessonMap.get(unit.great_lesson_id);

      return {
        unit,
        great_lesson: {
          id: gl?.id ?? unit.great_lesson_id,
          lesson_key: (gl?.lesson_key ?? "custom") as CosmicGreatLesson,
          title: gl?.title ?? "",
        },
        records: unitRecords,
        completed_count: unitRecords.filter((r) => r.status === "completed")
          .length,
        total_studies: unitStudies.length,
      };
    });

    return success(result);
  } catch {
    return failure("Unauthorized", "UNAUTHORIZED");
  }
}
