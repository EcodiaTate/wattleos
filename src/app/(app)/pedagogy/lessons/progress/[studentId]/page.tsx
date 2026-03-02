import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStudentProgressSummary } from "@/lib/actions/lesson-tracking";
import { StudentProgressClient } from "@/components/domain/lessons/student-progress-client";

export const metadata = { title: "Student Progress - WattleOS" };

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const result = await getStudentProgressSummary(studentId);

  if (result.error) notFound();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            {result.data!.student_name}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Montessori curriculum progress across all areas
          </p>
        </div>
        <Link
          href="/pedagogy/lessons"
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Back to Lessons
        </Link>
      </div>

      <StudentProgressClient data={result.data!} />
    </div>
  );
}
