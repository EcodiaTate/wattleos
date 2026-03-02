import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listLessonWorkCycleSessions } from "@/lib/actions/lesson-tracking";
import { WorkCycleListClient } from "@/components/domain/lessons/work-cycle-list-client";

export const metadata = { title: "Work Cycles - WattleOS" };

export default async function WorkCyclesPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);

  const result = await listLessonWorkCycleSessions();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Work Cycle Sessions
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            3-hour uninterrupted work periods - track concentration and material
            choices
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pedagogy/lessons"
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Lessons
          </Link>
        </div>
      </div>

      {result.error ? (
        <p style={{ color: "var(--destructive)" }}>
          {result.error.message ?? "Failed to load work cycles."}
        </p>
      ) : (
        <WorkCycleListClient
          sessions={result.data ?? []}
          canManage={canManage}
        />
      )}
    </div>
  );
}
