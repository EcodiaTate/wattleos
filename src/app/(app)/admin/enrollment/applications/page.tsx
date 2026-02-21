import {
  listEnrollmentApplications,
  listEnrollmentPeriods,
} from "@/lib/actions/enroll";
import type { ApplicationStatus, EnrollmentApplication } from "@/types/domain";
import Link from "next/link";
import { ApplicationFilters } from "./application-filters";

export const metadata = {
  title: "Application Queue - WattleOS",
};

function formatDate(iso: string | null): string {
  if (!iso) return " - ";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-info/10 text-info",
    under_review: "bg-accent/10 text-accent-foreground",
    changes_requested: "bg-warning/10 text-warning-foreground",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    withdrawn: "bg-muted text-muted-foreground/60",
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

type PagedResult<T> = {
  items: T[];
  total: number;
  total_pages: number;
};

function isPagedResult<T>(data: unknown): data is PagedResult<T> {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as any).items) &&
    typeof (data as any).total === "number" &&
    typeof (data as any).total_pages === "number"
  );
}

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

  const appsData = appsResult.data;
  const applications: EnrollmentApplication[] =
    isPagedResult<EnrollmentApplication>(appsData)
      ? appsData.items
      : Array.isArray(appsData)
        ? appsData
        : [];

  const totalCount = isPagedResult<EnrollmentApplication>(appsData)
    ? appsData.total
    : applications.length;

  const totalPages = isPagedResult<EnrollmentApplication>(appsData)
    ? appsData.total_pages
    : 1;

  const error = appsResult.error?.message ?? null;
  const periods = periodsResult.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Application Queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} application{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && applications.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No applications found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status || periodId || search
              ? "Try adjusting your filters."
              : "Applications will appear here when parents submit them."}
          </p>
        </div>
      )}

      {/* Applications table */}
      {applications.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Child</th>
                  <th className="px-4 py-3 text-left">Parent Email</th>
                  <th className="px-4 py-3 text-left">Program</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {applications.map((app: EnrollmentApplication) => (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/enrollment/applications/${app.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {app.child_first_name} {app.child_last_name}
                      </Link>
                      {app.child_date_of_birth && (
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60">
                          DOB: {formatDate(app.child_date_of_birth)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {app.submitted_by_email}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                      {app.requested_program
                        ? app.requested_program.replace(/_/g, " ")
                        : " - "}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                      {formatDate(app.submitted_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/enrollment/applications/${app.id}`}
                        className="rounded-md bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 transition-all hover:bg-primary-100"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages}</span>
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
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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