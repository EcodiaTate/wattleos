"use client";

import type { CoverageUrgency } from "@/types/domain";
import { COVERAGE_URGENCY_CONFIG } from "@/lib/constants/rostering";

export function CoverageUrgencyBadge({ urgency }: { urgency: CoverageUrgency }) {
  const config = COVERAGE_URGENCY_CONFIG[urgency];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: config.cssVar, color: config.cssVarFg }}
    >
      {config.label}
    </span>
  );
}
