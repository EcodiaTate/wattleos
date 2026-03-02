import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getQipDashboardSummary,
  getCurrentPhilosophy,
} from "@/lib/actions/qip";
import { QipDashboardClient } from "@/components/domain/qip/qip-dashboard-client";

export default async function QipDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const [summaryResult, philosophyResult] = await Promise.all([
    getQipDashboardSummary(),
    getCurrentPhilosophy(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Quality Improvement Plan
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          NQS self-assessment, improvement goals, and evidence - Reg 55
        </p>
      </div>

      <QipDashboardClient
        summary={summaryResult.data!}
        philosophy={philosophyResult.data ?? null}
        canManage={canManage}
      />
    </div>
  );
}
