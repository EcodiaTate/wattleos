// src/components/domain/chronic-absence/chronic-absence-status-badge.tsx
"use client";

import { CHRONIC_ABSENCE_STATUS_CONFIG } from "@/lib/constants/chronic-absence";
import type { ChronicAbsenceStatus } from "@/types/domain";

interface ChronicAbsenceStatusBadgeProps {
  status: ChronicAbsenceStatus;
  size?: "sm" | "md";
}

export function ChronicAbsenceStatusBadge({
  status,
  size = "md",
}: ChronicAbsenceStatusBadgeProps) {
  const cfg = CHRONIC_ABSENCE_STATUS_CONFIG[status];
  const cssVar = cfg.cssVar; // e.g. "severe", "at-risk", "chronic", "good"

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        background: `var(--chronic-absence-${cssVar}-bg)`,
        color: `var(--chronic-absence-${cssVar}-fg)`,
        border: `1px solid var(--chronic-absence-${cssVar})`,
      }}
    >
      {cfg.label}
    </span>
  );
}
