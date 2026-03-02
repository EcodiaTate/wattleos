// src/components/domain/materials/material-condition-badge.tsx
"use client";

import type { MaterialCondition } from "@/types/domain";
import { MATERIAL_CONDITION_CONFIG } from "@/lib/constants/materials";

interface MaterialConditionBadgeProps {
  condition: MaterialCondition;
  size?: "sm" | "md";
}

export function MaterialConditionBadge({
  condition,
  size = "md",
}: MaterialConditionBadgeProps) {
  const config = MATERIAL_CONDITION_CONFIG[condition];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        color:           `var(--material-condition-${config.cssVar}-fg)`,
        backgroundColor: `var(--material-condition-${config.cssVar}-bg)`,
      }}
      title={config.description}
    >
      {config.label}
    </span>
  );
}
