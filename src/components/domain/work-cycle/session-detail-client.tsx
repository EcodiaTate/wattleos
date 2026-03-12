"use client";

// src/components/domain/work-cycle/session-detail-client.tsx
//
// Full detail view for a single work cycle session.
// Shows the timeline, interruptions list, add-interruption form.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  InterruptionSourceBadge,
  InterruptionSeverityBadge,
} from "./interruption-source-badge";
import { QualityRatingDisplay } from "./quality-rating-display";
import { InterruptionForm } from "./interruption-form";
import {
  deleteInterruption,
  deleteWorkCycleSession,
} from "@/lib/actions/work-cycle";
import {
  STANDARD_WORK_CYCLE_MINUTES,
  FLAG_INTERRUPTIONS_THRESHOLD,
} from "@/lib/constants/work-cycle";
import type { WorkCycleSessionWithDetails } from "@/types/domain";

interface SessionDetailClientProps {
  session: WorkCycleSessionWithDetails;
  canManage: boolean;
}

function fmtTime(t: string | null) {
  if (!t) return "-";
  return t.slice(0, 5);
}

export function SessionDetailClient({
  session,
  canManage,
}: SessionDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSession, setDeleteSession] = useState(false);

  const plannedMins = (() => {
    const [sh, sm] = session.planned_start_time.split(":").map(Number);
    const [eh, em] = session.planned_end_time.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  })();

  const totalIntrMins = session.total_interruption_minutes;
  const longestUninterrupted = session.longest_uninterrupted_minutes;
  const isFlagged = session.interruption_count > FLAG_INTERRUPTIONS_THRESHOLD;

  async function handleDeleteInterruption(id: string) {
    setDeletingId(id);
    const result = await deleteInterruption(id);
    setDeletingId(null);
    if (!result.error) {
      startTransition(() => router.refresh());
    }
  }

  async function handleDeleteSession() {
    setDeleteSession(true);
    const result = await deleteWorkCycleSession(session.id);
    if (!result.error) {
      router.push("/pedagogy/work-cycles");
      router.refresh();
    } else {
      setDeleteSession(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Work Cycle - {session.class_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(session.session_date + "T00:00:00").toLocaleDateString(
              "en-AU",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              },
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <a
              href={`/pedagogy/work-cycles/${session.id}/edit`}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Edit
            </a>
            <button
              onClick={() => {
                if (confirm("Delete this session and all its interruptions?")) {
                  handleDeleteSession();
                }
              }}
              disabled={deleteSession}
              className="rounded-lg border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
            >
              {deleteSession ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Flagged banner */}
      {isFlagged && (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            borderColor: "var(--wc-severity-severe-bg)",
            background: "var(--wc-severity-severe-bg)",
            color: "var(--wc-severity-severe-fg)",
          }}
        >
          This session had {session.interruption_count} interruptions - above
          the flag threshold of {FLAG_INTERRUPTIONS_THRESHOLD}.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Planned Duration"
          value={`${plannedMins} min`}
          sub={`${fmtTime(session.planned_start_time)} – ${fmtTime(session.planned_end_time)}`}
        />
        <StatCard
          label="Interruptions"
          value={String(session.interruption_count)}
          sub={`${totalIntrMins} min lost`}
          flagged={isFlagged}
        />
        <StatCard
          label="Longest Uninterrupted"
          value={
            longestUninterrupted !== null ? `${longestUninterrupted} min` : "-"
          }
          sub={
            longestUninterrupted !== null && plannedMins > 0
              ? `${Math.round((longestUninterrupted / STANDARD_WORK_CYCLE_MINUTES) * 100)}% of 3h`
              : undefined
          }
        />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Quality Rating
          </p>
          <div className="mt-2">
            <QualityRatingDisplay rating={session.quality_rating} showLabel />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {session.completed_full_cycle
              ? "✓ Full cycle sustained"
              : "Cycle not completed"}
          </p>
        </div>
      </div>

      {/* Notes */}
      {session.general_notes && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Notes
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {session.general_notes}
          </p>
        </div>
      )}

      {/* Interruptions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Interruptions
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({session.interruption_count})
            </span>
          </h2>
          {canManage && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-background hover:bg-primary transition-colors"
            >
              + Add Interruption
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="mb-4">
            <InterruptionForm
              sessionId={session.id}
              onAdded={() => {
                setShowAddForm(false);
                startTransition(() => router.refresh());
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {session.interruptions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              No interruptions recorded
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {canManage
                ? "Add interruptions to track what disrupted the work cycle."
                : "No interruptions were logged for this session."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Time
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Source
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Severity
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Duration
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Preventable
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                    Notes
                  </th>
                  {canManage && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {session.interruptions.map((intr) => (
                  <tr
                    key={intr.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {fmtTime(intr.occurred_at)}
                    </td>
                    <td className="px-4 py-3">
                      <InterruptionSourceBadge source={intr.source} />
                    </td>
                    <td className="px-4 py-3">
                      <InterruptionSeverityBadge severity={intr.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {intr.duration_minutes} min
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {intr.preventable ? (
                        <span className="text-destructive font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                      {intr.description ?? "-"}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteInterruption(intr.id)}
                          disabled={deletingId === intr.id || isPending}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        >
                          {deletingId === intr.id ? "…" : "Remove"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  flagged,
}: {
  label: string;
  value: string;
  sub?: string;
  flagged?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: flagged ? "var(--wc-severity-severe-bg)" : "var(--border)",
        background: flagged ? "var(--wc-severity-severe-bg)" : "var(--card)",
      }}
    >
      <p
        className="text-xs font-medium"
        style={{
          color: flagged
            ? "var(--wc-severity-severe-fg)"
            : "var(--muted-foreground)",
        }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{
          color: flagged ? "var(--wc-severity-severe-fg)" : "var(--foreground)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-xs mt-0.5"
          style={{
            color: flagged
              ? "var(--wc-severity-severe-fg)"
              : "var(--muted-foreground)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
