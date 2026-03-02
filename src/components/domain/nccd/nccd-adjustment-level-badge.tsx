"use client";

// src/components/domain/nccd/nccd-adjustment-level-badge.tsx
//
// Coloured badge showing the NCCD adjustment level.
// Used in list rows, cards, and the dashboard summary.

import { NCCD_LEVEL_CONFIG } from "@/lib/constants/nccd";
import type { NccdAdjustmentLevel } from "@/types/domain";

interface NccdAdjustmentLevelBadgeProps {
  level: NccdAdjustmentLevel;
  size?: "sm" | "md";
  showFull?: boolean;
}

export function NccdAdjustmentLevelBadge({
  level,
  size = "md",
  showFull = false,
}: NccdAdjustmentLevelBadgeProps) {
  const config = NCCD_LEVEL_CONFIG[level];

  const label = showFull ? config.label : config.shortLabel;

  const padding = size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        background: config.bgVar,
        color: config.fgVar,
      }}
      title={config.description}
    >
      {label}
    </span>
  );
}
