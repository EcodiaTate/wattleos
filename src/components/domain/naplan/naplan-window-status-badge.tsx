"use client";

// src/components/domain/naplan/naplan-window-status-badge.tsx

import { NAPLAN_WINDOW_STATUS_CONFIG } from "@/lib/constants/naplan";
import type { NaplanWindowStatus } from "@/types/domain";

interface NaplanWindowStatusBadgeProps {
  status: NaplanWindowStatus;
  size?: "sm" | "md";
}

export function NaplanWindowStatusBadge({
  status,
  size = "md",
}: NaplanWindowStatusBadgeProps) {
  const config = NAPLAN_WINDOW_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{
        background: `var(--${config.cssVar}-bg)`,
        color: `var(--${config.cssVar}-fg)`,
        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
        padding: size === "sm" ? "2px 8px" : "3px 10px",
      }}
    >
      {config.label}
    </span>
  );
}
