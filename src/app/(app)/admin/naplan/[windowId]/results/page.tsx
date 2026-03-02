// src/app/(app)/admin/naplan/[windowId]/results/page.tsx
//
// Results entry grid - all students in cohort, enter proficiency per domain.

import Link from "next/link";
import { notFound } from "next/navigation";

import { NaplanResultsGridClient } from "@/components/domain/naplan/naplan-results-grid-client";
import { NaplanWindowStatusBadge } from "@/components/domain/naplan/naplan-window-status-badge";
import { getWindowCohort, getWindowSummary } from "@/lib/actions/naplan";
import { hasPermission, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "NAPLAN Results Entry" };

interface Props {
  params: Promise<{ windowId: string }>;
}

export default async function NaplanResultsPage({ params }: Props) {
  const { windowId } = await params;
  const context = await requirePermission(Permissions.VIEW_NAPLAN);
  const canManage = hasPermission(context, Permissions.MANAGE_NAPLAN);

  const [summaryResult, cohortResult] = await Promise.all([
    getWindowSummary(windowId),
    getWindowCohort({ window_id: windowId }),
  ]);

  if (summaryResult.error || !summaryResult.data) notFound();

  const { window } = summaryResult.data;
  const cohort =
    !cohortResult.error && cohortResult.data ? cohortResult.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/naplan/${windowId}`}
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← NAPLAN {window.collection_year}
          </Link>
          <span style={{ color: "var(--muted-foreground)" }}>/</span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Results Entry
          </h1>
          <NaplanWindowStatusBadge status={window.status} />
        </div>
      </div>

      {/* Completion banner */}
      {window.results_total_possible > 0 && (
        <div
          className="flex items-center gap-3 rounded-lg border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">Results completed</span>
              <span style={{ color: "var(--muted-foreground)" }}>
                {window.results_entered_count} / {window.results_total_possible}{" "}
                domains
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((window.results_entered_count / window.results_total_possible) * 100)}%`,
                  background: "var(--naplan-strong)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {window.status === "closed" && !canManage && (
        <div
          className="rounded-lg border border-border px-4 py-3 text-sm"
          style={{
            background: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          This window is closed. Results are read-only.
        </div>
      )}

      <NaplanResultsGridClient
        windowId={windowId}
        windowStatus={window.status}
        cohort={cohort}
        canManage={canManage}
      />
    </div>
  );
}
