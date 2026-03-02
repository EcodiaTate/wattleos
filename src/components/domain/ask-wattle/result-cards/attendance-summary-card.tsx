"use client";

import type { AttendanceSummaryData } from "@/types/ask-wattle";

interface Props {
  data: AttendanceSummaryData["data"];
}

const COUNT_STYLES: Record<string, { bg: string; color: string }> = {
  present: { bg: "color-mix(in srgb, var(--attendance-present) 12%, transparent)", color: "var(--attendance-present-fg)" },
  absent: { bg: "color-mix(in srgb, var(--attendance-absent) 12%, transparent)", color: "var(--attendance-absent-fg)" },
  late: { bg: "color-mix(in srgb, var(--attendance-late) 12%, transparent)", color: "var(--attendance-late-fg)" },
  excused: { bg: "color-mix(in srgb, var(--attendance-excused) 12%, transparent)", color: "var(--attendance-excused-fg)" },
  half_day: { bg: "color-mix(in srgb, var(--attendance-half-day) 12%, transparent)", color: "var(--attendance-half-day-fg)" },
  unmarked: { bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", color: "var(--muted-foreground)" },
};

export function AttendanceSummaryCard({ data }: Props) {
  const completionPct = data.total_students > 0
    ? Math.round(((data.total_students - data.counts.unmarked) / data.total_students) * 100)
    : 0;

  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--wattle-dark)" }}>
          {data.class_name}
        </span>
        <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
          {data.date_display}
        </span>
      </div>

      {/* Completion bar */}
      <div className="mb-2.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium" style={{ color: data.roll_complete ? "var(--attendance-present-fg)" : "var(--attendance-late-fg)" }}>
            {data.roll_complete ? "Roll complete" : `${completionPct}% marked`}
          </span>
          <span className="text-[11px]" style={{ color: "var(--wattle-tan)" }}>
            {data.total_students - data.counts.unmarked}/{data.total_students}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completionPct}%`,
              background: data.roll_complete
                ? "linear-gradient(90deg, var(--attendance-present), var(--success))"
                : "linear-gradient(90deg, var(--wattle-gold-muted), var(--wattle-gold))",
            }}
          />
        </div>
      </div>

      {/* Count pills */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(data.counts) as [string, number][])
          .filter(([, count]) => count > 0)
          .map(([status, count]) => {
            const style = COUNT_STYLES[status] ?? COUNT_STYLES.unmarked;
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: style.bg, color: style.color }}
              >
                <span>{count}</span>
                <span className="capitalize">{status === "half_day" ? "half day" : status}</span>
              </span>
            );
          })}
      </div>

      {/* Name lists */}
      {data.absent_names.length > 0 && (
        <div className="mt-2 text-[11px]" style={{ color: "var(--destructive)" }}>
          Absent: {data.absent_names.join(", ")}
        </div>
      )}
      {data.late_names.length > 0 && (
        <div className="mt-1 text-[11px]" style={{ color: "var(--attendance-late-fg)" }}>
          Late: {data.late_names.join(", ")}
        </div>
      )}
      {data.unmarked_names.length > 0 && data.unmarked_names.length <= 5 && (
        <div className="mt-1 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          Not marked: {data.unmarked_names.join(", ")}
        </div>
      )}
    </div>
  );
}
