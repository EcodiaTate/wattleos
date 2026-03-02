// src/components/domain/absence-followup/alert-status-badge.tsx

import { ALERT_STATUS_CONFIG } from "@/lib/constants/absence-followup";
import type { AbsenceAlertStatus } from "@/types/domain";

interface AlertStatusBadgeProps {
  status: AbsenceAlertStatus;
  size?: "sm" | "md";
}

export function AlertStatusBadge({
  status,
  size = "md",
}: AlertStatusBadgeProps) {
  const config = ALERT_STATUS_CONFIG[status];
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{
        color: `var(--absence-followup-${config.cssVar}-fg)`,
        background: `var(--absence-followup-${config.cssVar}-bg)`,
        border: `1px solid var(--absence-followup-${config.cssVar})`,
      }}
    >
      {config.label}
    </span>
  );
}
