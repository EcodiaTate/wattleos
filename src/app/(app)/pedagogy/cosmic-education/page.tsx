// src/app/(app)/pedagogy/cosmic-education/page.tsx
// ============================================================
// Cosmic Education - Dashboard
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCosmicEducationDashboard } from "@/lib/actions/cosmic-education";
import { CosmicEducationDashboardClient } from "@/components/domain/cosmic-education/cosmic-dashboard-client";

export const metadata = { title: "Cosmic Education - WattleOS" };

export default async function CosmicEducationPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_COSMIC_EDUCATION) ||
    hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);

  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);

  const result = await getCosmicEducationDashboard();
  const data = result.data ?? {
    active_units: [],
    draft_units: [],
    completed_units: [],
    great_lessons: [],
    total_units: 0,
    active_count: 0,
    completed_count: 0,
    units_by_lesson: {
      story_of_universe: 0,
      story_of_life: 0,
      story_of_humans: 0,
      story_of_communication: 0,
      story_of_numbers: 0,
      custom: 0,
    },
  };

  return <CosmicEducationDashboardClient data={data} canManage={canManage} />;
}
