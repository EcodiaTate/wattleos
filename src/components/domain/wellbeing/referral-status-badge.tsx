"use client";

import type { ReferralStatus } from "@/types/domain";
import { REFERRAL_STATUS_CONFIG } from "@/lib/constants/wellbeing";

interface ReferralStatusBadgeProps {
  status: ReferralStatus;
  size?: "sm" | "md";
}

export function ReferralStatusBadge({
  status,
  size = "md",
}: ReferralStatusBadgeProps) {
  const config = REFERRAL_STATUS_CONFIG[status];
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
        backgroundColor: `var(--referral-${cssKey}-bg)`,
        color: `var(--referral-${cssKey})`,
        border: `1px solid var(--referral-${cssKey})`,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
