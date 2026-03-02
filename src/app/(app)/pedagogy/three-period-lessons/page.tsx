// src/app/(app)/pedagogy/three-period-lessons/page.tsx
// ============================================================
// Three-Period Lesson dashboard - overview stats + student list.
// ============================================================

import { redirect } from "next/navigation";

import { ThreePeriodDashboardClient } from "@/components/domain/lessons/three-period-dashboard-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getThreePeriodDashboard } from "@/lib/actions/three-period-lessons";

export const metadata = { title: "Three-Period Lessons - WattleOS" };

export default async function ThreePeriodLessonsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);

  const supabase = await createSupabaseServerClient();

  const [dashboardResult, studentsResult] = await Promise.all([
    getThreePeriodDashboard(),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("last_name"),
  ]);

  const dashboard = dashboardResult.data ?? {
    total_students_with_lessons: 0,
    total_lessons: 0,
    lessons_this_week: 0,
    materials_in_progress: 0,
    materials_complete: 0,
    by_area: {
      practical_life: { in_progress: 0, complete: 0, needs_repeat: 0 },
      sensorial: { in_progress: 0, complete: 0, needs_repeat: 0 },
      language: { in_progress: 0, complete: 0, needs_repeat: 0 },
      mathematics: { in_progress: 0, complete: 0, needs_repeat: 0 },
      cultural: { in_progress: 0, complete: 0, needs_repeat: 0 },
    },
    active_sensitive_periods: 0,
  };

  const students = (studentsResult.data ?? []) as {
    id: string;
    first_name: string;
    last_name: string;
  }[];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Three-Period Lessons
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Track the three Montessori lesson stages per child and material.
          </p>
        </div>
      </div>

      <ThreePeriodDashboardClient dashboard={dashboard} students={students} />
    </div>
  );
}
