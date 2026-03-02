// src/components/domain/debt/debt-stage-badge.tsx
"use client";

import type { DebtCollectionStage } from "@/types/domain";

const STAGE_CONFIG: Record<
  DebtCollectionStage,
  { label: string; token: string }
> = {
  overdue:         { label: "Overdue",       token: "debt-overdue" },
  reminder_1_sent: { label: "Reminder 1",    token: "debt-reminder" },
  reminder_2_sent: { label: "Reminder 2",    token: "debt-reminder" },
  reminder_3_sent: { label: "Final Notice",  token: "debt-reminder" },
  escalated:       { label: "Escalated",     token: "debt-escalated" },
  payment_plan:    { label: "Payment Plan",  token: "debt-payment-plan" },
  referred:        { label: "Referred",      token: "debt-referred" },
  written_off:     { label: "Written Off",   token: "debt-written-off" },
  resolved:        { label: "Resolved",      token: "debt-resolved" },
};

interface Props {
  stage: DebtCollectionStage;
  size?: "sm" | "md";
}

export function DebtStageBadge({ stage, size = "md" }: Props) {
  const { label, token } = STAGE_CONFIG[stage] ?? { label: stage, token: "debt-overdue" };
  const px = size === "sm" ? "0.35rem 0.6rem" : "0.3rem 0.65rem";
  const fs = size === "sm" ? "0.7rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: px,
        borderRadius: "var(--radius-full)",
        fontSize: fs,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        background: `var(--${token}-bg)`,
        color: `var(--${token}-fg)`,
      }}
    >
      {label}
    </span>
  );
}

interface AgingProps {
  daysOverdue: number;
  size?: "sm" | "md";
}

export function DebtAgingBadge({ daysOverdue, size = "md" }: AgingProps) {
  let token = "debt-aging-low";
  let label = `${daysOverdue}d`;
  if (daysOverdue > 90) { token = "debt-aging-high"; label = `${daysOverdue}d`; }
  else if (daysOverdue > 30) { token = "debt-aging-medium"; label = `${daysOverdue}d`; }

  const px = size === "sm" ? "0.2rem 0.5rem" : "0.25rem 0.6rem";
  const fs = size === "sm" ? "0.7rem" : "0.72rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: px,
        borderRadius: "var(--radius-full)",
        fontSize: fs,
        fontWeight: 700,
        lineHeight: 1.4,
        background: `var(--${token}-bg)`,
        color: `var(--${token}-fg)`,
      }}
    >
      {label}
    </span>
  );
}
