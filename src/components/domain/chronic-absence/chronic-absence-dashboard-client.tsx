// src/components/domain/chronic-absence/chronic-absence-dashboard-client.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { AbsenceRateBar } from "@/components/domain/chronic-absence/absence-rate-bar";
import { ChronicAbsenceStatusBadge } from "@/components/domain/chronic-absence/chronic-absence-status-badge";
import { CHRONIC_ABSENCE_STATUS_CONFIG } from "@/lib/constants/chronic-absence";
import type { ChronicAbsenceDashboardData, StudentAbsenceSummary } from "@/types/domain";
import { createAbsenceFlag } from "@/lib/actions/chronic-absence";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ChronicAbsenceDashboardClientProps {
  data: ChronicAbsenceDashboardData;
  canManage: boolean;
}

export function ChronicAbsenceDashboardClient({
  data,
  canManage,
}: ChronicAbsenceDashboardClientProps) {
  const { config, summary, at_risk_students } = data;
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<"all" | "severe" | "chronic" | "at_risk">("all");
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(
    new Set(at_risk_students.filter((s) => s.active_flag).map((s) => s.student.id)),
  );

  const filtered = statusFilter === "all"
    ? at_risk_students
    : at_risk_students.filter((s) => s.absence_status === statusFilter);

  async function handleFlag(s: StudentAbsenceSummary) {
    if (s.active_flag || flaggedIds.has(s.student.id)) return;
    haptics.medium();
    setFlaggingId(s.student.id);
    startTransition(async () => {
      const result = await createAbsenceFlag({ student_id: s.student.id });
      if (result.data) {
        setFlaggedIds((prev) => new Set([...prev, s.student.id]));
      }
      setFlaggingId(null);
    });
  }

  const summaryItems = [
    { key: "severe",  label: "Severely Absent",     count: summary.severe,  cssVar: "severe"  },
    { key: "chronic", label: "Chronically Absent",  count: summary.chronic, cssVar: "chronic" },
    { key: "at_risk", label: "At Risk",              count: summary.at_risk, cssVar: "at-risk" },
    { key: "good",    label: "Regular Attendance",   count: summary.good,    cssVar: "good"    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryItems.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-border p-4 space-y-1"
            style={{ background: `var(--chronic-absence-${item.cssVar}-bg)` }}
          >
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: `var(--chronic-absence-${item.cssVar})` }}
            >
              {item.count}
            </div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Active flags callout */}
      {summary.active_flags > 0 && (
        <div
          className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: `var(--chronic-absence-chronic)`,
            background: `var(--chronic-absence-chronic-bg)`,
            color: `var(--chronic-absence-chronic-fg)`,
          }}
        >
          <span className="text-base">🚩</span>
          <span>
            <strong>{summary.active_flags}</strong> student
            {summary.active_flags !== 1 ? "s are" : " is"} under active monitoring.
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "severe", "chronic", "at_risk"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { haptics.selection(); setStatusFilter(f); }}
            className={`touch-target active-push rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              statusFilter === f
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {f === "all" ? "All" : CHRONIC_ABSENCE_STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Student list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          <div className="text-4xl mb-3" style={{ color: "var(--empty-state-icon)" }}>📉</div>
          <p>No students match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const isFlagged = !!(s.active_flag || flaggedIds.has(s.student.id));
            return (
              <div
                key={s.student.id}
                className="card-interactive flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                {/* Photo */}
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted overflow-hidden">
                  {s.student.photo_url ? (
                    <img
                      src={s.student.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      👤
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/attendance/chronic-absence/${s.student.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {s.student.preferred_name ?? s.student.first_name} {s.student.last_name}
                    </Link>
                    <ChronicAbsenceStatusBadge status={s.absence_status} size="sm" />
                    {isFlagged && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
                        style={{
                          background: "var(--chronic-absence-chronic-bg)",
                          color: "var(--chronic-absence-chronic-fg)",
                          borderColor: "var(--chronic-absence-chronic)",
                        }}
                      >
                        🚩 Flagged
                      </span>
                    )}
                  </div>

                  <AbsenceRateBar
                    rate={s.attendance_rate}
                    status={s.absence_status}
                    config={config}
                    compact
                  />

                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span>{s.absent_days.toFixed(1)} absent / {s.total_days} days</span>
                    {s.follow_up_count > 0 && (
                      <span>· {s.follow_up_count} follow-up{s.follow_up_count !== 1 ? "s" : ""}</span>
                    )}
                    {s.last_follow_up_date && (
                      <span>· Last: {s.last_follow_up_date}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/attendance/chronic-absence/${s.student.id}`}
                    className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    View
                  </Link>
                  {canManage && !isFlagged && (
                    <button
                      onClick={() => handleFlag(s)}
                      disabled={isPending || flaggingId === s.student.id}
                      className="touch-target active-push rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      style={{
                        borderColor: `var(--chronic-absence-chronic)`,
                        background: `var(--chronic-absence-chronic-bg)`,
                        color: `var(--chronic-absence-chronic-fg)`,
                      }}
                    >
                      {flaggingId === s.student.id ? "…" : "🚩 Flag"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config link */}
      {canManage && (
        <div className="pt-2 flex justify-end">
          <Link
            href="/attendance/chronic-absence/config"
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Adjust thresholds & settings →
          </Link>
        </div>
      )}
    </div>
  );
}
