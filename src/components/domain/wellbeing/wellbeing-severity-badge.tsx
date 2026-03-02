"use client";

import type { WellbeingFlagSeverity } from "@/types/domain";
import { WELLBEING_SEVERITY_CONFIG } from "@/lib/constants/wellbeing";

interface WellbeingSeverityBadgeProps {
  severity: WellbeingFlagSeverity;
  size?: "sm" | "md";
  className?: string;
}

export function WellbeingSeverityBadge({
  severity,
  size = "md",
  className,
}: WellbeingSeverityBadgeProps) {
  const config = WELLBEING_SEVERITY_CONFIG[severity];
  const padding = size === "sm" ? "0.2rem 0.5rem" : "0.25rem 0.625rem";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 600,
        lineHeight: 1.25,
        backgroundColor: "var(--wellbeing-"+severity+"-bg)",
        color: "var(--wellbeing-"+severity+")",
        border: "1px solid var(--wellbeing-"+severity+")",
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
