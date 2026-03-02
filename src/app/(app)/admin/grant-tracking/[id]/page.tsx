// src/app/(app)/admin/grant-tracking/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getGrant,
  listMilestones,
  listExpenditures,
} from "@/lib/actions/grant-tracking";
import { GrantDetailClient } from "@/components/domain/grant-tracking/grant-detail-client";

export const metadata = { title: "Grant Detail - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_GRANT_TRACKING)) {
    redirect("/dashboard");
  }

  const [grantResult, milestonesResult, expendituresResult] = await Promise.all([
    getGrant(id),
    listMilestones(id),
    listExpenditures(id),
  ]);

  if (grantResult.error || !grantResult.data) {
    notFound();
  }

  const canManage = hasPermission(context, Permissions.MANAGE_GRANT_TRACKING);

  return (
    <main style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <GrantDetailClient
        grant={grantResult.data}
        milestones={milestonesResult.data ?? []}
        expenditures={expendituresResult.data ?? []}
        canManage={canManage}
      />
    </main>
  );
}
