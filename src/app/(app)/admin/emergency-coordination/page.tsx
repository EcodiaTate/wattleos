import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCoordinationDashboard } from "@/lib/actions/emergency-coordination";
import { EmergencyCoordinationConfigClient } from "@/components/domain/emergency-coordination/emergency-coordination-config-client";

export const metadata = { title: "Emergency Coordination - WattleOS" };

export default async function EmergencyCoordinationPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_COORDINATION) ||
    hasPermission(context, Permissions.COORDINATE_EMERGENCY) ||
    hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  if (!canView) redirect("/dashboard");

  const canActivate = hasPermission(context, Permissions.ACTIVATE_EMERGENCY);

  const result = await getCoordinationDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load coordination dashboard."}
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
          Emergency Coordination
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Live emergency event management and coordination
        </p>
      </div>

      <EmergencyCoordinationConfigClient
        data={result.data}
        canActivate={canActivate}
      />
    </div>
  );
}
