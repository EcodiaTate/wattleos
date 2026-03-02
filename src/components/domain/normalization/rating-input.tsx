"use client";

import { RATING_LABELS } from "@/lib/constants/normalization";

interface RatingInputProps {
  value: number;
  onChange: (v: number) => void;
  label: string;
  indicatorColor: string;
  disabled?: boolean;
}

export function RatingInput({ value, onChange, label, indicatorColor, disabled }: RatingInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {RATING_LABELS[value]}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => onChange(r)}
            className="active-push touch-target flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all"
            style={{
              borderColor: r <= value ? indicatorColor : "var(--border)",
              backgroundColor: r <= value ? indicatorColor : "transparent",
              color: r <= value ? "white" : "var(--muted-foreground)",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
