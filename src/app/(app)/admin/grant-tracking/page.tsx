// src/app/(app)/admin/grant-tracking/page.tsx
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getGrantDashboard, listGrants } from "@/lib/actions/grant-tracking";
import { GrantDashboardClient } from "@/components/domain/grant-tracking/grant-dashboard-client";

export const metadata = { title: "Grant Tracking - WattleOS" };

export default async function GrantTrackingPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_GRANT_TRACKING)) {
    redirect("/dashboard");
  }

  const [dashboardResult, grantsResult] = await Promise.all([
    getGrantDashboard(),
    listGrants({ limit: 200, offset: 0 }),
  ]);

  const dashboard = dashboardResult.data ?? {
    total_grants: 0,
    active_grants: 0,
    total_awarded_cents: 0,
    total_spent_cents: 0,
    by_status: [],
    by_category: [],
    upcoming_acquittals: [],
    overdue_milestones: [],
  };

  const grants = grantsResult.data ?? [];

  return (
    <main style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <GrantDashboardClient dashboard={dashboard} grants={grants} />
    </main>
  );
}
