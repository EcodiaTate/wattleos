"use client";

// src/components/domain/nccd/nccd-category-tag.tsx
//
// Tag showing the NCCD disability category with emoji.

import { NCCD_CATEGORY_CONFIG } from "@/lib/constants/nccd";
import type { NccdDisabilityCategory } from "@/types/domain";

interface NccdCategoryTagProps {
  category: NccdDisabilityCategory;
  showEmoji?: boolean;
}

export function NccdCategoryTag({
  category,
  showEmoji = true,
}: NccdCategoryTagProps) {
  const config = NCCD_CATEGORY_CONFIG[category];

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
      style={{
        background: "var(--muted)",
        color: config.cssVar,
      }}
      title={config.description}
    >
      {showEmoji && <span>{config.emoji}</span>}
      {config.label}
    </span>
  );
}
