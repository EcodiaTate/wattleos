import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getDailyCareLogDashboard,
  listEligibleChildren,
} from "@/lib/actions/daily-care";
import { listClasses } from "@/lib/actions/classes";
import { DailyCareLogDashboardClient } from "@/components/domain/daily-care-log/daily-care-dashboard-client";

export const metadata = { title: "Daily Care Log - WattleOS" };

export default async function DailyCareLogDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_DAILY_CARE_LOGS) ||
    hasPermission(context, Permissions.MANAGE_DAILY_CARE_LOGS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_DAILY_CARE_LOGS,
  );

  const [dashboardResult, childrenResult, classesResult] = await Promise.all([
    getDailyCareLogDashboard(),
    listEligibleChildren(),
    canManage ? listClasses() : Promise.resolve({ data: null, error: null }),
  ]);

  if (dashboardResult.error || !dashboardResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {dashboardResult.error?.message ??
            "Failed to load daily care dashboard."}
        </p>
      </div>
    );
  }

  if (childrenResult.error || !childrenResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {childrenResult.error?.message ??
            "Failed to load eligible children."}
        </p>
      </div>
    );
  }

  const activeClasses = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Daily Care Log
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Daily care records for enrolled children (Reg 162)
          </p>
        </div>

        {/* Per-room field configuration links (admin only) */}
        {canManage && activeClasses.length > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Configure fields per room
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {activeClasses.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/admin/daily-care-log/config/${cls.id}`}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--muted)]"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  {cls.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <DailyCareLogDashboardClient
        data={dashboardResult.data}
        eligibleChildren={childrenResult.data}
        canManage={canManage}
      />
    </div>
  );
}
