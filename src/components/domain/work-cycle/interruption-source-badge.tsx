// src/components/domain/work-cycle/interruption-source-badge.tsx

import type { WorkCycleInterruptionSource, WorkCycleInterruptionSeverity } from "@/types/domain";
import { INTERRUPTION_SOURCE_CONFIG, INTERRUPTION_SEVERITY_CONFIG } from "@/lib/constants/work-cycle";

interface SourceBadgeProps {
  source: WorkCycleInterruptionSource;
  size?: "sm" | "md";
}

export function InterruptionSourceBadge({ source, size = "sm" }: SourceBadgeProps) {
  const config = INTERRUPTION_SOURCE_CONFIG[source];
  const px = size === "sm" ? "0.375rem 0.625rem" : "0.5rem 0.875rem";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: px,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 500,
        lineHeight: 1,
        color: config.fgVar,
        background: config.bgVar,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: WorkCycleInterruptionSeverity;
  size?: "sm" | "md";
}

export function InterruptionSeverityBadge({ severity, size = "sm" }: SeverityBadgeProps) {
  const config = INTERRUPTION_SEVERITY_CONFIG[severity];
  const px = size === "sm" ? "0.375rem 0.625rem" : "0.5rem 0.875rem";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: px,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
        color: config.fgVar,
        background: config.bgVar,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
