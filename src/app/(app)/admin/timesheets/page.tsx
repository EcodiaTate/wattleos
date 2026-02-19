// src/app/(app)/admin/timesheets/page.tsx
//
// ============================================================
// WattleOS V2 - Admin Timesheet Approvals Page
// ============================================================
// Server Component. Lists submitted timesheets grouped by pay
// period. Approvers can view details, approve, or reject with
// notes. Batch approve is supported for efficiency.
//
// WHY Server Component shell: Fetches pending timesheets and
// pay period context on the server, then hands to an interactive
// client component for approve/reject actions.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import { listPendingTimesheets } from "@/lib/actions/timesheets";
import { listPayPeriods } from "@/lib/actions/pay-periods";
import { PendingApprovalsClient } from "@/components/domain/timesheets/pending-approvals-client";
import Link from "next/link";
import type { PayPeriod } from "@/types/domain";

type PendingResult = Awaited<ReturnType<typeof listPendingTimesheets>>;
type PendingTimesheet = NonNullable<PendingResult["data"]>[number];

export default async function AdminTimesheetsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.APPROVE_TIMESHEETS)) {
    redirect("/dashboard");
  }

  const [pendingResult, periodsResult] = await Promise.all([
    listPendingTimesheets(),
    listPayPeriods({ perPage: 5 }),
  ]);

  const pendingTimesheets: PendingTimesheet[] = pendingResult.data ?? [];
  const recentPeriods: PayPeriod[] = periodsResult.data?.periods ?? [];

  // Group timesheets by pay period for display
  const groupedByPeriod: Record<
    string,
    {
      period: PayPeriod | null;
      timesheets: PendingTimesheet[];
    }
  > = {};

  for (const ts of pendingTimesheets) {
    const periodId = ts.pay_period_id;

    if (!groupedByPeriod[periodId]) {
      const period = recentPeriods.find((p) => p.id === periodId) ?? null;
      groupedByPeriod[periodId] = { period, timesheets: [] };
    }

    groupedByPeriod[periodId].timesheets.push(ts);
  }

  const canManageIntegrations = hasPermission(
    context,
    Permissions.MANAGE_INTEGRATIONS
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/admin" className="hover:text-gray-700">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Timesheet Approvals</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Timesheet Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve staff timesheets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/timesheets/periods"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            Pay Periods
          </Link>

          {canManageIntegrations && (
            <Link
              href="/admin/settings/payroll"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
              Payroll Settings
            </Link>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {pendingTimesheets.length}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Hours (Pending)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pendingTimesheets
              .reduce((sum, ts) => sum + (ts.total_hours ?? 0), 0)
              .toFixed(1)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Pay Periods With Submissions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {Object.keys(groupedByPeriod).length}
          </p>
        </div>
      </div>

      {/* Pending timesheets */}
      {pendingTimesheets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">All caught up</p>
          <p className="mt-1 text-sm text-gray-500">
            No timesheets waiting for approval right now.
          </p>
        </div>
      ) : (
        <PendingApprovalsClient groupedByPeriod={groupedByPeriod as any} />
      )}
    </div>
  );
}
