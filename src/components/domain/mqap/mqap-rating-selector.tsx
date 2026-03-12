"use client";

import type { MqapRating } from "@/types/domain";

interface MqapRatingSelectorProps {
  value: MqapRating | null;
  onChange: (rating: MqapRating | null) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: MqapRating | null; label: string; short: string }> = [
  { value: null, label: "Not assessed", short: "-" },
  { value: "working_towards", label: "Working Towards", short: "WT" },
  { value: "meeting", label: "Meeting", short: "M" },
  { value: "exceeding", label: "Exceeding", short: "E" },
];

export function MqapRatingSelector({
  value,
  onChange,
  disabled,
}: MqapRatingSelectorProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        let bgColor = "var(--muted)";
        let fgColor = "var(--muted-foreground)";

        if (isSelected) {
          if (opt.value === "working_towards") {
            bgColor = "var(--qip-working-towards)";
            fgColor = "var(--qip-working-towards-fg)";
          } else if (opt.value === "meeting") {
            bgColor = "var(--qip-meeting)";
            fgColor = "var(--qip-meeting-fg)";
          } else if (opt.value === "exceeding") {
            bgColor = "var(--qip-exceeding)";
            fgColor = "var(--qip-exceeding-fg)";
          } else {
            bgColor = "var(--qip-unassessed)";
            fgColor = "var(--qip-unassessed-fg)";
          }
        }

        return (
          <button
            key={opt.short}
            type="button"
            className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ backgroundColor: bgColor, color: fgColor }}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            title={opt.label}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
