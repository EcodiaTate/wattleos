// src/app/(app)/admin/enrollment/applications/page.tsx
//
// ============================================================
// WattleOS V2 - Application Queue Page (Module 10)
// ============================================================
// The main triage screen for enrollment applications. Admins
// see all applications sorted by submission date, filterable
// by status and enrollment period.
//
// WHY server component: Filtering is done via searchParams
// passed to the server action. Each filter change triggers
// a full navigation, keeping the URL bookmarkable.
// ============================================================

import {
  listEnrollmentApplications,
  listEnrollmentPeriods,
} from "@/lib/actions/enroll";
import type { ApplicationStatus } from "@/types/domain";
import Link from "next/link";
import { ApplicationFilters } from "./application-filters";

export const metadata = {
  title: "Application Queue - WattleOS",
};

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-purple-100 text-purple-700",
    changes_requested: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-400",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    changes_requested: "Changes Requested",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────

interface ApplicationsPageProps {
  searchParams: Promise<{
    status?: string;
    period?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const status = (params.status as ApplicationStatus) || undefined;
  const periodId = params.period || undefined;
  const search = params.search || undefined;

  // Fetch applications and periods in parallel
  const [appsResult, periodsResult] = await Promise.all([
    listEnrollmentApplications({
      page,
      per_page: 20,
      status,
      enrollment_period_id: periodId,
      search,
    }),
    listEnrollmentPeriods(),
  ]);

  const applications = appsResult.data?.items ?? [];
  const totalCount = appsResult.data?.total ?? 0;
  const totalPages = appsResult.data?.total_pages ?? 1;
  const error = appsResult.error?.message ?? null;

  const periods = periodsResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Application Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} application{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Enrollment Periods
        </Link>
      </div>

      {/* Filters */}
      <ApplicationFilters
        currentStatus={status ?? ""}
        currentPeriod={periodId ?? ""}
        currentSearch={search ?? ""}
        periods={periods.map((p) => ({
          id: p.id,
          name: `${p.name} (${p.year})`,
        }))}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && applications.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">
            No applications found
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {status || periodId || search
              ? "Try adjusting your filters."
              : "Applications will appear here when parents submit them."}
          </p>
        </div>
      )}

      {/* Applications table */}
      {applications.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Child
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Parent Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Program
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Submitted
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/enrollment/applications/${app.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-amber-700"
                    >
                      {app.child_first_name} {app.child_last_name}
                    </Link>
                    {app.child_date_of_birth && (
                      <p className="text-xs text-gray-500">
                        DOB: {formatDate(app.child_date_of_birth)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {app.submitted_by_email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {app.requested_program
                      ? app.requested_program.replace(/_/g, " ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(app.submitted_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/enrollment/applications/${app.id}`}
                      className="rounded bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={{
                      pathname: "/admin/enrollment/applications",
                      query: {
                        ...(status && { status }),
                        ...(periodId && { period: periodId }),
                        ...(search && { search }),
                        page: page - 1,
                      },
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={{
                      pathname: "/admin/enrollment/applications",
                      query: {
                        ...(status && { status }),
                        ...(periodId && { period: periodId }),
                        ...(search && { search }),
                        page: page + 1,
                      },
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
