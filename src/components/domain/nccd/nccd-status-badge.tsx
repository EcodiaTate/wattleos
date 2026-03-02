"use client";

// src/components/domain/nccd/nccd-status-badge.tsx

import { NCCD_STATUS_CONFIG } from "@/lib/constants/nccd";
import type { NccdStatus } from "@/types/domain";

interface NccdStatusBadgeProps {
  status: NccdStatus;
  size?: "sm" | "md";
}

export function NccdStatusBadge({ status, size = "md" }: NccdStatusBadgeProps) {
  const config = NCCD_STATUS_CONFIG[status];
  const padding =
    size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{ background: config.bgVar, color: config.fgVar }}
    >
      {config.label}
    </span>
  );
}
