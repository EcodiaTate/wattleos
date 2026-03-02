"use client";

import type { IlpGoalPriority } from "@/types/domain";
import { ILP_PRIORITY_CONFIG } from "@/lib/constants/ilp";

interface PriorityBadgeProps {
  priority: IlpGoalPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const cfg = ILP_PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: cfg.cssVar,
        color: cfg.cssVarFg,
      }}
    >
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}
