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
    draft: "bg-muted text-muted-foreground",
    open: "bg-success/10 text-success",
    closed: "bg-warning/10 text-warning-foreground",
    archived: "bg-muted text-muted-foreground/50",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
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
    <span className="inline-flex items-center rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-medium text-info">
      {labels[type] ?? type}
    </span>
  );
}

export default async function EnrollmentPeriodsPage() {
  const result = await listEnrollmentPeriods();

  const periods = result.data ?? [];
  const error = result.error?.message ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Enrollment Periods
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage enrollment windows and review applications.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/enrollment/invitations"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Parent Invitations
          </Link>
          <Link
            href="/admin/enrollment/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 shadow-primary"
          >
            Create Period
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        <Link
          href="/admin/enrollment/applications"
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm transition-all hover:border-primary/50 hover:bg-primary-50/10 card-interactive"
        >
          <span className="font-medium text-foreground">Application Queue</span>
          <span className="ml-2 text-muted-foreground">→</span>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && periods.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No enrollment periods yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first enrollment period to start accepting applications.
          </p>
          <Link
            href="/admin/enrollment/new"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create Period
          </Link>
        </div>
      )}

      {/* Periods table */}
      {periods.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Opens
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Closes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Applications
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/enrollment/${period.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {period.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{period.year}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PeriodTypeBadge type={period.period_type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={period.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(period.opens_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {period.closes_at ? formatDate(period.closes_at) : " - "}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1 text-xs">
                        <span className="text-foreground font-medium">
                          {period.total_applications} total
                        </span>
                        <div className="flex gap-1">
                          {period.submitted_count > 0 && (
                            <span className="rounded-full bg-warning/10 px-1.5 py-0.5 font-medium text-warning-foreground">
                              {period.submitted_count} new
                            </span>
                          )}
                          {period.approved_count > 0 && (
                            <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-success">
                              {period.approved_count} approved
                            </span>
                          )}
                        </div>
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
        </div>
      )}
    </div>
  );
}