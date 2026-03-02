"use client";

// src/components/domain/acara/acara-status-badge.tsx
//
// Pill badge for ACARA report period status.

import type { AcaraReportStatus } from "@/types/domain";

const STATUS_LABELS: Record<AcaraReportStatus, string> = {
  draft:     "Draft",
  verified:  "Verified",
  exported:  "Exported",
  submitted: "Submitted",
};

interface Props {
  status: AcaraReportStatus;
  size?: "sm" | "md";
}

export function AcaraStatusBadge({ status, size = "md" }: Props) {
  const label = STATUS_LABELS[status];
  const px = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${px}`}
      style={{
        background: `var(--acara-${status}-bg)`,
        color: `var(--acara-${status}-fg)`,
        border: `1px solid var(--acara-${status})`,
      }}
    >
      {label}
    </span>
  );
}

// ── Attendance rate band badge ────────────────────────────────

type RateBand = "good" | "at-risk" | "chronic" | "severe";

function rateToband(rate: number): RateBand {
  if (rate < 70) return "severe";
  if (rate < 80) return "chronic";
  if (rate < 85) return "at-risk";
  return "good";
}

const RATE_LABELS: Record<RateBand, string> = {
  good:    "≥85%",
  "at-risk": "80–85%",
  chronic:  "70–80%",
  severe:  "<70%",
};

interface RateBadgeProps {
  rate: number;
  showValue?: boolean;
  size?: "sm" | "md";
}

export function AcaraRateBadge({ rate, showValue = true, size = "md" }: RateBadgeProps) {
  const band = rateToband(rate);
  const token = `acara-rate-${band}`;
  const px = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tabular-nums ${px}`}
      style={{
        background: `var(--${token}-bg)`,
        color: `var(--${token}-fg)`,
        border: `1px solid var(--${token})`,
      }}
    >
      {showValue ? `${rate.toFixed(1)}%` : RATE_LABELS[band]}
    </span>
  );
}
