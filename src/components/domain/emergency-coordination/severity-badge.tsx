"use client";

import type { EmergencyEventSeverity } from "@/types/domain";

const SEVERITY_CONFIG: Record<
  EmergencyEventSeverity,
  { label: string; color: string; fg: string; bg: string }
> = {
  critical: {
    label: "CRITICAL",
    color: "var(--emergency-critical)",
    fg: "var(--emergency-critical-fg)",
    bg: "var(--emergency-critical-bg)",
  },
  high: {
    label: "HIGH",
    color: "var(--emergency-high)",
    fg: "var(--emergency-high-fg)",
    bg: "var(--emergency-high-bg)",
  },
  medium: {
    label: "MEDIUM",
    color: "var(--emergency-medium)",
    fg: "var(--emergency-medium-fg)",
    bg: "var(--emergency-medium-bg)",
  },
};

export function SeverityBadge({
  severity,
}: {
  severity: EmergencyEventSeverity;
}) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tracking-wider uppercase"
      style={{
        color: config.fg,
        backgroundColor: config.bg,
        borderColor: config.color,
        borderWidth: "1px",
        borderStyle: "solid",
      }}
    >
      {config.label}
    </span>
  );
}
