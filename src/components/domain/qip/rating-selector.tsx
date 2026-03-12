"use client";

import type { QipRating } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface RatingSelectorProps {
  value: QipRating | null;
  onChange: (rating: QipRating | null) => void;
  disabled?: boolean;
}

const RATING_OPTIONS: Array<{
  value: QipRating;
  label: string;
  cssVar: string;
  cssFgVar: string;
}> = [
  {
    value: "working_towards",
    label: "Working Towards",
    cssVar: "var(--qip-working-towards)",
    cssFgVar: "var(--qip-working-towards-fg)",
  },
  {
    value: "meeting",
    label: "Meeting",
    cssVar: "var(--qip-meeting)",
    cssFgVar: "var(--qip-meeting-fg)",
  },
  {
    value: "exceeding",
    label: "Exceeding",
    cssVar: "var(--qip-exceeding)",
    cssFgVar: "var(--qip-exceeding-fg)",
  },
];

export function RatingSelector({
  value,
  onChange,
  disabled = false,
}: RatingSelectorProps) {
  const haptics = useHaptics();

  return (
    <div className="flex gap-2">
      {RATING_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className="active-push touch-target flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
            style={{
              backgroundColor: isSelected
                ? option.cssVar
                : "var(--muted)",
              color: isSelected
                ? option.cssFgVar
                : "var(--muted-foreground)",
              opacity: disabled ? 0.5 : 1,
            }}
            onClick={() => {
              haptics.selection();
              // Toggle off if already selected
              onChange(isSelected ? null : option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RatingBadge({
  rating,
  compact = false,
}: {
  rating: QipRating | null;
  compact?: boolean;
}) {
  if (!rating) {
    return (
      <span
        className="status-badge"
        style={{
          "--badge-bg": "var(--qip-unassessed)",
          "--badge-fg": "var(--qip-unassessed-fg)",
        } as React.CSSProperties}
      >
        {compact ? "-" : "Not assessed"}
      </span>
    );
  }

  const config = RATING_OPTIONS.find((o) => o.value === rating)!;
  const label =
    rating === "working_towards"
      ? compact
        ? "WT"
        : "Working Towards"
      : rating === "meeting"
        ? compact
          ? "M"
          : "Meeting"
        : compact
          ? "E"
          : "Exceeding";

  return (
    <span
      className="status-badge"
      style={{
        "--badge-bg": config.cssVar,
        "--badge-fg": config.cssFgVar,
      } as React.CSSProperties}
    >
      {label}
    </span>
  );
}
