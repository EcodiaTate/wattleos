// src/app/(app)/pedagogy/work-cycles/page.tsx
//
// Work Cycle Integrity dashboard - class summaries + term stats.

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWorkCycleDashboard } from "@/lib/actions/work-cycle";
import { WorkCycleDashboardClient } from "@/components/domain/work-cycle/dashboard-client";

export const metadata = { title: "Work Cycle Integrity - WattleOS" };

interface Props {
  searchParams: Promise<{ class?: string }>;
}

export default async function WorkCycleDashboardPage({ searchParams }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
    hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WORK_CYCLES);

  const params = await searchParams;
  const selectedClassId = params.class ?? null;

  const supabase = await createSupabaseServerClient();

  const [dashboardResult, classesResult] = await Promise.all([
    getWorkCycleDashboard(selectedClassId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const data = dashboardResult.data ?? {
    class_summaries: [],
    total_sessions_this_term: 0,
    avg_interruptions_per_session: 0,
    avg_quality_rating: null,
    pct_completed_full: 0,
    interruption_by_source: {} as Record<
      import("@/types/domain").WorkCycleInterruptionSource,
      number
    >,
    interruption_by_severity: {} as Record<
      import("@/types/domain").WorkCycleInterruptionSeverity,
      number
    >,
    pct_preventable: 0,
    flagged_class_count: 0,
    recent_sessions: [],
  };

  return (
    <WorkCycleDashboardClient
      data={data}
      classes={(classesResult.data ?? []) as { id: string; name: string }[]}
      selectedClassId={selectedClassId}
      canManage={canManage}
    />
  );
}
