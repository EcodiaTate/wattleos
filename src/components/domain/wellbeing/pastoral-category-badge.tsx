"use client";

import type { PastoralCategory } from "@/types/domain";
import { PASTORAL_CATEGORY_CONFIG } from "@/lib/constants/wellbeing";

interface PastoralCategoryBadgeProps {
  category: PastoralCategory;
  size?: "sm" | "md";
  showEmoji?: boolean;
}

export function PastoralCategoryBadge({
  category,
  size = "md",
  showEmoji = false,
}: PastoralCategoryBadgeProps) {
  const config = PASTORAL_CATEGORY_CONFIG[category];
  const padding = size === "sm" ? "0.2rem 0.5rem" : "0.25rem 0.625rem";
  const fontSize = size === "sm" ? "0.7rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 600,
        lineHeight: 1.25,
        backgroundColor: `var(--pastoral-${category}-bg)`,
        color: `var(--pastoral-${category})`,
        border: `1px solid var(--pastoral-${category})`,
        whiteSpace: "nowrap",
      }}
    >
      {showEmoji && config.emoji} {config.label}
    </span>
  );
}
