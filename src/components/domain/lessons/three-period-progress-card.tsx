"use client";

// src/components/domain/lessons/three-period-progress-card.tsx
// ============================================================
// Shows a single material's 3PL progress for one student.
// Displays three stage dots with the current period highlighted.
// ============================================================

import Link from "next/link";

import type { MaterialThreePeriodProgress, MontessoriArea } from "@/types/domain";

import { ThreePeriodStatusBadge } from "./three-period-status-badge";

// ── Area label helper ────────────────────────────────────────

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREA_EMOJI: Record<MontessoriArea, string> = {
  practical_life: "🧹",
  sensorial: "✨",
  language: "🔤",
  mathematics: "🔢",
  cultural: "🌍",
};

// ── Stage progress strip ─────────────────────────────────────

function StageStrip({
  progress,
}: {
  progress: MaterialThreePeriodProgress;
}) {
  const latestLesson = progress.lessons[0]; // sorted desc by date

  const statusFor = (period: 1 | 2 | 3) => {
    if (!latestLesson) return "not_started";
    if (period === 1) return latestLesson.period_1_status;
    if (period === 2) return latestLesson.period_2_status;
    return latestLesson.period_3_status;
  };

  return (
    <div className="flex items-center gap-1">
      {([1, 2, 3] as const).map((p) => {
        const status = statusFor(p);
        const isCurrent = progress.current_period === p;
        return (
          <div key={p} className="flex flex-col items-center gap-0.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
              style={
                status === "completed"
                  ? {
                      backgroundColor: "var(--3pl-completed)",
                      color: "var(--3pl-completed-fg)",
                    }
                  : status === "needs_repeat"
                    ? {
                        backgroundColor: "var(--3pl-needs-repeat)",
                        color: "var(--3pl-needs-repeat-fg)",
                        outline: isCurrent
                          ? "2px solid var(--3pl-needs-repeat)"
                          : undefined,
                        outlineOffset: "2px",
                      }
                    : isCurrent
                      ? {
                          backgroundColor: "var(--primary)",
                          color: "var(--primary-foreground)",
                          outline: "2px solid var(--primary)",
                          outlineOffset: "2px",
                        }
                      : {
                          backgroundColor: "var(--muted)",
                          color: "var(--muted-foreground)",
                        }
              }
            >
              {status === "completed" ? "✓" : p}
            </div>
          </div>
        );
      })}
      {progress.current_period === "complete" && (
        <span
          className="ml-1 text-xs font-semibold"
          style={{ color: "var(--3pl-completed)" }}
        >
          Complete!
        </span>
      )}
    </div>
  );
}

// ── Main card ────────────────────────────────────────────────

interface ThreePeriodProgressCardProps {
  progress: MaterialThreePeriodProgress;
  studentId: string;
  onRecord?: (materialId: string) => void;
}

export function ThreePeriodProgressCard({
  progress,
  studentId,
  onRecord,
}: ThreePeriodProgressCardProps) {
  const latestLesson = progress.lessons[0];

  return (
    <div className="card-interactive rounded-xl border border-border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">
              {AREA_EMOJI[progress.area]}
            </span>
            <span
              className="truncate font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {progress.material_name}
            </span>
          </div>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {AREA_LABELS[progress.area]} ·{" "}
            {progress.lessons.length} session
            {progress.lessons.length !== 1 ? "s" : ""}
          </p>
        </div>

        {onRecord && progress.current_period !== "complete" && (
          <button
            type="button"
            onClick={() => onRecord(progress.material_id)}
            className="active-push touch-target shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Record
          </button>
        )}
      </div>

      {/* Stage dots */}
      <StageStrip progress={progress} />

      {/* Last lesson info */}
      {latestLesson && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ThreePeriodStatusBadge
            status={latestLesson.period_1_status}
            size="sm"
          />
          {latestLesson.period_2_status !== "not_started" && (
            <ThreePeriodStatusBadge
              status={latestLesson.period_2_status}
              size="sm"
            />
          )}
          {latestLesson.period_3_status !== "not_started" && (
            <ThreePeriodStatusBadge
              status={latestLesson.period_3_status}
              size="sm"
            />
          )}
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {latestLesson.lesson_date}
          </span>
        </div>
      )}
    </div>
  );
}
