// src/app/(app)/pedagogy/cosmic-education/units/page.tsx
// All units - filterable list

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCosmicEducationDashboard } from "@/lib/actions/cosmic-education";
import { CosmicUnitListClient } from "@/components/domain/cosmic-education/cosmic-unit-list-client";
import type { CosmicUnitStatus, CosmicGreatLesson } from "@/types/domain";

export const metadata = { title: "Cosmic Units - WattleOS" };

interface SearchParams {
  status?: string;
  lesson?: string;
}

export default async function CosmicUnitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const context = await getTenantContext();
  const canView =
    hasPermission(context, Permissions.VIEW_COSMIC_EDUCATION) ||
    hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);
  const params = await searchParams;

  const dashResult = await getCosmicEducationDashboard();
  const allUnits = [
    ...(dashResult.data?.active_units ?? []),
    ...(dashResult.data?.draft_units ?? []),
    ...(dashResult.data?.completed_units ?? []),
  ];

  return (
    <CosmicUnitListClient
      units={allUnits}
      canManage={canManage}
      defaultStatus={(params.status as CosmicUnitStatus) ?? "all"}
      defaultLesson={(params.lesson as CosmicGreatLesson) ?? null}
    />
  );
}
