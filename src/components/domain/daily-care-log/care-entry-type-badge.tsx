"use client";

import type { CareEntryType } from "@/types/domain";
import { CARE_ENTRY_TYPE_CONFIG } from "@/lib/constants/daily-care";

interface CareEntryTypeBadgeProps {
  entryType: CareEntryType;
  size?: "sm" | "md";
}

export function CareEntryTypeBadge({
  entryType,
  size = "sm",
}: CareEntryTypeBadgeProps) {
  const cfg = CARE_ENTRY_TYPE_CONFIG[entryType];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{
        background: cfg.cssVar,
        color: cfg.cssVarFg,
      }}
    >
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  );
}
