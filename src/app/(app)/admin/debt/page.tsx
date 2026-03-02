// src/app/(app)/admin/debt/page.tsx
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDebtDashboard, listDebtStages } from "@/lib/actions/debt";
import { DebtDashboardClient } from "@/components/domain/debt/debt-dashboard-client";

export const metadata = { title: "Debt Management - WattleOS" };

export default async function DebtManagementPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_DEBT_MANAGEMENT)) {
    redirect("/dashboard");
  }

  const [dashboardResult, stagesResult] = await Promise.all([
    getDebtDashboard(),
    listDebtStages({ include_resolved: false, limit: 100, offset: 0 }),
  ]);

  const dashboard = dashboardResult.data ?? {
    total_overdue_cents: 0,
    total_overdue_count: 0,
    by_stage: [],
    aging_buckets: [],
    active_payment_plans: 0,
    payment_plans_at_risk: 0,
    written_off_ytd_cents: 0,
    recently_resolved: [],
  };

  const stages = stagesResult.data ?? [];

  return (
    <main style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <DebtDashboardClient dashboard={dashboard} stages={stages} />
    </main>
  );
}
