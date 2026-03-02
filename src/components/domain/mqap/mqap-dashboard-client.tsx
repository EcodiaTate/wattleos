"use client";

import Link from "next/link";
import type { MqapDashboardSummary } from "@/lib/actions/mqap";

interface MqapDashboardClientProps {
  summary: MqapDashboardSummary;
  canManage: boolean;
}

export function MqapDashboardClient({
  summary,
  canManage,
}: MqapDashboardClientProps) {
  const { overall, quality_areas, gap_items } = summary;

  return (
    <div className="space-y-6">
      {/* Gap report banner */}
      {gap_items.length > 0 && (
        <div
          className="rounded-xl border border-border p-4"
          style={{
            backgroundColor: "var(--qip-working-towards-bg)",
            borderColor: "var(--qip-working-towards)",
          }}
        >
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--qip-working-towards-fg)" }}
          >
            {gap_items.length} gap{gap_items.length !== 1 ? "s" : ""} identified
          </p>
          <ul className="space-y-1">
            {gap_items.slice(0, 5).map((item, i) => (
              <li
                key={i}
                className="text-sm"
                style={{ color: "var(--qip-working-towards-fg)" }}
              >
                {item.message}
              </li>
            ))}
            {gap_items.length > 5 && (
              <li
                className="text-sm italic"
                style={{ color: "var(--qip-working-towards-fg)" }}
              >
                + {gap_items.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Overall progress card */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Overall Progress
            </p>
            <p
              className="mt-1 text-3xl font-bold tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {overall.completion_percentage}%
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {overall.assessed_count} of {overall.total_criteria} criteria
              assessed
            </p>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {overall.goals_total}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Goals
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--qip-meeting)" }}
              >
                {overall.goals_achieved}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Achieved
              </p>
            </div>
            <div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {overall.goals_in_progress}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                In Progress
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-QA breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quality_areas.map((qa) => {
          const pct =
            qa.total_criteria > 0
              ? Math.round((qa.assessed_count / qa.total_criteria) * 100)
              : 0;

          return (
            <div
              key={qa.qa_number}
              className="rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  QA{qa.qa_number}
                </p>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {pct}%
                </span>
              </div>
              <p
                className="mb-3 text-sm font-medium leading-tight"
                style={{ color: "var(--foreground)" }}
              >
                {qa.qa_name}
              </p>

              {/* Progress bar */}
              <div
                className="mb-3 h-2 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--muted)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      pct === 100
                        ? "var(--qip-exceeding)"
                        : pct > 0
                          ? "var(--qip-meeting)"
                          : "var(--muted)",
                  }}
                />
              </div>

              {/* Rating breakdown */}
              <div className="flex gap-3 text-xs">
                <span style={{ color: "var(--qip-exceeding)" }}>
                  {qa.exceeding_count} E
                </span>
                <span style={{ color: "var(--qip-meeting)" }}>
                  {qa.meeting_count} M
                </span>
                <span style={{ color: "var(--qip-working-towards)" }}>
                  {qa.working_towards_count} WT
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {qa.total_criteria - qa.assessed_count} —
                </span>
              </div>

              {qa.active_goal_count > 0 && (
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {qa.active_goal_count} active goal
                  {qa.active_goal_count !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/mqap/assessment"
          className="card-interactive rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{
            color: "var(--foreground)",
            backgroundColor: "var(--card)",
          }}
        >
          Assessment Matrix
        </Link>
        <Link
          href="/admin/mqap/goals"
          className="card-interactive rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{
            color: "var(--foreground)",
            backgroundColor: "var(--card)",
          }}
        >
          Improvement Goals
        </Link>
        <Link
          href="/admin/mqap/alignment"
          className="card-interactive rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{
            color: "var(--foreground)",
            backgroundColor: "var(--card)",
          }}
        >
          NQS ↔ MQ:AP Alignment
        </Link>
        {canManage && (
          <Link
            href="/admin/mqap/export"
            className="card-interactive rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{
              color: "var(--foreground)",
              backgroundColor: "var(--card)",
            }}
          >
            Export Self-Study
          </Link>
        )}
      </div>
    </div>
  );
}
