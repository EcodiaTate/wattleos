// src/components/domain/grant-tracking/grant-status-badge.tsx
"use client";

import type { GrantStatus, GrantMilestoneStatus } from "@/types/domain";

const STATUS_LABELS: Record<GrantStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  active: "Active",
  acquitted: "Acquitted",
  closed: "Closed",
};

const STATUS_TOKENS: Record<GrantStatus, string> = {
  draft: "grant-draft",
  submitted: "grant-submitted",
  approved: "grant-approved",
  active: "grant-active",
  acquitted: "grant-acquitted",
  closed: "grant-closed",
};

const MILESTONE_LABELS: Record<GrantMilestoneStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

const MILESTONE_TOKENS: Record<GrantMilestoneStatus, string> = {
  pending: "grant-milestone-pending",
  in_progress: "grant-milestone-in-progress",
  completed: "grant-milestone-completed",
  overdue: "grant-milestone-overdue",
};

interface BadgeProps {
  size?: "sm" | "md";
}

export function GrantStatusBadge({
  status,
  size = "sm",
}: BadgeProps & { status: GrantStatus }) {
  const token = STATUS_TOKENS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "sm" ? "0.15rem 0.5rem" : "0.25rem 0.65rem",
        borderRadius: "var(--radius)",
        background: `var(--${token}-bg)`,
        color: `var(--${token}-fg)`,
        fontSize: size === "sm" ? "0.72rem" : "0.8rem",
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function MilestoneStatusBadge({
  status,
  size = "sm",
}: BadgeProps & { status: GrantMilestoneStatus }) {
  const token = MILESTONE_TOKENS[status];
  const label = MILESTONE_LABELS[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "sm" ? "0.15rem 0.5rem" : "0.25rem 0.65rem",
        borderRadius: "var(--radius)",
        background: `var(--${token}-bg)`,
        color: `var(--${token}-fg)`,
        fontSize: size === "sm" ? "0.72rem" : "0.8rem",
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function GrantCategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    general: "General",
    capital: "Capital",
    professional_dev: "PD",
    curriculum: "Curriculum",
    technology: "Technology",
    community: "Community",
    research: "Research",
    other: "Other",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.15rem 0.5rem",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--muted-foreground)",
        fontSize: "0.72rem",
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {labels[category] ?? category}
    </span>
  );
}
