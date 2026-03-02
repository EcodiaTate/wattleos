"use client";

import type { IlpGoalStatus } from "@/types/domain";
import { ILP_GOAL_STATUS_CONFIG } from "@/lib/constants/ilp";

interface GoalStatusBadgeProps {
  status: IlpGoalStatus;
}

export function GoalStatusBadge({ status }: GoalStatusBadgeProps) {
  const cfg = ILP_GOAL_STATUS_CONFIG[status];
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
