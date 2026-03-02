"use client";

import { INDICATOR_CONFIG, RATING_LABELS } from "@/lib/constants/normalization";
import type { NormalizationIndicator } from "@/types/domain";

interface IndicatorBarProps {
  indicator: NormalizationIndicator;
  rating: number;
  showLabel?: boolean;
}

export function IndicatorBar({
  indicator,
  rating,
  showLabel = true,
}: IndicatorBarProps) {
  const config = INDICATOR_CONFIG[indicator];
  const pct = (rating / 5) * 100;

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "var(--foreground)" }} className="font-medium">
            {config.shortLabel}
          </span>
          <span style={{ color: "var(--muted-foreground)" }}>
            {rating.toFixed(1)} - {RATING_LABELS[Math.round(rating)]}
          </span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: `var(${config.cssVar})`,
          }}
        />
      </div>
    </div>
  );
}
