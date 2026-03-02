// src/app/(app)/reports/periods/[periodId]/dashboard/page.tsx
//
// ============================================================
// WattleOS V2 - Report Period Dashboard (Admin)
// ============================================================
// Shows progress for a single report period:
//   - Period metadata (name, dates, status)
//   - Completion stats by status
//   - Guide-by-guide breakdown
//   - Bulk approve action
//   - Period-end upsell: "parents waiting" if plan is free
//
// Server Component with a client actions panel for bulk ops.
// ============================================================

import { PeriodDashboardClient } from "@/components/domain/reports/PeriodDashboardClient";
import { getReportPeriodDashboard } from "@/lib/actions/reports/periods";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ periodId: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
};

export default async function PeriodDashboardPage({ params }: PageProps) {
  const { periodId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports");
  }

  const result = await getReportPeriodDashboard(periodId);

  if (result.error || !result.data) {
    redirect("/reports");
  }

  const { period, total_instances, by_status, completion_percent, guides } =
    result.data;
  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
  const isFree = planTier === "free";

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const submittedCount = by_status["submitted"] ?? 0;
  const approvedCount = by_status["approved"] ?? 0;
  const allApproved = total_instances > 0 && approvedCount === total_instances;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <span>/</span>
            <span className="text-foreground">{period.name}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {period.name}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {period.term && <span>{period.term}</span>}
            {period.academic_year && <span>{period.academic_year}</span>}
            {period.due_at && <span>Due {formatDate(period.due_at)}</span>}
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background:
              period.status === "active"
                ? "var(--color-success-subtle)"
                : "var(--color-muted)",
            color:
              period.status === "active"
                ? "var(--color-success-fg)"
                : "var(--color-muted-fg)",
          }}
        >
          {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
        </div>
      </div>

      {/* Period-end upsell for free tier - shown when all approved */}
      {isFree && allApproved && (
        <div
          className="rounded-xl border p-5"
          style={{
            borderColor: "var(--color-warning)",
            background: "var(--color-warning-subtle)",
          }}
        >
          <p
            className="font-semibold"
            style={{ color: "var(--color-warning-fg)" }}
          >
            Reports ready - {total_instances} parent
            {total_instances !== 1 ? "s" : ""} waiting
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-warning-fg)" }}
          >
            Deliver reports to parents instantly through the WattleOS parent
            portal instead of printing or emailing. No more manual distribution.
          </p>
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro%20-%20Parent%20Portal"
            className="mt-3 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-warning-fg)",
              color: "var(--color-background)",
            }}
          >
            Upgrade to Pro - Deliver via Parent Portal
          </a>
        </div>
      )}

      {/* Completion overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-foreground">
            {total_instances}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total Reports</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-success-fg)" }}
          >
            {Math.round(completion_percent)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Complete</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-info-fg)" }}
          >
            {submittedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting Review</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-success-fg)" }}
          >
            {approvedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Approved</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Status Breakdown
        </h2>
        <div className="space-y-2">
          {Object.entries(by_status)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {STATUS_LABELS[status] ?? status}
                </span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
            ))}
          {Object.values(by_status).every((v) => v === 0) && (
            <p className="text-sm text-muted-foreground">No instances yet.</p>
          )}
        </div>
      </div>

      {/* Guide breakdown + bulk actions (client) */}
      <PeriodDashboardClient
        periodId={periodId}
        guides={guides}
        submittedCount={submittedCount}
      />
    </div>
  );
}
