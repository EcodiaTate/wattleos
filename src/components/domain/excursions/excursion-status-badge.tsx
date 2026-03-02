"use client";

import type { ExcursionStatus } from "@/types/domain";

interface ExcursionStatusBadgeProps {
  status: ExcursionStatus;
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<ExcursionStatus, string> = {
  planning: "Planning",
  risk_assessed: "Risk Assessed",
  consents_pending: "Consents Pending",
  ready_to_depart: "Ready",
  in_progress: "In Progress",
  returned: "Returned",
  cancelled: "Cancelled",
};

const STATUS_TOKENS: Record<ExcursionStatus, { bg: string; fg: string }> = {
  planning: {
    bg: "var(--excursion-planning-bg)",
    fg: "var(--excursion-planning)",
  },
  risk_assessed: {
    bg: "var(--excursion-risk-assessed-bg)",
    fg: "var(--excursion-risk-assessed)",
  },
  consents_pending: {
    bg: "var(--excursion-consents-pending-bg)",
    fg: "var(--excursion-consents-pending)",
  },
  ready_to_depart: {
    bg: "var(--excursion-ready-bg)",
    fg: "var(--excursion-ready)",
  },
  in_progress: {
    bg: "var(--excursion-in-progress-bg)",
    fg: "var(--excursion-in-progress)",
  },
  returned: {
    bg: "var(--excursion-returned-bg)",
    fg: "var(--excursion-returned)",
  },
  cancelled: {
    bg: "var(--excursion-cancelled-bg)",
    fg: "var(--excursion-cancelled)",
  },
};

export function ExcursionStatusBadge({
  status,
  size = "sm",
}: ExcursionStatusBadgeProps) {
  const tokens = STATUS_TOKENS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{
        backgroundColor: tokens.bg,
        color: tokens.fg,
      }}
    >
      {label}
    </span>
  );
}
