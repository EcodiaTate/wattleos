"use client";

import type { EmergencyDrill } from "@/types/domain";

interface DrillTimelineProps {
  drill: EmergencyDrill;
}

interface Step {
  label: string;
  time: string | null;
  done: boolean;
  active: boolean;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DrillTimeline({ drill }: DrillTimelineProps) {
  const steps: Step[] = [
    {
      label: "Scheduled",
      time: drill.scheduled_date,
      done: true,
      active: drill.status === "scheduled",
    },
    {
      label: "Started",
      time: drill.actual_start_at,
      done: !!drill.actual_start_at,
      active: drill.status === "in_progress",
    },
    {
      label: "Completed",
      time: drill.actual_end_at,
      done: drill.status === "completed",
      active: drill.status === "completed" && !drill.effectiveness_rating,
    },
    {
      label: "Debriefed",
      time: null,
      done: !!drill.effectiveness_rating,
      active: false,
    },
  ];

  if (drill.status === "cancelled") {
    return (
      <div
        className="rounded-[var(--radius-md)] px-3 py-2 text-sm"
        style={{
          background: "var(--drill-cancelled-bg)",
          color: "var(--drill-cancelled)",
        }}
      >
        Drill cancelled
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          {i > 0 && (
            <div
              className="h-px w-6"
              style={{
                background: step.done
                  ? "var(--drill-completed)"
                  : "var(--border)",
              }}
            />
          )}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
              style={{
                background: step.done
                  ? "var(--drill-completed)"
                  : step.active
                    ? "var(--drill-in-progress)"
                    : "var(--muted)",
                color: step.done
                  ? "var(--drill-completed-fg)"
                  : step.active
                    ? "var(--drill-in-progress-fg)"
                    : "var(--muted-foreground)",
              }}
            >
              {step.done ? "✓" : i + 1}
            </div>
            <span
              className="text-[10px] font-medium"
              style={{
                color: step.done || step.active
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
              }}
            >
              {step.label}
            </span>
            {step.time && (
              <span
                className="text-[9px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {formatDateTime(step.time)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
