import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getIlpDashboard } from "@/lib/actions/ilp";
import { IlpDashboardClient } from "@/components/domain/learning-plans/ilp-dashboard-client";

export const metadata = { title: "Learning Plans - WattleOS" };

export default async function LearningPlansDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ILP) ||
    hasPermission(context, Permissions.MANAGE_ILP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_ILP);

  const result = await getIlpDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load learning plans dashboard."}
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
          Individual Learning Plans
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Manage ILPs for children with additional needs - goals, strategies,
          and review cycles
        </p>
      </div>

      <IlpDashboardClient data={result.data} canManage={canManage} />
    </div>
  );
}
