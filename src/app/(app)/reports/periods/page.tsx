// src/app/(app)/reports/periods/page.tsx
//
// ============================================================
// WattleOS V2 - Report Periods (Admin Entry Point)
// ============================================================
// Lists all report periods for the tenant. This is the first
// thing an admin sees when they click "Reports" - it shows
// what cycles exist, their status, and lets them create new
// ones or drill into a period's dashboard.
// ============================================================

import { listReportPeriods } from "@/lib/actions/reports/periods";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ReportPeriod, ReportPeriodStatus } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Report Periods - WattleOS" };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_STYLES: Record<ReportPeriodStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success-foreground",
  closed: "bg-info/10 text-info-foreground",
  archived: "bg-muted/50 text-muted-foreground",
};

const STATUS_LABELS: Record<ReportPeriodStatus, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
  archived: "Archived",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ReportPeriodsPage({ searchParams }: PageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports/my-reports");
  }

  const params = await searchParams;
  const statusFilter = params.status as ReportPeriodStatus | undefined;

  const result = await listReportPeriods({
    status: statusFilter,
    per_page: 50,
  });

  const periods = result.data ?? [];

  // Split into active/draft (top) and closed/archived (below)
  const live = periods.filter(
    (p) => p.status === "active" || p.status === "draft",
  );
  const past = periods.filter(
    (p) => p.status === "closed" || p.status === "archived",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Report Periods</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage reporting cycles - create a period, assign a template, then
            let guides fill in their reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports/templates"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/reports/periods/new"
            className="rounded-md px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            New Period
          </Link>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["", "active", "draft", "closed", "archived"] as const).map((s) => (
          <Link
            key={s}
            href={s ? `/reports/periods?status=${s}` : "/reports/periods"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s || (!statusFilter && !s)
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {s ? STATUS_LABELS[s as ReportPeriodStatus] : "All"}
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {periods.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No report periods yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a period to start a reporting cycle. Guides will be assigned
            report instances once the period is activated.
          </p>
          <Link
            href="/reports/periods/new"
            className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            Create First Period
          </Link>
        </div>
      )}

      {/* Live periods (active + draft) */}
      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current
          </h2>
          <div className="space-y-2">
            {live.map((period) => (
              <PeriodRow key={period.id} period={period} />
            ))}
          </div>
        </section>
      )}

      {/* Past periods (closed + archived) */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past
          </h2>
          <div className="space-y-2">
            {past.map((period) => (
              <PeriodRow key={period.id} period={period} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PeriodRow({ period }: { period: ReportPeriod }) {
  const termLabel = [period.term, period.academic_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="font-medium text-foreground truncate">{period.name}</p>
          <span
            className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[period.status as ReportPeriodStatus]}`}
          >
            {STATUS_LABELS[period.status as ReportPeriodStatus]}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          {termLabel && <span>{termLabel}</span>}
          {period.due_at && (
            <span>
              Due{" "}
              {new Date(period.due_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
          <span>
            Created{" "}
            {new Date(period.created_at).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
      <Link
        href={`/reports/periods/${period.id}/dashboard`}
        className="ml-4 shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        Open →
      </Link>
    </div>
  );
}
