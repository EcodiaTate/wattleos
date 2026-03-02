// src/components/domain/work-cycle/quality-rating-display.tsx

import { QUALITY_RATING_LABELS } from "@/lib/constants/work-cycle";

interface QualityRatingDisplayProps {
  rating: number | null;
  showLabel?: boolean;
}

export function QualityRatingDisplay({ rating, showLabel = true }: QualityRatingDisplayProps) {
  if (rating === null) {
    return (
      <span className="text-sm text-muted-foreground italic">Not rated</span>
    );
  }

  const info = QUALITY_RATING_LABELS[rating];
  // Colour: 1-2 = red, 3 = amber, 4-5 = green
  const colorVar =
    rating <= 2
      ? "var(--wc-quality-low)"
      : rating === 3
        ? "var(--wc-quality-mid)"
        : "var(--wc-quality-high)";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{ color: colorVar }}
    >
      <span className="font-bold text-sm">{rating}/5</span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{info?.label}</span>
      )}
    </span>
  );
}
