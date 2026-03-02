"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  startDrill,
  completeDrill,
  cancelDrill,
} from "@/lib/actions/emergency-drills";
import type { EmergencyDrill } from "@/types/domain";

interface DrillExecutionPanelProps {
  drill: EmergencyDrill;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DrillExecutionPanel({ drill }: DrillExecutionPanelProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [evacMinutes, setEvacMinutes] = useState("");
  const [evacSeconds, setEvacSeconds] = useState("");

  // Timer for in-progress drills
  useEffect(() => {
    if (drill.status !== "in_progress" || !drill.actual_start_at) return;

    const startMs = new Date(drill.actual_start_at).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [drill.status, drill.actual_start_at]);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startDrill(drill.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.impact("heavy");
      router.refresh();
    });
  }

  function handleComplete() {
    setError(null);
    const totalSeconds =
      (parseInt(evacMinutes || "0", 10) || 0) * 60 +
      (parseInt(evacSeconds || "0", 10) || 0);

    startTransition(async () => {
      const result = await completeDrill(drill.id, {
        evacuation_time_seconds: totalSeconds > 0 ? totalSeconds : null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelDrill(drill.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.light();
      router.refresh();
    });
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
      style={{ background: "var(--card)" }}
    >
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Scheduled state - Start button */}
      {drill.status === "scheduled" && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Ready to begin the drill? This will mark it as in progress and start
            the timer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={isPending}
              className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--drill-in-progress)",
                color: "var(--drill-in-progress-fg)",
              }}
            >
              {isPending ? "Starting..." : "Start Drill"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* In progress state - Timer + Complete button */}
      {drill.status === "in_progress" && (
        <div className="space-y-4">
          {/* Elapsed timer */}
          <div className="text-center">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Elapsed Time
            </p>
            <p
              className="mt-1 font-mono text-4xl font-bold tabular-nums"
              style={{ color: "var(--drill-in-progress)" }}
            >
              {formatElapsed(elapsed)}
            </p>
          </div>

          {/* Evacuation time input */}
          <div className="space-y-1">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Evacuation Time (optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="120"
                placeholder="min"
                value={evacMinutes}
                onChange={(e) => setEvacMinutes(e.target.value)}
                className="w-20 rounded-[var(--radius-md)] border border-border px-3 py-2 text-center text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
              <span style={{ color: "var(--muted-foreground)" }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="sec"
                value={evacSeconds}
                onChange={(e) => setEvacSeconds(e.target.value)}
                className="w-20 rounded-[var(--radius-md)] border border-border px-3 py-2 text-center text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleComplete}
            disabled={isPending}
            className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--drill-completed)",
              color: "var(--drill-completed-fg)",
            }}
          >
            {isPending ? "Completing..." : "All Clear \u2014 Complete Drill"}
          </button>
        </div>
      )}
    </div>
  );
}
