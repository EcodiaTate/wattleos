"use client";

// src/components/domain/environment-planner/environment-plan-status-badge.tsx

import type { EnvironmentPlanStatus, RotationScheduleStatus, RotationThemeType } from "@/types/domain";

// ── Plan status ──────────────────────────────────────────────

const PLAN_STATUS_CONFIG: Record<
  EnvironmentPlanStatus,
  { label: string; fgVar: string; bgVar: string }
> = {
  draft: {
    label: "Draft",
    fgVar: "var(--env-plan-draft-fg)",
    bgVar: "var(--env-plan-draft-bg)",
  },
  active: {
    label: "Active",
    fgVar: "var(--env-plan-active-fg)",
    bgVar: "var(--env-plan-active-bg)",
  },
  archived: {
    label: "Archived",
    fgVar: "var(--env-plan-archived-fg)",
    bgVar: "var(--env-plan-archived-bg)",
  },
};

export function EnvironmentPlanStatusBadge({ status }: { status: EnvironmentPlanStatus }) {
  const cfg = PLAN_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.fgVar, backgroundColor: cfg.bgVar }}
    >
      {cfg.label}
    </span>
  );
}

// ── Rotation status ──────────────────────────────────────────

const ROTATION_STATUS_CONFIG: Record<
  RotationScheduleStatus | "overdue",
  { label: string; fgVar: string; bgVar: string }
> = {
  upcoming: {
    label: "Upcoming",
    fgVar: "var(--env-rotation-upcoming-fg)",
    bgVar: "var(--env-rotation-upcoming-bg)",
  },
  in_progress: {
    label: "In Progress",
    fgVar: "var(--env-rotation-in-progress-fg)",
    bgVar: "var(--env-rotation-in-progress-bg)",
  },
  completed: {
    label: "Completed",
    fgVar: "var(--env-rotation-completed-fg)",
    bgVar: "var(--env-rotation-completed-bg)",
  },
  cancelled: {
    label: "Cancelled",
    fgVar: "var(--env-rotation-cancelled-fg)",
    bgVar: "var(--env-rotation-cancelled-bg)",
  },
  overdue: {
    label: "Overdue",
    fgVar: "var(--env-rotation-overdue-fg)",
    bgVar: "var(--env-rotation-overdue-bg)",
  },
};

export function RotationStatusBadge({
  status,
  scheduledDate,
}: {
  status: RotationScheduleStatus;
  scheduledDate?: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const effectiveStatus =
    status === "upcoming" && scheduledDate && scheduledDate < today ? "overdue" : status;
  const cfg = ROTATION_STATUS_CONFIG[effectiveStatus];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: cfg.fgVar, backgroundColor: cfg.bgVar }}
    >
      {cfg.label}
    </span>
  );
}

// ── Theme type badge ──────────────────────────────────────────

const THEME_TYPE_CONFIG: Record<RotationThemeType, { label: string; cssVar: string }> = {
  seasonal:      { label: "Seasonal",      cssVar: "var(--env-theme-seasonal)" },
  thematic:      { label: "Thematic",      cssVar: "var(--env-theme-thematic)" },
  developmental: { label: "Developmental", cssVar: "var(--env-theme-developmental)" },
  custom:        { label: "Custom",        cssVar: "var(--env-theme-custom)" },
};

export function RotationThemeBadge({ themeType }: { themeType: RotationThemeType }) {
  const cfg = THEME_TYPE_CONFIG[themeType];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: cfg.cssVar }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: cfg.cssVar }}
      />
      {cfg.label}
    </span>
  );
}
