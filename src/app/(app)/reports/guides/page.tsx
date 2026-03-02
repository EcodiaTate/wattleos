// src/app/(app)/reports/guides/page.tsx
//
// ============================================================
// WattleOS Report Builder - Guide Management
// ============================================================
// Coordinators invite guides, view pending/accepted invitations,
// resend or revoke invites, and see active guide list.
//
// Free tier: 5 guides (pending + accepted).
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  listGuideInvitations,
  listActiveGuides,
  getGuideCount,
} from "@/lib/actions/reports/guide-invitations";
import { GuidesClient } from "@/components/domain/reports/GuidesClient";

export const metadata = { title: "Guides - WattleOS Reports" };

export const FREE_TIER_GUIDE_LIMIT = 5;

export default async function ReportsGuidesPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_REPORTS)) {
    redirect("/reports");
  }

  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
  const isFree = planTier === "free";

  const [invitationsResult, activeGuidesResult, guideCountResult] =
    await Promise.all([
      listGuideInvitations(),
      listActiveGuides(),
      getGuideCount(),
    ]);

  const invitations = invitationsResult.data ?? [];
  const activeGuides = activeGuidesResult.data ?? [];
  const guideCount = guideCountResult.data ?? 0;
  const atLimit = isFree && guideCount >= FREE_TIER_GUIDE_LIMIT;

  return (
    <GuidesClient
      initialInvitations={invitations}
      initialActiveGuides={activeGuides}
      guideCount={guideCount}
      isFree={isFree}
      atLimit={atLimit}
      freeLimit={FREE_TIER_GUIDE_LIMIT}
    />
  );
}
