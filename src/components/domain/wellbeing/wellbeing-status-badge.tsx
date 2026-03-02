"use client";

import type { WellbeingFlagStatus } from "@/types/domain";
import { WELLBEING_STATUS_CONFIG } from "@/lib/constants/wellbeing";

interface WellbeingStatusBadgeProps {
  status: WellbeingFlagStatus;
  size?: "sm" | "md";
}

export function WellbeingStatusBadge({
  status,
  size = "md",
}: WellbeingStatusBadgeProps) {
  const config = WELLBEING_STATUS_CONFIG[status];
  const padding = size === "sm" ? "0.2rem 0.5rem" : "0.25rem 0.625rem";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";

  const cssKey = status.replace("_", "-");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 600,
        lineHeight: 1.25,
        backgroundColor: `var(--wellbeing-${cssKey}-bg)`,
        color: `var(--wellbeing-${cssKey})`,
        border: `1px solid var(--wellbeing-${cssKey})`,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
