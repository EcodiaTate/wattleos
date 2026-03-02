import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getComplianceDashboard } from "@/lib/actions/staff-compliance";
import { ComplianceDashboardClient } from "@/components/domain/staff-compliance/compliance-dashboard-client";

export const metadata = { title: "Staff Compliance - WattleOS" };

export default async function CompliancePage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_STAFF_COMPLIANCE) ||
    hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE) ||
    hasPermission(context, Permissions.VIEW_COMPLIANCE_REPORTS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_STAFF_COMPLIANCE);
  const canExport = hasPermission(context, Permissions.VIEW_COMPLIANCE_REPORTS);

  const result = await getComplianceDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load compliance dashboard."}
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
          Staff Compliance
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          WWCC, first aid, qualifications, ECT ratios, and worker register (Reg 136/145/146)
        </p>
      </div>

      <ComplianceDashboardClient
        data={result.data}
        canManage={canManage}
        canExport={canExport}
      />
    </div>
  );
}
