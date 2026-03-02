import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCcsDashboard } from "@/lib/actions/ccs";
import { CcsDashboardClient } from "@/components/domain/ccs/ccs-dashboard-client";

export const metadata = { title: "CCS Session Reports - WattleOS" };

export default async function CcsDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_CCS_REPORTS) ||
    hasPermission(context, Permissions.MANAGE_CCS_REPORTS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_CCS_REPORTS);

  const result = await getCcsDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load CCS dashboard."}
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
          CCS Session Reports
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Weekly session bundles, absence coding, and 42-day cap tracking for
          Child Care Subsidy
        </p>
      </div>

      <CcsDashboardClient dashboard={result.data} canManage={canManage} />
    </div>
  );
}
