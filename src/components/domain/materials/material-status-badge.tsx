// src/components/domain/materials/material-status-badge.tsx
"use client";

import type { MaterialInventoryStatus } from "@/types/domain";
import { MATERIAL_STATUS_CONFIG } from "@/lib/constants/materials";

interface MaterialStatusBadgeProps {
  status: MaterialInventoryStatus;
  size?: "sm" | "md";
}

export function MaterialStatusBadge({
  status,
  size = "md",
}: MaterialStatusBadgeProps) {
  const config = MATERIAL_STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        color:           `var(--material-status-${config.cssVar}-fg)`,
        backgroundColor: `var(--material-status-${config.cssVar}-bg)`,
      }}
      title={config.description}
    >
      {config.label}
    </span>
  );
}
