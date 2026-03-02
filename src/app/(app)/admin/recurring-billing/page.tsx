// src/app/(app)/admin/recurring-billing/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Recurring Billing Dashboard
// ============================================================
// Server Component. Loads recurring billing setup overview,
// active payment schedules, and failed payment summary.
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getRecurringBillingDashboard } from "@/lib/actions/recurring-billing";
import { RecurringBillingDashboardClient } from "@/components/domain/recurring-billing/recurring-billing-dashboard-client";

export const metadata = { title: "Recurring Billing - WattleOS" };

export default async function RecurringBillingPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.VIEW_RECURRING_BILLING)) redirect("/dashboard");

  const result = await getRecurringBillingDashboard();
  const data = result.data ?? {
    total_setups: 0,
    active_setups: 0,
    paused_setups: 0,
    failed_setups: 0,
    upcoming_collections: [],
    failed_payments_last_30d: 0,
    total_failed_amount_cents: 0,
    setups_by_method: [],
    recent_payment_attempts: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recurring Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage direct debit setups, payment schedules, and track failed collections.
        </p>
      </div>

      <RecurringBillingDashboardClient data={data} permissions={context.permissions} />
    </div>
  );
}
