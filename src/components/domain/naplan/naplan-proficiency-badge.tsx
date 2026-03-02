"use client";

// src/components/domain/naplan/naplan-proficiency-badge.tsx

import { NAPLAN_PROFICIENCY_CONFIG } from "@/lib/constants/naplan";
import type { NaplanProficiencyLevel } from "@/types/domain";

interface NaplanProficiencyBadgeProps {
  level: NaplanProficiencyLevel;
  size?: "sm" | "md";
  showShort?: boolean;
}

export function NaplanProficiencyBadge({
  level,
  size = "md",
  showShort = false,
}: NaplanProficiencyBadgeProps) {
  const config = NAPLAN_PROFICIENCY_CONFIG[level];
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{
        background: `var(--${config.cssVar}-bg)`,
        color: `var(--${config.cssVar}-fg)`,
        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
        padding: size === "sm" ? "2px 7px" : "3px 10px",
      }}
      title={config.label}
    >
      {showShort ? config.shortLabel : config.label}
    </span>
  );
}

// Standalone dot for compact grids
export function NaplanProficiencyDot({
  level,
}: {
  level: NaplanProficiencyLevel | null;
}) {
  if (!level) {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ background: "var(--border)" }}
        title="Not entered"
      />
    );
  }
  const config = NAPLAN_PROFICIENCY_CONFIG[level];
  return (
    <span
      className="inline-block h-3 w-3 rounded-full"
      style={{ background: `var(--${config.cssVar})` }}
      title={config.label}
    />
  );
}
