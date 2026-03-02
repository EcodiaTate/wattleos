// src/app/(app)/admin/naplan/[windowId]/page.tsx
//
// NAPLAN window detail - cohort list, opt-out management, and summary stats.

import Link from "next/link";
import { notFound } from "next/navigation";

import { NaplanCohortClient } from "@/components/domain/naplan/naplan-cohort-client";
import { NaplanWindowStatusBadge } from "@/components/domain/naplan/naplan-window-status-badge";
import { getWindowSummary } from "@/lib/actions/naplan";
import { hasPermission, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "NAPLAN Window" };

interface Props {
  params: Promise<{ windowId: string }>;
}

export default async function NaplanWindowDetailPage({ params }: Props) {
  const { windowId } = await params;
  const context = await requirePermission(Permissions.VIEW_NAPLAN);
  const canManage = hasPermission(context, Permissions.MANAGE_NAPLAN);

  const summaryResult = await getWindowSummary(windowId);
  if (summaryResult.error || !summaryResult.data) notFound();

  const { window, by_year_level, below_nms_count } = summaryResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/naplan"
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← NAPLAN
          </Link>
          <span style={{ color: "var(--muted-foreground)" }}>/</span>
          <h1 className="text-2xl font-semibold tracking-tight">
            NAPLAN {window.collection_year}
          </h1>
          <NaplanWindowStatusBadge status={window.status} />
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href={`/admin/naplan/${windowId}/edit`}
              className="touch-target active-push inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium"
              style={{ background: "var(--card)", color: "var(--foreground)" }}
            >
              Edit
            </Link>
          )}
          {window.status !== "draft" && (
            <Link
              href={`/admin/naplan/${windowId}/results`}
              className="touch-target active-push inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Results Entry →
            </Link>
          )}
        </div>
      </div>

      {/* Window details */}
      <div
        className="grid grid-cols-2 gap-4 rounded-xl border border-border p-5 sm:grid-cols-4"
        style={{ background: "var(--card)" }}
      >
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Test Dates
          </p>
          <p className="mt-1 text-sm font-medium">
            {window.test_start_date && window.test_end_date
              ? `${new Date(window.test_start_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(window.test_end_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
              : window.test_start_date
                ? new Date(window.test_start_date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not set"}
          </p>
        </div>
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Cohort
          </p>
          <p className="mt-1 text-sm font-medium">
            {window.cohort_count} students
          </p>
        </div>
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Opted Out
          </p>
          <p className="mt-1 text-sm font-medium">{window.opted_out_count}</p>
        </div>
        <div>
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Results
          </p>
          <p className="mt-1 text-sm font-medium">
            {window.results_entered_count} / {window.results_total_possible}
            {window.results_total_possible > 0 && (
              <span
                className="ml-1.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                (
                {Math.round(
                  (window.results_entered_count /
                    window.results_total_possible) *
                    100,
                )}
                %)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Year level breakdown */}
      {window.cohort_count > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([3, 5, 7, 9] as const).map((yl) => {
            const stats = by_year_level[yl];
            if (!stats || stats.cohort === 0) return null;
            return (
              <div
                key={yl}
                className="rounded-lg border border-border p-4"
                style={{ background: "var(--card)" }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Year {yl}
                </p>
                <p className="mt-1 text-xl font-bold">{stats.cohort}</p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {stats.opted_out} opted out · {stats.results_entered} results
                  entered
                </p>
              </div>
            );
          })}
        </div>
      )}

      {below_nms_count > 0 && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4"
          style={{
            borderColor: "var(--naplan-needs-additional-support)",
            background: "var(--naplan-needs-additional-support-bg)",
          }}
        >
          <span className="text-lg">⚠️</span>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--naplan-needs-additional-support)" }}
          >
            {below_nms_count} domain result{below_nms_count !== 1 ? "s" : ""}{" "}
            below the National Minimum Standard
          </p>
        </div>
      )}

      {/* Cohort list */}
      <NaplanCohortClient
        windowId={windowId}
        windowStatus={window.status}
        canManage={canManage}
      />
    </div>
  );
}
