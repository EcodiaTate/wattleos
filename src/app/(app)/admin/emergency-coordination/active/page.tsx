import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getActiveEvent } from "@/lib/actions/emergency-coordination";
import { CoordinationDashboardClient } from "@/components/domain/emergency-coordination/coordination-dashboard-client";

export const metadata = { title: "Live Coordination - WattleOS" };

export default async function ActiveEmergencyPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_COORDINATION) ||
    hasPermission(context, Permissions.COORDINATE_EMERGENCY) ||
    hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  if (!canView) redirect("/dashboard");

  const canActivate = hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  const canCoordinate =
    canActivate || hasPermission(context, Permissions.COORDINATE_EMERGENCY);

  const result = await getActiveEvent();

  if (result.error) {
    return (
      <div className="p-2 sm:p-3">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  // No active emergency - show empty state
  if (!result.data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <span
            className="text-4xl mb-3"
            style={{ color: "var(--empty-state-icon)" }}
          >
            {"\uD83D\uDFE2"}
          </span>
          <p
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            No Active Emergency
          </p>
          <p
            className="text-sm mt-1 text-center max-w-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            All clear. When an emergency is activated, the live coordination
            panel will appear here.
          </p>
          <Link
            href="/admin/emergency-coordination"
            className="active-push touch-target mt-4 rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Active emergency - tight padding, no breadcrumb, maximum info density
  return (
    <div className="p-2 sm:p-3">
      <CoordinationDashboardClient
        initialData={result.data}
        canActivate={canActivate}
        canCoordinate={canCoordinate}
        currentUserId={context.user.id}
      />
    </div>
  );
}
