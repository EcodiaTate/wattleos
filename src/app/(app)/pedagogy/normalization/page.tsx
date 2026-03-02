// src/app/(app)/pedagogy/normalization/page.tsx
// ============================================================
// Normalization Indicators dashboard - class overview of all
// five Montessori indicators with per-student summary cards.
// ============================================================

import { redirect } from "next/navigation";
import { NormalizationDashboardClient } from "@/components/domain/normalization/normalization-dashboard-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getNormalizationDashboard } from "@/lib/actions/normalization";

export const metadata = { title: "Normalization Indicators - WattleOS" };

interface Props {
  searchParams: Promise<{ class?: string }>;
}

export default async function NormalizationPage({ searchParams }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_NORMALIZATION) ||
    hasPermission(context, Permissions.MANAGE_NORMALIZATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_NORMALIZATION);

  const params = await searchParams;
  const selectedClassId = params.class ?? null;

  const supabase = await createSupabaseServerClient();

  const [dashboardResult, classesResult] = await Promise.all([
    getNormalizationDashboard(selectedClassId),
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  const dashboard = dashboardResult.data ?? {
    students: [],
    class_averages: {
      concentration: 0,
      independence: 0,
      order: 0,
      coordination: 0,
      social_harmony: 0,
    },
    total_observations_this_term: 0,
    students_with_observations: 0,
    students_without_observations: 0,
    engagement_distribution: {
      deep: 0,
      moderate: 0,
      surface: 0,
      disengaged: 0,
    },
    joyful_count: 0,
  };

  return (
    <NormalizationDashboardClient
      initialData={dashboard}
      classes={
        (classesResult.data ?? []) as Array<{ id: string; name: string }>
      }
      selectedClassId={selectedClassId}
      canManage={canManage}
    />
  );
}
