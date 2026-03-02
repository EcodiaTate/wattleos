"use client";

import type { DrillStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  DrillStatus,
  { label: string; token: string }
> = {
  scheduled: { label: "Scheduled", token: "scheduled" },
  in_progress: { label: "In Progress", token: "in-progress" },
  completed: { label: "Completed", token: "completed" },
  cancelled: { label: "Cancelled", token: "cancelled" },
};

interface DrillStatusBadgeProps {
  status: DrillStatus;
}

export function DrillStatusBadge({ status }: DrillStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(--drill-${cfg.token})`,
        color: `var(--drill-${cfg.token}-fg)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
