// ============================================================
// src/app/(app)/timesheets/page.tsx
// ============================================================
// My Timesheet - shows the current pay period with a daily
// time entry grid. Staff can log hours, pick entry types,
// and submit when all days are filled.
//
// WHY Server Component shell: Fetches pay period + settings +
// entries + existing timesheet in parallel on the server,
// then hands structured data to a client component for
// interactive editing. Minimises client JS bundle.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import { getCurrentPayPeriod } from '@/lib/actions/pay-periods';
import { getMyTimeEntries } from '@/lib/actions/time-entries';
import { getMyTimesheets } from '@/lib/actions/timesheets';
import { getPayrollSettings } from '@/lib/actions/payroll-integration';
import { TimesheetGridClient } from '@/components/domain/timesheets/timesheet-grid-client';
import Link from 'next/link';
import type { PayPeriod, PayrollSettings, TimeEntry, Timesheet, TimesheetStatus } from '@/types/domain';

export default async function TimesheetsPage() {
  const context = await getTenantContext();

  // Gate: must have log_time permission
  if (!hasPermission(context, Permissions.LOG_TIME)) {
    redirect('/dashboard');
  }

  // Parallel fetch: pay period, settings, and user's timesheets
  const [periodResult, settingsResult, timesheetsResult] = await Promise.all([
    getCurrentPayPeriod(),
    getPayrollSettings(),
    getMyTimesheets(),
  ]);

  const payPeriod: PayPeriod | null = periodResult.data ?? null;
  const settings: PayrollSettings | null = settingsResult.data ?? null;
  const allTimesheets: Array<Timesheet & { pay_period_name?: string }> = timesheetsResult.data ?? [];

  // If there's a current pay period, fetch time entries for it
  let timeEntries: TimeEntry[] = [];
  let currentTimesheet: (Timesheet & { pay_period_name?: string }) | null = null;

  if (payPeriod) {
    const entriesResult = await getMyTimeEntries({ payPeriodId: payPeriod.id });
    timeEntries = entriesResult.data ?? [];

    // Find existing timesheet for this period (if submitted/approved/rejected)
    currentTimesheet = allTimesheets.find(
      (ts) => ts.pay_period_id === payPeriod.id
    ) ?? null;
  }

  const isAdmin = hasPermission(context, Permissions.MANAGE_INTEGRATIONS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timesheet</h1>
          <p className="mt-1 text-sm text-gray-500">
            Log your daily hours and submit for approval
          </p>
        </div>
        <Link
          href="/timesheets/history"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          History
        </Link>
      </div>

      {/* No pay period state */}
      {!payPeriod && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">No active pay period</p>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin
              ? 'Create a pay period in Settings → Payroll to get started.'
              : 'Your administrator needs to create a pay period before you can log hours.'}
          </p>
          {isAdmin && (
            <Link
              href="/admin/settings/payroll"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Payroll Settings
            </Link>
          )}
        </div>
      )}

      {/* Active pay period → interactive grid */}
      {payPeriod && settings && (
        <TimesheetGridClient
          payPeriod={payPeriod}
          defaultStartTime={settings.default_start_time}
          defaultEndTime={settings.default_end_time}
          defaultBreakMinutes={settings.default_break_minutes}
          existingEntries={timeEntries}
          currentTimesheet={currentTimesheet}
        />
      )}
    </div>
  );
}