// src/app/(app)/admin/enrollment/page.tsx
//
// ============================================================
// WattleOS V2 - Enrollment Periods Admin Page (Module 10)
// ============================================================
// The admin landing page for enrollment management. Shows all
// enrollment periods with application counts and status badges.
// Admins can create, open/close, and archive periods from here.
//
// WHY server component: The list is fetched once on page load.
// Status transitions use server actions with revalidation.
// ============================================================

import { listEnrollmentPeriods } from "@/lib/actions/enroll";
import Link from "next/link";
import { EnrollmentPeriodActions } from "./enrollment-period-actions";

export const metadata = {
  title: "Enrollment Periods - WattleOS",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    open: "bg-green-100 text-green-700",
    closed: "bg-amber-100 text-amber-700",
    archived: "bg-gray-100 text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PeriodTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    new_enrollment: "New Enrollment",
    re_enrollment: "Re-Enrollment",
    mid_year: "Mid-Year",
  };

  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      {labels[type] ?? type}
    </span>
  );
}

export default async function EnrollmentPeriodsPage() {
  const result = await listEnrollmentPeriods();

  const periods = result.data ?? [];
  const error = result.error?.message ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enrollment Periods
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage enrollment windows and review applications.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/enrollment/invitations"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Parent Invitations
          </Link>
          <Link
            href="/admin/enrollment/new"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Create Period
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/admin/enrollment/applications"
          className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm transition-colors hover:border-amber-300 hover:bg-amber-50"
        >
          <span className="font-medium text-gray-900">Application Queue</span>
          <span className="ml-2 text-gray-500">→</span>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && periods.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">
            No enrollment periods yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first enrollment period to start accepting applications.
          </p>
          <Link
            href="/admin/enrollment/new"
            className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Create Period
          </Link>
        </div>
      )}

      {/* Periods table */}
      {periods.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Opens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Closes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Applications
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {periods.map((period) => (
                <tr key={period.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/enrollment/${period.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-amber-700"
                    >
                      {period.name}
                    </Link>
                    <p className="text-xs text-gray-500">{period.year}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PeriodTypeBadge type={period.period_type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={period.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(period.opens_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {period.closes_at ? formatDate(period.closes_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-gray-900">
                        {period.total_applications} total
                      </span>
                      {period.submitted_count > 0 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                          {period.submitted_count} pending
                        </span>
                      )}
                      {period.approved_count > 0 && (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
                          {period.approved_count} approved
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EnrollmentPeriodActions
                      periodId={period.id}
                      currentStatus={period.status}
                      applicationCount={period.total_applications}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
