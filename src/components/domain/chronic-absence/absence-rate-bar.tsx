// src/components/domain/chronic-absence/absence-rate-bar.tsx
//
// Visual rate indicator showing the attendance percentage with
// threshold markers. Used in student list rows and detail views.
"use client";

import type { AbsenceMonitoringConfig, ChronicAbsenceStatus } from "@/types/domain";

interface AbsenceRateBarProps {
  rate: number;                     // 0–100
  status: ChronicAbsenceStatus;
  config: AbsenceMonitoringConfig;
  showLabel?: boolean;
  compact?: boolean;
}

export function AbsenceRateBar({
  rate,
  status,
  config,
  showLabel = true,
  compact = false,
}: AbsenceRateBarProps) {
  const cssVar = status === "at_risk" ? "at-risk" : status;
  const barColor = `var(--chronic-absence-${cssVar})`;
  const clampedRate = Math.max(0, Math.min(100, rate));

  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span
            className={`font-semibold tabular-nums ${compact ? "text-xs" : "text-sm"}`}
            style={{ color: barColor }}
          >
            {rate.toFixed(1)}%
          </span>
          <span className={`text-muted-foreground ${compact ? "text-xs" : "text-xs"}`}>
            attendance
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className={`relative w-full rounded-full overflow-hidden ${compact ? "h-1.5" : "h-2"}`}
        style={{ background: "var(--muted)" }}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${clampedRate}%`,
            background: barColor,
          }}
        />

        {/* Threshold markers */}
        {!compact && (
          <>
            {/* Severe threshold */}
            <div
              className="absolute inset-y-0 w-px"
              style={{
                left: `${config.severe_threshold}%`,
                background: `var(--chronic-absence-severe)`,
                opacity: 0.5,
              }}
            />
            {/* Chronic threshold */}
            <div
              className="absolute inset-y-0 w-px"
              style={{
                left: `${config.chronic_threshold}%`,
                background: `var(--chronic-absence-chronic)`,
                opacity: 0.5,
              }}
            />
            {/* At-risk threshold */}
            <div
              className="absolute inset-y-0 w-px"
              style={{
                left: `${config.at_risk_threshold}%`,
                background: `var(--chronic-absence-at-risk)`,
                opacity: 0.5,
              }}
            />
          </>
        )}
      </div>

      {/* Threshold labels (non-compact) */}
      {!compact && showLabel && (
        <div className="relative w-full text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span
            className="absolute transform -translate-x-1/2"
            style={{ left: `${config.severe_threshold}%` }}
          >
            {config.severe_threshold}%
          </span>
          <span
            className="absolute transform -translate-x-1/2"
            style={{ left: `${config.chronic_threshold}%` }}
          >
            {config.chronic_threshold}%
          </span>
          <span
            className="absolute transform -translate-x-1/2"
            style={{ left: `${config.at_risk_threshold}%` }}
          >
            {config.at_risk_threshold}%
          </span>
        </div>
      )}
    </div>
  );
}
