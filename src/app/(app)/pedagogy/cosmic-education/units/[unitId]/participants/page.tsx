// src/app/(app)/pedagogy/cosmic-education/units/[unitId]/participants/page.tsx
// Participant management - enrol/remove students from a unit

import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getCosmicUnit,
  listUnitParticipants,
} from "@/lib/actions/cosmic-education";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CosmicParticipantsClient } from "@/components/domain/cosmic-education/cosmic-participants-client";

export const metadata = { title: "Unit Participants - WattleOS" };

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function CosmicUnitParticipantsPage({ params }: Props) {
  const { unitId } = await params;

  const context = await getTenantContext();
  const canView =
    hasPermission(context, Permissions.VIEW_COSMIC_EDUCATION) ||
    hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION);

  const [unitResult, participantsResult] = await Promise.all([
    getCosmicUnit(unitId),
    listUnitParticipants(unitId),
  ]);

  if (unitResult.error || !unitResult.data) notFound();

  // Fetch classes for the seed-from-class UI
  const supabase = await createSupabaseServerClient();
  const { data: classRows } = await supabase
    .from("classes")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const classes = (classRows ?? []).map((c: { id: string; name: string }) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <CosmicParticipantsClient
      unit={unitResult.data}
      participants={participantsResult.data ?? []}
      classes={classes}
      canManage={canManage}
    />
  );
}
