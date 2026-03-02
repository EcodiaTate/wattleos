import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDrillDashboard } from "@/lib/actions/emergency-drills";
import { DrillDashboardClient } from "@/components/domain/emergency-drills/drill-dashboard-client";

export const metadata = { title: "Emergency Drills - WattleOS" };

export default async function EmergencyDrillsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_DRILLS) ||
    hasPermission(context, Permissions.MANAGE_EMERGENCY_DRILLS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_EMERGENCY_DRILLS,
  );

  const result = await getDrillDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load drill dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Emergency Drills
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Emergency and evacuation procedure tracking (Reg 97)
        </p>
      </div>

      <DrillDashboardClient data={result.data} canManage={canManage} />
    </div>
  );
}
