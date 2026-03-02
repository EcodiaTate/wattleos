"use client";

import type { CcsAbsenceCapSummary } from "@/types/domain";
import { CCS_ANNUAL_ABSENCE_CAP } from "@/lib/constants/ccs";

interface AbsenceCapBarProps {
  summary: CcsAbsenceCapSummary;
}

export function AbsenceCapBar({ summary }: AbsenceCapBarProps) {
  const percent = Math.min(
    100,
    (summary.capped_days_used / CCS_ANNUAL_ABSENCE_CAP) * 100,
  );

  const barColor = summary.is_at_cap
    ? "var(--ccs-rejected)"
    : summary.is_warning
      ? "var(--ccs-absence-capped)"
      : "var(--ccs-accepted)";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--foreground)" }}>
          {summary.student.first_name} {summary.student.last_name}
          {summary.student.crn && (
            <span style={{ color: "var(--muted-foreground)" }}>
              {" "}
              (CRN: {summary.student.crn})
            </span>
          )}
        </span>
        <span style={{ color: "var(--muted-foreground)" }}>
          {summary.capped_days_used} / {CCS_ANNUAL_ABSENCE_CAP} days
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {summary.uncapped_days > 0 && (
        <p
          className="text-xs"
          style={{ color: "var(--ccs-absence-uncapped)" }}
        >
          + {summary.uncapped_days} additional absence
          {summary.uncapped_days !== 1 ? "s" : ""} (uncapped)
        </p>
      )}
    </div>
  );
}
