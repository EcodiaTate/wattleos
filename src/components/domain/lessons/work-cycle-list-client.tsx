"use client";

import { useState } from "react";
import Link from "next/link";
import type { LessonWorkCycleSession } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createLessonWorkCycleSession } from "@/lib/actions/lesson-tracking";
import { useRouter } from "next/navigation";

export function WorkCycleListClient({
  sessions,
  canManage,
}: {
  sessions: LessonWorkCycleSession[];
  canManage: boolean;
}) {
  const haptics = useHaptics();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");

  async function handleCreate() {
    haptics.impact("medium");
    setCreating(true);
    try {
      const result = await createLessonWorkCycleSession({
        session_date: date,
        start_time: startTime,
        end_time: endTime || undefined,
        interruptions: [],
        notes: undefined,
      });
      if (result.data) {
        haptics.success();
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick create */}
      {canManage && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            New Session
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <label className="space-y-1">
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Start
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <label className="space-y-1">
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                End
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="block rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {creating ? "Creating..." : "Create Session"}
            </button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div
            className="text-4xl mb-2"
            style={{ color: "var(--empty-state-icon)" }}
          >
            🧘
          </div>
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No work cycle sessions recorded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const interruptions = session.interruptions ?? [];
            const totalInterruptionMin = interruptions.reduce(
              (sum, i) => sum + (i.duration_minutes ?? 0),
              0,
            );

            return (
              <div
                key={session.id}
                className="card-interactive rounded-[var(--radius-md)] border border-border p-3 sm:p-4"
                style={{ background: "var(--card)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="font-medium text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {new Date(session.session_date + "T00:00").toLocaleDateString(
                        "en-AU",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {session.start_time}
                      {session.end_time ? ` – ${session.end_time}` : " (ongoing)"}
                      {interruptions.length > 0 &&
                        ` · ${interruptions.length} interruption${interruptions.length !== 1 ? "s" : ""} (${totalInterruptionMin} min)`}
                    </div>
                  </div>
                  {session.notes && (
                    <span
                      className="text-xs max-w-[200px] truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {session.notes}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
