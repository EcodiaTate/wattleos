import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listLessonRecords } from "@/lib/actions/lesson-tracking";
import { LessonListClient } from "@/components/domain/lessons/lesson-list-client";

export const metadata = { title: "Lesson Records - WattleOS" };

export default async function LessonsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);

  const supabase = await createSupabaseServerClient();

  // Fetch records + names in parallel
  const [recordsResult, materialsResult, studentsResult] = await Promise.all([
    listLessonRecords(),
    supabase
      .from("montessori_materials")
      .select("id, name")
      .eq("is_active", true),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null),
  ]);

  const materialMap: Record<string, string> = {};
  for (const m of materialsResult.data ?? []) {
    materialMap[m.id] = m.name;
  }

  const studentMap: Record<string, string> = {};
  for (const s of studentsResult.data ?? []) {
    studentMap[s.id] = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Lesson Records
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Montessori lesson presentations, stages, and child responses
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link
              href="/pedagogy/lessons/record"
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Record Lesson
            </Link>
          )}
          <Link
            href="/pedagogy/lessons/work-cycles"
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Work Cycles
          </Link>
          <Link
            href="/pedagogy/lessons/materials"
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Materials
          </Link>
        </div>
      </div>

      {recordsResult.error ? (
        <p style={{ color: "var(--destructive)" }}>
          {recordsResult.error.message ?? "Failed to load lessons."}
        </p>
      ) : (
        <LessonListClient
          records={recordsResult.data ?? []}
          materialMap={materialMap}
          studentMap={studentMap}
        />
      )}
    </div>
  );
}
