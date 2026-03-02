"use client";

// src/components/domain/lessons/three-period-status-badge.tsx
// ============================================================
// Badge for a single three-period lesson period status.
// ============================================================

import type { ThreePeriodStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  ThreePeriodStatus,
  { label: string; var: string; fgVar: string; bgVar: string }
> = {
  not_started: {
    label: "Not started",
    var: "--3pl-not-started",
    fgVar: "--3pl-not-started-fg",
    bgVar: "--3pl-not-started-bg",
  },
  completed: {
    label: "Completed",
    var: "--3pl-completed",
    fgVar: "--3pl-completed-fg",
    bgVar: "--3pl-completed-bg",
  },
  needs_repeat: {
    label: "Needs repeat",
    var: "--3pl-needs-repeat",
    fgVar: "--3pl-needs-repeat-fg",
    bgVar: "--3pl-needs-repeat-bg",
  },
};

interface ThreePeriodStatusBadgeProps {
  status: ThreePeriodStatus;
  size?: "sm" | "md";
}

export function ThreePeriodStatusBadge({
  status,
  size = "md",
}: ThreePeriodStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          : "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      }
      style={{
        color: `var(${cfg.fgVar})`,
        backgroundColor: `var(${cfg.bgVar})`,
        border: `1px solid var(${cfg.var})`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Sensitive period intensity badge ────────────────────────

import type { SensitivePeriodIntensity } from "@/types/domain";

const INTENSITY_CONFIG: Record<
  SensitivePeriodIntensity,
  { label: string; emoji: string; fgVar: string; bgVar: string; borderVar: string }
> = {
  emerging: {
    label: "Emerging",
    emoji: "🌱",
    fgVar: "--sp-emerging-fg",
    bgVar: "--sp-emerging-bg",
    borderVar: "--sp-emerging",
  },
  active: {
    label: "Active",
    emoji: "⚡",
    fgVar: "--sp-active-fg",
    bgVar: "--sp-active-bg",
    borderVar: "--sp-active",
  },
  peak: {
    label: "Peak",
    emoji: "🔥",
    fgVar: "--sp-peak-fg",
    bgVar: "--sp-peak-bg",
    borderVar: "--sp-peak",
  },
  waning: {
    label: "Waning",
    emoji: "🌅",
    fgVar: "--sp-waning-fg",
    bgVar: "--sp-waning-bg",
    borderVar: "--sp-waning",
  },
};

interface SensitivePeriodBadgeProps {
  intensity: SensitivePeriodIntensity;
  showEmoji?: boolean;
  size?: "sm" | "md";
}

export function SensitivePeriodBadge({
  intensity,
  showEmoji = true,
  size = "md",
}: SensitivePeriodBadgeProps) {
  const cfg = INTENSITY_CONFIG[intensity];
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      }
      style={{
        color: `var(${cfg.fgVar})`,
        backgroundColor: `var(${cfg.bgVar})`,
        border: `1px solid var(${cfg.borderVar})`,
      }}
    >
      {showEmoji && <span>{cfg.emoji}</span>}
      {cfg.label}
    </span>
  );
}
