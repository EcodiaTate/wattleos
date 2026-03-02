"use client";

import type { IlpPlanStatus } from "@/types/domain";
import { ILP_PLAN_STATUS_CONFIG } from "@/lib/constants/ilp";

interface PlanStatusBadgeProps {
  status: IlpPlanStatus;
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  const cfg = ILP_PLAN_STATUS_CONFIG[status];
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
