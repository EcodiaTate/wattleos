"use client";

// src/components/domain/ratios/breach-prediction.tsx
//
// Buffer card: shows how many educators can leave before a breach occurs.
// If buffer is 0 it shows a warning; if already breached it shows the shortfall.

import type { RatioBreakdown } from "@/lib/actions/ratios";

interface BreachPredictionProps {
  breakdown: RatioBreakdown;
}

export function BreachPrediction({ breakdown }: BreachPredictionProps) {
  const {
    educators_on_floor,
    required_educators,
    buffer_educators,
    class_name,
  } = breakdown;

  const isBreached = educators_on_floor < required_educators;
  const isWarning = !isBreached && buffer_educators <= 1;

  const bgVar = isBreached
    ? "var(--attendance-absent-bg, #fee2e2)"
    : isWarning
      ? "var(--warning-bg, #fef3c7)"
      : "var(--attendance-present-bg, #dcfce7)";

  const fgVar = isBreached
    ? "var(--attendance-absent-fg, #991b1b)"
    : isWarning
      ? "var(--warning-fg, #92400e)"
      : "var(--attendance-present-fg, #166534)";

  const icon = isBreached ? "🔴" : isWarning ? "⚠️" : "🟢";

  const headline = isBreached
    ? `${required_educators - educators_on_floor} educator${required_educators - educators_on_floor !== 1 ? "s" : ""} short`
    : buffer_educators === 0
      ? "No buffer - any absence causes breach"
      : `${buffer_educators} educator${buffer_educators !== 1 ? "s" : ""} can leave safely`;

  const sub = isBreached
    ? `${class_name} needs ${required_educators} on floor (${educators_on_floor} present)`
    : isWarning
      ? `If one educator leaves, ${class_name} will breach ratio`
      : `${class_name} has room to accommodate a break or absence`;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: bgVar,
        borderColor: fgVar,
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: fgVar }}
      >
        Breach Prediction
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xl leading-none">{icon}</span>
        <p className="text-sm font-semibold" style={{ color: fgVar }}>
          {headline}
        </p>
      </div>

      <p className="mt-1 text-xs" style={{ color: fgVar, opacity: 0.8 }}>
        {sub}
      </p>

      {/* Quick ratio facts */}
      <div
        className="mt-3 flex gap-4 border-t pt-3 text-xs"
        style={{ borderColor: fgVar, opacity: 0.9 }}
      >
        <span style={{ color: fgVar }}>
          On floor: <strong>{educators_on_floor}</strong>
        </span>
        <span style={{ color: fgVar }}>
          Required: <strong>{required_educators}</strong>
        </span>
        <span style={{ color: fgVar }}>
          Buffer: <strong>{buffer_educators}</strong>
        </span>
      </div>
    </div>
  );
}
