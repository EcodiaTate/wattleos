"use client";

import { classifyNormalizationLevel, NORMALIZATION_LEVEL_CONFIG } from "@/lib/constants/normalization";

interface NormalizationLevelBadgeProps {
  avgRating: number | null;
  size?: "sm" | "md";
}

export function NormalizationLevelBadge({ avgRating, size = "sm" }: NormalizationLevelBadgeProps) {
  if (avgRating === null) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        No data
      </span>
    );
  }

  const level = classifyNormalizationLevel(avgRating);
  const config = NORMALIZATION_LEVEL_CONFIG[level];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{
        color: `var(${config.cssVar}-fg)`,
        backgroundColor: `var(${config.cssVar}-bg)`,
      }}
    >
      {config.label}
    </span>
  );
}
