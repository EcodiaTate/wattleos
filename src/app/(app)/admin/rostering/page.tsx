import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRosterDashboard } from "@/lib/actions/rostering";
import { RosterDashboardClient } from "@/components/domain/rostering/roster-dashboard-client";

export const metadata = { title: "Rostering - WattleOS" };

export default async function RosteringPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.MANAGE_ROSTER) ||
    hasPermission(context, Permissions.MANAGE_LEAVE) ||
    hasPermission(context, Permissions.MANAGE_COVERAGE);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_ROSTER);
  const result = await getRosterDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load roster dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Staff Rostering
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Manage rosters, shifts, leave, and staff coverage
        </p>
      </div>
      <RosterDashboardClient data={result.data} canManage={canManage} />
    </div>
  );
}
