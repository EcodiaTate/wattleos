"use client";

import Link from "next/link";
import type { QipDashboardSummary } from "@/lib/actions/qip";
import type { ServicePhilosophy } from "@/types/domain";
import { QipCompletionChart } from "./qip-completion-chart";
import { QipUrgencyBanner } from "./qip-urgency-banner";

interface QipDashboardClientProps {
  summary: QipDashboardSummary;
  philosophy: ServicePhilosophy | null;
  canManage: boolean;
}

export function QipDashboardClient({
  summary,
  philosophy,
  canManage,
}: QipDashboardClientProps) {
  const { overall, quality_areas, urgent_items } = summary;

  return (
    <div className="space-y-6">
      {/* Urgency banner */}
      <QipUrgencyBanner urgentItems={urgent_items} />

      {/* Overall progress */}
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
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {overall.assessed_count} of {overall.total_elements} elements
              assessed
            </p>
          </div>

          {/* Quick stats */}
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
                {overall.evidence_total}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Evidence
              </p>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${overall.completion_percentage}%`,
              backgroundColor: "var(--qip-meeting)",
            }}
          />
        </div>
      </div>

      {/* Philosophy summary */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Service Philosophy
            </p>
            {philosophy ? (
              <>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Version {philosophy.version} - published{" "}
                  {new Date(philosophy.published_at!).toLocaleDateString(
                    "en-AU",
                  )}
                </p>
                <p
                  className="mt-2 line-clamp-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {philosophy.content}
                </p>
              </>
            ) : (
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Not yet published
              </p>
            )}
          </div>
          <Link
            href="/admin/qip/philosophy"
            className="active-push touch-target shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
            }}
          >
            {philosophy ? "Edit" : "Create"}
          </Link>
        </div>
      </div>

      {/* QA completion grid */}
      <div>
        <h2
          className="mb-3 text-sm font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Quality Areas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quality_areas.map((qa) => (
            <Link
              key={qa.qa_number}
              href={`/admin/qip/assessment?qa=${qa.qa_number}`}
            >
              <QipCompletionChart
                qaNumber={qa.qa_number}
                qaName={qa.qa_name}
                totalElements={qa.total_elements}
                assessedCount={qa.assessed_count}
                workingTowardsCount={qa.working_towards_count}
                meetingCount={qa.meeting_count}
                exceedingCount={qa.exceeding_count}
                goalCount={qa.goal_count}
                evidenceCount={qa.evidence_count}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/qip/assessment"
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Continue Assessment
        </Link>
        {canManage && (
          <Link
            href="/admin/qip/goals"
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            Manage Goals
          </Link>
        )}
        <Link
          href="/admin/qip/evidence"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
          }}
        >
          Browse Evidence
        </Link>
        <Link
          href="/admin/qip/export"
          className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
          }}
        >
          Export PDF
        </Link>
      </div>
    </div>
  );
}
