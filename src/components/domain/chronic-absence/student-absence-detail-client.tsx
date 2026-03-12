// src/components/domain/chronic-absence/student-absence-detail-client.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import { ChronicAbsenceStatusBadge } from "@/components/domain/chronic-absence/chronic-absence-status-badge";
import {
  CreateFlagForm,
  ResolveFlagForm,
} from "@/components/domain/chronic-absence/absence-flag-form";
import {
  FollowUpForm,
  FollowUpTimeline,
} from "@/components/domain/chronic-absence/follow-up-log-client";
import { FLAG_STATUS_CONFIG } from "@/lib/constants/chronic-absence";
import type { StudentAbsenceDetail } from "@/types/domain";

interface StudentAbsenceDetailClientProps {
  detail: StudentAbsenceDetail;
  canManage: boolean;
}

type ActivePanel = "follow_up" | "flag" | "resolve" | "dismiss" | null;

export function StudentAbsenceDetailClient({
  detail,
  canManage,
}: StudentAbsenceDetailClientProps) {
  const { summary, weekly_trend, active_flag, flag_history, follow_up_log } =
    detail;
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const studentName = `${summary.student.preferred_name ?? summary.student.first_name} ${summary.student.last_name}`;

  // Referral prompt - encourage wellbeing referral for severe cases
  const showReferralPrompt =
    summary.absence_status === "severe" || summary.absence_status === "chronic";

  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full bg-muted overflow-hidden shrink-0">
          {summary.student.photo_url ? (
            <img
              src={summary.student.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              👤
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{studentName}</h2>
            <ChronicAbsenceStatusBadge status={summary.absence_status} />
          </div>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            {summary.attendance_rate.toFixed(1)}% attendance ·{" "}
            {summary.absent_days.toFixed(1)} absent / {summary.total_days} days
          </p>
          <Link
            href={`/students/${summary.student.id}`}
            className="text-xs hover:underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            View full student profile →
          </Link>
        </div>
      </div>

      {/* Referral prompt */}
      {showReferralPrompt && (
        <div
          className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--chronic-absence-severe)",
            background: "var(--chronic-absence-severe-bg)",
            color: "var(--chronic-absence-severe-fg)",
          }}
        >
          <span className="text-base shrink-0">⚠️</span>
          <div className="flex-1">
            <strong>Welfare concern:</strong> This student's attendance is{" "}
            {summary.absence_status === "severe" ? "severely" : "chronically"}{" "}
            below threshold. Consider logging a{" "}
            <Link href="/admin/wellbeing" className="underline font-medium">
              wellbeing referral
            </Link>{" "}
            if welfare concerns are identified.
          </div>
        </div>
      )}

      {/* Current flag */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Monitoring flag</h3>
          {canManage && !active_flag && (
            <button
              onClick={() =>
                setActivePanel(activePanel === "flag" ? null : "flag")
              }
              className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              🚩 Create flag
            </button>
          )}
        </div>

        {active_flag ? (
          <div className="space-y-3">
            <div
              className="rounded-lg border px-3 py-2.5 text-sm"
              style={{
                borderColor: "var(--chronic-absence-chronic)",
                background: "var(--chronic-absence-chronic-bg)",
                color: "var(--chronic-absence-chronic-fg)",
              }}
            >
              <div className="flex items-center gap-2">
                <span>🚩</span>
                <span className="font-medium">
                  {FLAG_STATUS_CONFIG[active_flag.status].label}
                </span>
                <span className="text-xs ml-auto">
                  {active_flag.created_at.split("T")[0]}
                </span>
              </div>
              {active_flag.rate_at_flag !== null && (
                <p className="text-xs mt-1">
                  Rate at flag: {active_flag.rate_at_flag.toFixed(1)}%
                </p>
              )}
              {active_flag.notes && (
                <p className="text-xs mt-1">{active_flag.notes}</p>
              )}
            </div>

            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setActivePanel(activePanel === "resolve" ? null : "resolve")
                  }
                  className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  ✓ Resolve
                </button>
                <button
                  onClick={() =>
                    setActivePanel(activePanel === "dismiss" ? null : "dismiss")
                  }
                  className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                >
                  Dismiss
                </button>
              </div>
            )}

            {activePanel === "resolve" && (
              <ResolveFlagForm
                flagId={active_flag.id}
                mode="resolve"
                onSuccess={() => setActivePanel(null)}
                onCancel={() => setActivePanel(null)}
              />
            )}

            {activePanel === "dismiss" && (
              <ResolveFlagForm
                flagId={active_flag.id}
                mode="dismiss"
                onSuccess={() => setActivePanel(null)}
                onCancel={() => setActivePanel(null)}
              />
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No active monitoring flag.
          </p>
        )}

        {activePanel === "flag" && (
          <CreateFlagForm
            studentId={summary.student.id}
            onSuccess={() => setActivePanel(null)}
            onCancel={() => setActivePanel(null)}
          />
        )}
      </section>

      {/* Weekly trend */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Weekly attendance trend</h3>
        {weekly_trend.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No attendance records in the monitoring window.
          </p>
        ) : (
          <div className="space-y-2">
            {weekly_trend
              .slice()
              .reverse()
              .map((week) => {
                const weekRate = week.total_days === 0 ? 100 : week.rate;
                const statusColor =
                  weekRate >= 90
                    ? "var(--chronic-absence-good)"
                    : weekRate >= 80
                      ? "var(--chronic-absence-at-risk)"
                      : weekRate >= 70
                        ? "var(--chronic-absence-chronic)"
                        : "var(--chronic-absence-severe)";

                return (
                  <div
                    key={week.week_start}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="w-24 shrink-0 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      w/c {week.week_start}
                    </span>
                    {week.total_days === 0 ? (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        No records
                      </span>
                    ) : (
                      <>
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ background: "var(--muted)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${weekRate}%`,
                              background: statusColor,
                            }}
                          />
                        </div>
                        <span
                          className="w-14 text-right text-xs font-medium tabular-nums"
                          style={{ color: statusColor }}
                        >
                          {weekRate.toFixed(0)}%
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {week.absent_days.toFixed(1)}a/{week.total_days}d
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Follow-up log */}
      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Follow-up log</h3>
          {canManage && active_flag && (
            <button
              onClick={() =>
                setActivePanel(activePanel === "follow_up" ? null : "follow_up")
              }
              className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              + Log contact
            </button>
          )}
        </div>

        {activePanel === "follow_up" && active_flag && (
          <FollowUpForm
            flagId={active_flag.id}
            studentId={summary.student.id}
            onSuccess={() => setActivePanel(null)}
          />
        )}

        <FollowUpTimeline entries={follow_up_log} />
      </section>

      {/* Flag history */}
      {flag_history.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Previous flags
          </h3>
          <div className="space-y-2">
            {flag_history.map((f) => (
              <div key={f.id} className="text-sm flex items-start gap-2">
                <span>{f.status === "resolved" ? "✅" : "❌"}</span>
                <div>
                  <span className="font-medium">
                    {FLAG_STATUS_CONFIG[f.status].label}
                  </span>
                  <span
                    className="ml-2 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {f.created_at.split("T")[0]} →{" "}
                    {f.resolved_at?.split("T")[0] ?? "-"}
                  </span>
                  {f.resolution_note && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {f.resolution_note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
