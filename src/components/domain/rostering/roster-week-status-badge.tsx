"use client";

import type { RosterWeekStatus } from "@/types/domain";
import { ROSTER_WEEK_STATUS_CONFIG } from "@/lib/constants/rostering";

export function RosterWeekStatusBadge({ status }: { status: RosterWeekStatus }) {
  const config = ROSTER_WEEK_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: config.cssVar, color: config.cssVarFg }}
    >
      {config.label}
    </span>
  );
}
