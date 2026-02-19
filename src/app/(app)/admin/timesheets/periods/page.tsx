// src/app/(app)/admin/timesheets/periods/page.tsx
//
// ============================================================
// WattleOS V2 - Pay Period Management Page
// ============================================================
// Server Component. Lists all pay periods with status badges.
// Admin can create new periods, lock open periods, and see
// sync status. Pay periods are explicit records because they
// handle edge cases (holidays, mid-cycle starts) that pure
// date arithmetic cannot.
// ============================================================

import { PayPeriodManagementClient } from "@/components/domain/timesheets/pay-period-management-client";
import { listPayPeriods } from "@/lib/actions/pay-periods";
import { getPayrollSettings } from "@/lib/actions/payroll-integration";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { PayPeriod, PayrollSettings } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PayPeriodManagementPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.APPROVE_TIMESHEETS)) {
    redirect("/dashboard");
  }

  const [periodsResult, settingsResult] = await Promise.all([
    listPayPeriods({ perPage: 50 }),
    getPayrollSettings(),
  ]);

  const periods: PayPeriod[] = periodsResult.data?.periods ?? [];
  const settings: PayrollSettings | null = settingsResult.data ?? null;
  const canManageIntegrations = hasPermission(
    context,
    Permissions.MANAGE_INTEGRATIONS,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              Settings
            </Link>
            <span>/</span>
            <Link href="/admin/timesheets" className="hover:text-foreground">
              Timesheets
            </Link>
            <span>/</span>
            <span className="text-foreground">Pay Periods</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Pay Periods
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage pay cycles for timesheet submissions
          </p>
        </div>
        <Link
          href="/admin/timesheets"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
            />
          </svg>
          Back to Approvals
        </Link>
      </div>

      <PayPeriodManagementClient
        periods={periods}
        defaultFrequency={settings?.pay_frequency ?? "fortnightly"}
        canCreate={canManageIntegrations}
      />
    </div>
  );
}
