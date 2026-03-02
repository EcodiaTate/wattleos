// src/app/(app)/pedagogy/environment-planner/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEnvironmentPlannerDashboard } from "@/lib/actions/environment-planner";
import { listShelfLocations } from "@/lib/actions/materials";
import { EnvironmentPlannerDashboardClient } from "@/components/domain/environment-planner/planner-dashboard-client";

export default async function EnvironmentPlannerPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_ENVIRONMENT_PLANNER)) redirect("/");

  const canManage = hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER);

  const [dashboardResult, locationsResult] = await Promise.all([
    getEnvironmentPlannerDashboard(),
    listShelfLocations(),
  ]);

  if (dashboardResult.error || !dashboardResult.data) {
    return (
      <div className="p-6" style={{ color: "var(--text-secondary)" }}>
        Failed to load environment planner.
      </div>
    );
  }

  return (
    <EnvironmentPlannerDashboardClient
      data={dashboardResult.data}
      locations={locationsResult.data ?? []}
      canManage={canManage}
    />
  );
}
