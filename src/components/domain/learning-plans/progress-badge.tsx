"use client";

import type { IlpProgressRating } from "@/types/domain";
import { PROGRESS_RATING_CONFIG } from "@/lib/constants/ilp";

interface ProgressBadgeProps {
  rating: IlpProgressRating;
}

export function ProgressBadge({ rating }: ProgressBadgeProps) {
  const cfg = PROGRESS_RATING_CONFIG[rating];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: cfg.cssVar,
        color: cfg.cssVarFg,
      }}
    >
      {cfg.label}
    </span>
  );
}
