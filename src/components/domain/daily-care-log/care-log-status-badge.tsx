"use client";

import type { DailyCareLogStatus } from "@/types/domain";
import { DAILY_CARE_LOG_STATUS_CONFIG } from "@/lib/constants/daily-care";

interface CareLogStatusBadgeProps {
  status: DailyCareLogStatus;
}

export function CareLogStatusBadge({ status }: CareLogStatusBadgeProps) {
  const cfg = DAILY_CARE_LOG_STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: cfg.cssVar,
        color: cfg.cssVarFg,
      }}
    >
      {cfg.label}
    </span>
  );
}
