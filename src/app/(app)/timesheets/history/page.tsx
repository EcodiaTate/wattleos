// ============================================================
// src/app/(app)/timesheets/history/page.tsx
// ============================================================
// My Timesheet History - lists all past timesheets with status
// badges, hours breakdown, and links to detail view.
//
// WHY server component: This is a read-only list page. No
// interactivity needed - pure data fetch and render.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { redirect } from 'next/navigation';
import { getMyTimesheets, getTimesheetDetail } from '@/lib/actions/timesheets';
import { TimesheetHistoryList } from '@/components/domain/timesheets/timesheet-history-list';
import Link from 'next/link';
import type { Timesheet } from '@/types/domain';

export default async function TimesheetHistoryPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.LOG_TIME)) {
    redirect('/dashboard');
  }

  const result = await getMyTimesheets();
  const timesheets: Array<Timesheet & { pay_period_name?: string }> = result.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheet History</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your past timesheets and their approval status
          </p>
        </div>
        <Link
          href="/timesheets"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          Current Period
        </Link>
      </div>

      {/* Content */}
      {timesheets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-900">No timesheet history</p>
          <p className="mt-1 text-sm text-gray-500">
            Your submitted timesheets will appear here.
          </p>
          <Link
            href="/timesheets"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Current Period
          </Link>
        </div>
      ) : (
        <TimesheetHistoryList timesheets={timesheets} />
      )}
    </div>
  );
}