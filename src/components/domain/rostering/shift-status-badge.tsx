"use client";

import type { ShiftStatus } from "@/types/domain";
import { SHIFT_STATUS_CONFIG } from "@/lib/constants/rostering";

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const config = SHIFT_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: config.cssVar, color: config.cssVarFg }}
    >
      {config.label}
    </span>
  );
}
