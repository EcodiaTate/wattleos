"use client";

import type { IlpSupportCategory } from "@/types/domain";
import { SUPPORT_CATEGORY_CONFIG } from "@/lib/constants/ilp";

interface SupportCategoryTagsProps {
  categories: IlpSupportCategory[];
}

export function SupportCategoryTags({ categories }: SupportCategoryTagsProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const cfg = SUPPORT_CATEGORY_CONFIG[cat];
        return (
          <span
            key={cat}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            <span>{cfg.emoji}</span>
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}
