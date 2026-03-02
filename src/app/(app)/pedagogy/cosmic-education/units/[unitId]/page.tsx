// src/app/(app)/pedagogy/cosmic-education/units/[unitId]/page.tsx
// Unit detail view - studies, participants, per-study progress roll

import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getCosmicUnit,
  listUnitParticipants,
  getUnitStudiesWithRecords,
} from "@/lib/actions/cosmic-education";
import { CosmicUnitDetailClient } from "@/components/domain/cosmic-education/cosmic-unit-detail-client";

interface Props {
  params: Promise<{ unitId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { unitId } = await params;
  const result = await getCosmicUnit(unitId);
  if (result.error || !result.data) return { title: "Unit - WattleOS" };
  return { title: `${result.data.title} - WattleOS` };
}

export default async function CosmicUnitDetailPage({ params }: Props) {
  const { unitId } = await params;

  const context = await getTenantContext();
  const canView =
    hasPermission(context, Permissions.VIEW_COSMIC_EDUCATION) ||
    hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);

  const [unitResult, participantsResult, studiesResult] = await Promise.all([
    getCosmicUnit(unitId),
    listUnitParticipants(unitId),
    getUnitStudiesWithRecords(unitId),
  ]);

  if (unitResult.error || !unitResult.data) notFound();

  return (
    <CosmicUnitDetailClient
      unit={unitResult.data}
      participants={participantsResult.data ?? []}
      studiesWithRecords={studiesResult.data ?? []}
      canManage={canManage}
    />
  );
}
