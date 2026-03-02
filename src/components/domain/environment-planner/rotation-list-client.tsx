"use client";

// src/components/domain/environment-planner/rotation-list-client.tsx

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import type { MaterialShelfLocation, RotationScheduleWithDetails } from "@/types/domain";
import {
  completeRotationSchedule,
  cancelRotationSchedule,
} from "@/lib/actions/environment-planner";
import { RotationStatusBadge, RotationThemeBadge } from "./environment-plan-status-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  schedules: RotationScheduleWithDetails[];
  locations: MaterialShelfLocation[];
  canManage: boolean;
}

export function RotationListClient({ schedules, locations: _locations, canManage }: Props) {
  const router  = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  function handleComplete(id: string) {
    haptics.impact("heavy");
    startTransition(async () => {
      await completeRotationSchedule(id, { outcome_notes: outcomeNotes || null });
      setCompletingId(null);
      setOutcomeNotes("");
      router.refresh();
    });
  }

  function handleCancel(id: string) {
    if (!confirm("Cancel this rotation?")) return;
    haptics.impact("medium");
    startTransition(async () => {
      await cancelRotationSchedule(id);
      router.refresh();
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Rotation Schedules
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Seasonal and thematic material rotations
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pedagogy/environment-planner"
            className="active-push touch-target px-3 py-2 rounded-lg border border-border text-sm"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => haptics.impact("light")}
          >
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/pedagogy/environment-planner/rotations/new"
              className="active-push touch-target flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={() => haptics.impact("medium")}
            >
              <Plus className="w-4 h-4" />
              Schedule rotation
            </Link>
          )}
        </div>
      </div>

      {schedules.length === 0 ? (
        <div
          className="rounded-xl border border-border p-12 text-center"
          style={{ background: "var(--surface)" }}
        >
          <CalendarDays className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--empty-state-icon)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No rotation schedules yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sched) => {
            const isOverdue = sched.status === "upcoming" && sched.scheduled_date < today;
            const isCompleting = completingId === sched.id;

            return (
              <div
                key={sched.id}
                className="rounded-xl border border-border p-4 space-y-3"
                style={{
                  background:   "var(--surface)",
                  borderColor:  isOverdue ? "var(--env-rotation-overdue)" : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      {sched.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <RotationThemeBadge themeType={sched.theme_type} />
                      {sched.theme_label && (
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {sched.theme_label}
                        </span>
                      )}
                      {sched.location && (
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          · {(sched.location as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: isOverdue ? "var(--env-rotation-overdue)" : "var(--text-secondary)" }}
                    >
                      {sched.scheduled_date}
                    </p>
                    <RotationStatusBadge status={sched.status} scheduledDate={sched.scheduled_date} />
                  </div>
                </div>

                {sched.rationale && (
                  <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
                    {sched.rationale}
                  </p>
                )}

                {sched.outcome_notes && sched.status === "completed" && (
                  <div
                    className="rounded-lg p-3 text-sm"
                    style={{ background: "var(--env-rotation-completed-bg)", color: "var(--env-rotation-completed-fg)" }}
                  >
                    <span className="font-medium">Outcome: </span>{sched.outcome_notes}
                  </div>
                )}

                {/* Complete form */}
                {isCompleting && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--input-bg)", color: "var(--text-primary)" }}
                      placeholder="Outcome notes (optional)..."
                      value={outcomeNotes}
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(sched.id)}
                        disabled={isPending}
                        className="active-push touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{ background: "var(--env-rotation-completed-bg)", color: "var(--env-rotation-completed-fg)" }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark complete
                      </button>
                      <button
                        onClick={() => { setCompletingId(null); setOutcomeNotes(""); }}
                        className="active-push touch-target px-3 py-1.5 rounded-lg border border-border text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {canManage && !isCompleting && (sched.status === "upcoming" || sched.status === "in_progress") && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { haptics.impact("light"); setCompletingId(sched.id); }}
                      className="active-push touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border"
                      style={{ color: "var(--env-rotation-completed)" }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </button>
                    <button
                      onClick={() => handleCancel(sched.id)}
                      disabled={isPending}
                      className="active-push touch-target flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
