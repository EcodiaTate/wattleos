import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getQipDashboardSummary } from "@/lib/actions/qip";
import { QipExportClient } from "@/components/domain/qip/qip-export-client";

export default async function QipExportPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const summaryResult = await getQipDashboardSummary();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Export QIP
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Generate a PDF of your Quality Improvement Plan for the regulator
        </p>
      </div>

      <QipExportClient
        summary={summaryResult.data!}
        canManage={canManage}
      />
    </div>
  );
}
