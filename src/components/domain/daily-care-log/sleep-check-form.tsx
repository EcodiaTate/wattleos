"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { recordSleepCheck } from "@/lib/actions/daily-care";
import { SLEEP_POSITION_CONFIG } from "@/lib/constants/daily-care";
import type { SleepPosition } from "@/types/domain";

interface SleepCheckFormProps {
  entryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const SLEEP_POSITIONS = Object.entries(SLEEP_POSITION_CONFIG) as [
  SleepPosition,
  { label: string; safe: boolean },
][];

export function SleepCheckForm({
  entryId,
  onSuccess,
  onCancel,
}: SleepCheckFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default to "back" since it's the safe/expected position
  const [position, setPosition] = useState<SleepPosition>("back");
  const [breathingNormal, setBreathingNormal] = useState(true);
  const [skinColourNormal, setSkinColourNormal] = useState(true);
  const [notes, setNotes] = useState("");

  const isAbnormal = !breathingNormal || !skinColourNormal;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      haptics.impact("medium");

      const result = await recordSleepCheck({
        entry_id: entryId,
        position,
        breathing_normal: breathingNormal,
        skin_colour_normal: skinColourNormal,
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Position */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Position
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SLEEP_POSITIONS.map(([value, cfg]) => {
            const isSelected = position === value;
            const isSafe = cfg.safe;

            return (
              <button
                key={value}
                type="button"
                disabled={isPending}
                onClick={() => {
                  haptics.impact("light");
                  setPosition(value);
                }}
                className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
                style={{
                  borderColor: isSelected
                    ? isSafe
                      ? "var(--care-sleep)"
                      : "var(--warning)"
                    : "var(--border)",
                  background: isSelected
                    ? isSafe
                      ? "var(--care-sleep-bg)"
                      : "color-mix(in srgb, var(--warning) 15%, transparent)"
                    : "var(--card)",
                  color: isSelected
                    ? isSafe
                      ? "var(--care-sleep-fg)"
                      : "var(--warning)"
                    : "var(--foreground)",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breathing Normal */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Breathing normal?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              haptics.impact("light");
              setBreathingNormal(true);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
            style={{
              borderColor: breathingNormal
                ? "var(--care-sleep)"
                : "var(--border)",
              background: breathingNormal
                ? "var(--care-sleep-bg)"
                : "var(--card)",
              color: breathingNormal
                ? "var(--care-sleep-fg)"
                : "var(--foreground)",
            }}
          >
            Yes
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              haptics.impact("light");
              setBreathingNormal(false);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
            style={{
              borderColor: !breathingNormal
                ? "var(--destructive)"
                : "var(--border)",
              background: !breathingNormal
                ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                : "var(--card)",
              color: !breathingNormal
                ? "var(--destructive)"
                : "var(--foreground)",
            }}
          >
            No
          </button>
        </div>
      </div>

      {/* Skin Colour Normal */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Skin colour normal?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              haptics.impact("light");
              setSkinColourNormal(true);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
            style={{
              borderColor: skinColourNormal
                ? "var(--care-sleep)"
                : "var(--border)",
              background: skinColourNormal
                ? "var(--care-sleep-bg)"
                : "var(--card)",
              color: skinColourNormal
                ? "var(--care-sleep-fg)"
                : "var(--foreground)",
            }}
          >
            Yes
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              haptics.impact("light");
              setSkinColourNormal(false);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
            style={{
              borderColor: !skinColourNormal
                ? "var(--destructive)"
                : "var(--border)",
              background: !skinColourNormal
                ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                : "var(--card)",
              color: !skinColourNormal
                ? "var(--destructive)"
                : "var(--foreground)",
            }}
          >
            No
          </button>
        </div>
      </div>

      {/* Notes - always visible but highlighted when something is abnormal */}
      {isAbnormal && (
        <div
          className="rounded-[var(--radius-md)] border p-2 text-xs"
          style={{
            borderColor: "var(--warning)",
            background: "color-mix(in srgb, var(--warning) 10%, transparent)",
            color: "var(--warning)",
          }}
        >
          Abnormal observation detected. Please add notes below and notify the
          lead educator.
        </div>
      )}

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{
            color: isAbnormal ? "var(--warning)" : "var(--muted-foreground)",
          }}
        >
          Notes {isAbnormal ? "(recommended)" : "(optional)"}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={isAbnormal ? 2 : 1}
          placeholder={
            isAbnormal
              ? "Describe the abnormal observation..."
              : "Any additional notes..."
          }
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm resize-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors"
          style={{ background: "var(--card)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Recording..." : "Record Check"}
        </button>
      </div>
    </form>
  );
}
