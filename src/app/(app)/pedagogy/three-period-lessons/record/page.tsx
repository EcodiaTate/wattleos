// src/app/(app)/pedagogy/three-period-lessons/record/page.tsx
// ============================================================
// Record a new Three-Period Lesson session.
// ============================================================

import { redirect } from "next/navigation";

import { ThreePeriodLessonForm } from "@/components/domain/lessons/three-period-lesson-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Record Three-Period Lesson - WattleOS" };

interface RecordPageProps {
  searchParams: Promise<{ studentId?: string; materialId?: string }>;
}

export default async function RecordThreePeriodLessonPage({
  searchParams,
}: RecordPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_LESSON_RECORDS)) {
    redirect("/pedagogy/three-period-lessons");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [studentsResult, materialsResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("last_name"),
    supabase
      .from("montessori_materials")
      .select("id, name, area, age_level")
      .eq("is_active", true)
      .order("area")
      .order("name"),
  ]);

  const students = (studentsResult.data ?? []) as {
    id: string;
    first_name: string;
    last_name: string;
  }[];

  const materials = (materialsResult.data ?? []) as {
    id: string;
    name: string;
    area: string;
    age_level: string;
  }[];

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Record Three-Period Lesson
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Document the stages of a guided presentation with a student.
          </p>
        </div>

        <ThreePeriodLessonForm
          students={
            students as Parameters<typeof ThreePeriodLessonForm>[0]["students"]
          }
          materials={
            materials as Parameters<
              typeof ThreePeriodLessonForm
            >[0]["materials"]
          }
          preSelectedStudentId={params.studentId}
          preSelectedMaterialId={params.materialId}
        />
      </div>
    </div>
  );
}
