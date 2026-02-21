// src/app/(app)/reports/page.tsx
//
// ============================================================
// WattleOS V2 - Reports Landing Page
// ============================================================
// Server Component. Lists student reports with filters by term
// and status. Links to the template manager for building report
// formats.
//
// WHY server component: Initial data load happens on the server.
// Filters use searchParams so the page is URL-shareable.
// ============================================================

import {
  getReportCompletionStats,
  getReportTerms,
  listStudentReports,
} from "@/lib/actions/reports";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ReportStatus } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    term?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const currentPage = parseInt(params.page ?? "1", 10);

  // Fetch reports and terms in parallel
  const [reportsResult, termsResult] = await Promise.all([
    listStudentReports({
      page: currentPage,
      per_page: 20,
      term: params.term || undefined,
      status: (params.status as ReportStatus) || undefined,
    }),
    getReportTerms(),
  ]);

  const reports = reportsResult.data ?? [];
  const pagination = reportsResult.pagination;
  const terms = termsResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and manage student term reports
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/reports/templates"
            className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Manage Templates
          </Link>
          <Link
            href="/reports/generate"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-amber-700"
          >
            Generate Reports
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Term"
          paramName="term"
          value={params.term}
          options={terms.map((t) => ({ value: t, label: t }))}
          baseUrl="/reports"
          currentParams={params}
        />
        <FilterSelect
          label="Status"
          paramName="status"
          value={params.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "review", label: "In Review" },
            { value: "approved", label: "Approved" },
            { value: "published", label: "Published" },
          ]}
          baseUrl="/reports"
          currentParams={params}
        />
        {(params.term || params.status) && (
          <Link
            href="/reports"
            className="self-end rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear filters
          </Link>
        )}
      </div>

      {/* Reports table */}
      {reports.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {params.term || params.status
              ? "No reports match the current filters."
              : "No reports yet. Generate reports from a template to get started."}
          </p>
          {!params.term && !params.status && (
            <Link
              href="/reports/generate"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700"
            >
              Generate Reports
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg borderborder-border bg-background">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Term
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Template
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Author
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => {
                const stats = getReportCompletionStats(report.content);
                return (
                  <tr
                    key={report.id}
                    className="transition-colors hover:bg-background"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {report.student.photo_url ? (
                          <img
                            src={report.student.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {report.student.first_name?.[0]}
                            {report.student.last_name?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {report.student.preferred_name ??
                              report.student.first_name}{" "}
                            {report.student.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {report.term ?? " - "}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {report.templateName ?? " - "}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${stats.percentComplete}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {stats.percentComplete}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {[report.author.first_name, report.author.last_name]
                        .filter(Boolean)
                        .join(" ") || " - "}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-sm font-medium text-primary hover:text-amber-700"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between border-tborder-border bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages} (
                {pagination.total} reports)
              </p>
              <div className="flex gap-2">
                {pagination.page > 1 && (
                  <Link
                    href={buildFilterUrl("/reports", {
                      ...params,
                      page: String(pagination.page - 1),
                    })}
                    className="rounded-md border border-gray-300 bg-background px-3 py-1 text-sm text-foreground hover:bg-background"
                  >
                    Previous
                  </Link>
                )}
                {pagination.page < pagination.total_pages && (
                  <Link
                    href={buildFilterUrl("/reports", {
                      ...params,
                      page: String(pagination.page + 1),
                    })}
                    className="rounded-md border border-gray-300 bg-background px-3 py-1 text-sm text-foreground hover:bg-background"
                  >
                    Next
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

// ============================================================
// Sub-components (co-located, Server Components)
// ============================================================

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-foreground",
  review: "bg-blue-100 text-blue-700",
  approved: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  published: "Published",
};

function ReportStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function FilterSelect({
  label,
  paramName,
  value,
  options,
  baseUrl,
  currentParams,
}: {
  label: string;
  paramName: string;
  value: string | undefined;
  options: Array<{ value: string; label: string }>;
  baseUrl: string;
  currentParams: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-1">
        <a
          href={buildFilterUrl(baseUrl, {
            ...currentParams,
            [paramName]: undefined,
            page: undefined,
          })}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            !value
              ? "bg-amber-100 text-amber-800"
              : "bg-muted text-muted-foreground hover:bg-gray-200"
          }`}
        >
          All
        </a>
        {options.map((opt) => (
          <a
            key={opt.value}
            href={buildFilterUrl(baseUrl, {
              ...currentParams,
              [paramName]: opt.value,
              page: undefined,
            })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-amber-100 text-amber-800"
                : "bg-muted text-muted-foreground hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function buildFilterUrl(
  base: string,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val) searchParams.set(key, val);
  }
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}
