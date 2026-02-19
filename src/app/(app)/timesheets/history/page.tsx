// ============================================================
// src/app/(app)/timesheets/history/page.tsx
// ============================================================
// My Timesheet History - lists all past timesheets with status
// badges, hours breakdown, and links to detail view.
//
// WHY server component: This is a read-only list page. No
// interactivity needed - pure data fetch and render.
// ============================================================

import { TimesheetHistoryList } from "@/components/domain/timesheets/timesheet-history-list";
import { getMyTimesheets } from "@/lib/actions/timesheets";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { Timesheet } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TimesheetHistoryPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.LOG_TIME)) {
    redirect("/dashboard");
  }

  const result = await getMyTimesheets();
  const timesheets: Array<Timesheet & { pay_period_name?: string }> =
    result.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Timesheet History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your past timesheets and their approval status
          </p>
        </div>
        <Link
          href="/timesheets"
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
          Current Period
        </Link>
      </div>

      {/* Content */}
      {timesheets.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <svg
            className="mx-auto h-[var(--density-button-height)] w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">
            No timesheet history
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your submitted timesheets will appear here.
          </p>
          <Link
            href="/timesheets"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700"
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
