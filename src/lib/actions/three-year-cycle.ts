"use server";

// src/lib/actions/three-year-cycle.ts
//
// ============================================================
// WattleOS - Three-Year Cycle Progress View
// (Backlog: Montessori-Specific)
// ============================================================
// Longitudinal progress reports spanning the full Montessori
// 3-year age band per child and class cohort.
//
// No new tables - data derived from:
//   lesson_records + montessori_materials + students + enrollments
//
// Age-band inference:
//   0–3 yrs  → "0_3"
//   3–6 yrs  → "3_6"
//   6–9 yrs  → "6_9"
//   9–12 yrs → "9_12"
//   (falls back to "3_6" if dob unknown)
//
// Permissions reuse VIEW_LESSON_RECORDS / MANAGE_LESSON_RECORDS.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  MontessoriArea,
  MontessoriAgeLevel,
  CycleProgressLevel,
  CycleAreaMastery,
  CycleMaterialProgress,
  CycleAreaSummary,
  StudentCycleProfile,
  ClassCycleRow,
  ClassCycleReport,
} from "@/types/domain";

// ============================================================
// Constants
// ============================================================

const AREAS: MontessoriArea[] = [
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
];

const STAGE_RANK: Record<string, number> = {
  introduction: 1,
  practice: 2,
  mastery: 3,
};

// ============================================================
// Helpers
// ============================================================

function inferAgeBand(dob: string | null): MontessoriAgeLevel {
  if (!dob) return "3_6";
  const ageMs = Date.now() - new Date(dob).getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears < 3) return "0_3";
  if (ageYears < 6) return "3_6";
  if (ageYears < 9) return "6_9";
  return "9_12";
}

function stageToLevel(stage: string): CycleProgressLevel {
  if (stage === "mastery") return "mastered";
  if (stage === "practice") return "practicing";
  return "introduced";
}

function masteryPctToLevel(pct: number): CycleAreaMastery {
  if (pct === 0) return "not_started";
  if (pct <= 25) return "beginning";
  if (pct <= 50) return "developing";
  if (pct <= 75) return "consolidating";
  return "advanced";
}

// ============================================================
// Build per-student material progress from raw lesson records
// ============================================================

type RawLesson = {
  material_id: string;
  stage: string;
  presentation_date: string;
};

type RawMaterial = {
  id: string;
  name: string;
  area: string;
  age_level: string;
  sequence_order: number;
};

function buildStudentProfile(
  student: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    photo_url: string | null;
    dob: string | null;
  },
  lessons: RawLesson[],
  materials: RawMaterial[],
  enrollmentStart: string | null,
): StudentCycleProfile {
  const ageBand = inferAgeBand(student.dob);

  // Per-material progress map: material_id → all dates per stage
  const stageDates = new Map<
    string,
    { introduction: string[]; practice: string[]; mastery: string[] }
  >();

  for (const lesson of lessons) {
    if (!stageDates.has(lesson.material_id)) {
      stageDates.set(lesson.material_id, {
        introduction: [],
        practice: [],
        mastery: [],
      });
    }
    const entry = stageDates.get(lesson.material_id)!;
    const key = lesson.stage as keyof typeof entry;
    if (key in entry) {
      entry[key].push(lesson.presentation_date);
    }
  }

  // Only show materials relevant to this student's age band
  const bandMaterials = materials.filter((m) => m.age_level === ageBand);

  const materialProgress: CycleMaterialProgress[] = bandMaterials.map((mat) => {
    const dates = stageDates.get(mat.id);
    if (!dates) {
      return {
        material_id: mat.id,
        material_name: mat.name,
        area: mat.area as MontessoriArea,
        age_level: mat.age_level as MontessoriAgeLevel,
        sequence_order: mat.sequence_order,
        level: "not_started",
        first_introduced: null,
        first_practiced: null,
        first_mastered: null,
        last_lesson_date: null,
        lesson_count: 0,
      };
    }

    // Best stage determines the level
    let bestStage = "not_started";
    if (dates.mastery.length > 0) bestStage = "mastery";
    else if (dates.practice.length > 0) bestStage = "practice";
    else if (dates.introduction.length > 0) bestStage = "introduction";

    const allDates = [
      ...dates.introduction,
      ...dates.practice,
      ...dates.mastery,
    ].sort();

    return {
      material_id: mat.id,
      material_name: mat.name,
      area: mat.area as MontessoriArea,
      age_level: mat.age_level as MontessoriAgeLevel,
      sequence_order: mat.sequence_order,
      level:
        bestStage === "not_started" ? "not_started" : stageToLevel(bestStage),
      first_introduced:
        dates.introduction.length > 0
          ? [...dates.introduction].sort()[0]
          : null,
      first_practiced:
        dates.practice.length > 0 ? [...dates.practice].sort()[0] : null,
      first_mastered:
        dates.mastery.length > 0 ? [...dates.mastery].sort()[0] : null,
      last_lesson_date:
        allDates.length > 0 ? allDates[allDates.length - 1] : null,
      lesson_count: allDates.length,
    };
  });

  // Area summaries
  const areaSummaries: CycleAreaSummary[] = AREAS.map((area) => {
    const areaMats = materialProgress.filter((m) => m.area === area);
    const mastered = areaMats.filter((m) => m.level === "mastered").length;
    const practicing = areaMats.filter((m) => m.level === "practicing").length;
    const introduced = areaMats.filter((m) => m.level === "introduced").length;
    const notStarted = areaMats.filter((m) => m.level === "not_started").length;
    const total = areaMats.length;
    const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return {
      area,
      total_materials: total,
      not_started: notStarted,
      introduced,
      practicing,
      mastered,
      mastery_pct: pct,
      mastery_level: masteryPctToLevel(pct),
    };
  });

  const totalBandMats = materialProgress.length;
  const totalMastered = materialProgress.filter(
    (m) => m.level === "mastered",
  ).length;
  const overallPct =
    totalBandMats > 0 ? Math.round((totalMastered / totalBandMats) * 100) : 0;

  return {
    student_id: student.id,
    student_name: `${student.first_name} ${student.last_name}`,
    preferred_name: student.preferred_name,
    photo_url: student.photo_url,
    dob: student.dob,
    age_band: ageBand,
    enrollment_start: enrollmentStart,
    area_summaries: areaSummaries,
    materials: materialProgress,
    overall_mastery_pct: overallPct,
    total_lessons: lessons.length,
  };
}

// ============================================================
// ACTION: getStudentCycleProfile
// ============================================================

export async function getStudentCycleProfile(
  studentId: string,
): Promise<ActionResponse<StudentCycleProfile>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const [studentRes, materialsRes, lessonsRes, enrollmentRes] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, first_name, last_name, preferred_name, photo_url, dob")
          .eq("id", studentId)
          .eq("tenant_id", context.tenant.id)
          .is("deleted_at", null)
          .single(),

        supabase
          .from("montessori_materials")
          .select("id, name, area, age_level, sequence_order")
          .eq("is_active", true)
          .order("area")
          .order("sequence_order"),

        supabase
          .from("lesson_records")
          .select("material_id, stage, presentation_date")
          .eq("tenant_id", context.tenant.id)
          .eq("student_id", studentId)
          .order("presentation_date", { ascending: true }),

        supabase
          .from("enrollments")
          .select("start_date")
          .eq("tenant_id", context.tenant.id)
          .eq("student_id", studentId)
          .is("deleted_at", null)
          .order("start_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

    if (studentRes.error || !studentRes.data) {
      return failure("Student not found", ErrorCodes.NOT_FOUND);
    }

    const student = studentRes.data as {
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
      dob: string | null;
    };
    const materials = (materialsRes.data ?? []) as RawMaterial[];
    const lessons = (lessonsRes.data ?? []) as RawLesson[];
    const enrollmentStart =
      (enrollmentRes.data as { start_date: string } | null)?.start_date ?? null;

    const profile = buildStudentProfile(
      student,
      lessons,
      materials,
      enrollmentStart,
    );
    return success(profile);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure(
      "Failed to load student cycle profile",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// ACTION: getClassCycleReport
// ============================================================

export async function getClassCycleReport(
  classId: string | null,
): Promise<ActionResponse<ClassCycleReport>> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    // Get class name
    let className: string | null = null;
    if (classId) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .single();
      className = (cls as { name: string } | null)?.name ?? null;
    }

    // Get active students in class (or all students if no class filter)
    let studentIds: string[];
    if (classId) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("tenant_id", context.tenant.id)
        .eq("class_id", classId)
        .eq("status", "active")
        .is("deleted_at", null);

      studentIds = ((enrollments ?? []) as { student_id: string }[]).map(
        (e) => e.student_id,
      );
    } else {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .eq("status", "active");

      studentIds = ((students ?? []) as { id: string }[]).map((s) => s.id);
    }

    if (studentIds.length === 0) {
      return success({
        class_id: classId,
        class_name: className,
        generated_at: new Date().toISOString(),
        students: [],
        area_totals: {
          practical_life: 0,
          sensorial: 0,
          language: 0,
          mathematics: 0,
          cultural: 0,
        },
      });
    }

    // Fetch student data, all materials, all lesson records for these students
    const [studentsRes, materialsRes, lessonsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name, photo_url, dob")
        .in("id", studentIds)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("last_name")
        .order("first_name"),

      supabase
        .from("montessori_materials")
        .select("id, name, area, age_level, sequence_order")
        .eq("is_active", true)
        .order("area")
        .order("sequence_order"),

      supabase
        .from("lesson_records")
        .select("student_id, material_id, stage, presentation_date")
        .eq("tenant_id", context.tenant.id)
        .in("student_id", studentIds)
        .order("presentation_date", { ascending: true }),
    ]);

    const students = (studentsRes.data ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
      dob: string | null;
    }>;
    const materials = (materialsRes.data ?? []) as RawMaterial[];
    const allLessons = (lessonsRes.data ?? []) as Array<
      RawLesson & { student_id: string }
    >;

    // Group lessons by student
    const lessonsByStudent = new Map<string, RawLesson[]>();
    for (const lesson of allLessons) {
      const sid = lesson.student_id;
      if (!lessonsByStudent.has(sid)) lessonsByStudent.set(sid, []);
      lessonsByStudent.get(sid)!.push({
        material_id: lesson.material_id,
        stage: lesson.stage,
        presentation_date: lesson.presentation_date,
      });
    }

    // Build rows
    const rows: ClassCycleRow[] = students.map((student) => {
      const lessons = lessonsByStudent.get(student.id) ?? [];
      const profile = buildStudentProfile(student, lessons, materials, null);
      return {
        student_id: profile.student_id,
        student_name: profile.student_name,
        preferred_name: profile.preferred_name,
        photo_url: profile.photo_url,
        age_band: profile.age_band,
        area_summaries: profile.area_summaries,
        overall_mastery_pct: profile.overall_mastery_pct,
      };
    });

    // Compute area_totals (most common band, or union across all bands)
    const areaTotals: Record<MontessoriArea, number> = {
      practical_life: 0,
      sensorial: 0,
      language: 0,
      mathematics: 0,
      cultural: 0,
    };
    // Use the first row's totals as representative (same materials for same band)
    if (rows.length > 0) {
      for (const summary of rows[0].area_summaries) {
        areaTotals[summary.area] = summary.total_materials;
      }
    }

    return success({
      class_id: classId,
      class_name: className,
      generated_at: new Date().toISOString(),
      students: rows,
      area_totals: areaTotals,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure(
      "Failed to load class cycle report",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// ACTION: listStudentsForCycleView (for the picker)
// ============================================================

export async function listStudentsForCycleView(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      preferred_name: string | null;
      photo_url: string | null;
      dob: string | null;
      age_band: MontessoriAgeLevel;
      enrollment_start: string | null;
    }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_LESSON_RECORDS);
    const supabase = await createSupabaseServerClient();

    const [studentsRes, enrollmentsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name, photo_url, dob")
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("last_name")
        .order("first_name"),

      supabase
        .from("enrollments")
        .select("student_id, start_date")
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("start_date", { ascending: true }),
    ]);

    const students = (studentsRes.data ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
      dob: string | null;
    }>;

    // Earliest enrollment per student
    const enrollmentMap = new Map<string, string>();
    for (const e of (enrollmentsRes.data ?? []) as Array<{
      student_id: string;
      start_date: string;
    }>) {
      if (!enrollmentMap.has(e.student_id)) {
        enrollmentMap.set(e.student_id, e.start_date);
      }
    }

    return success(
      students.map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        preferred_name: s.preferred_name,
        photo_url: s.photo_url,
        dob: s.dob,
        age_band: inferAgeBand(s.dob),
        enrollment_start: enrollmentMap.get(s.id) ?? null,
      })),
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to list students", ErrorCodes.DATABASE_ERROR);
  }
}
