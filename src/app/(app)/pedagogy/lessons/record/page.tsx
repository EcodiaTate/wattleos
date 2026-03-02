import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMaterialLibrary } from "@/lib/actions/lesson-tracking";
import { LessonRecordForm } from "@/components/domain/lessons/lesson-record-form";

export const metadata = { title: "Record Lesson - WattleOS" };

export default async function RecordLessonPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_LESSON_RECORDS)) {
    redirect("/pedagogy/lessons");
  }

  const supabase = await createSupabaseServerClient();

  const [materialsResult, studentsResult] = await Promise.all([
    getMaterialLibrary(),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("tenant_id", context.tenant.id)
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null)
      .order("first_name"),
  ]);

  const students = (studentsResult.data ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/pedagogy/lessons"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Lessons
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Record Lesson</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Record Lesson
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Capture a lesson presentation with material, stage, and child response
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <LessonRecordForm
          students={students}
          materials={materialsResult.data ?? []}
        />
      </div>
    </div>
  );
}
