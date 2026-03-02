"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import {
  SLEEP_POSITION_CONFIG,
  SLEEP_MANNER_CONFIG,
} from "@/lib/constants/daily-care";
import type { SleepPosition, SleepManner } from "@/types/domain";

interface SleepEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
  mode: "start" | "end";
}

const SLEEP_POSITIONS = Object.entries(SLEEP_POSITION_CONFIG) as [
  SleepPosition,
  { label: string; safe: boolean },
][];

const SLEEP_MANNERS = Object.entries(SLEEP_MANNER_CONFIG) as [
  SleepManner,
  { label: string },
][];

export function SleepEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
  mode,
}: SleepEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [position, setPosition] = useState<SleepPosition | null>(null);
  const [manner, setManner] = useState<SleepManner | null>(null);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "start") {
      if (!position) {
        setError("Please select a sleep position");
        haptics.error();
        return;
      }
      if (!manner) {
        setError("Please select how the child settled");
        haptics.error();
        return;
      }
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: mode === "start" ? "sleep_start" : "sleep_end",
        sleep_position: mode === "start" ? position : null,
        sleep_manner: mode === "start" ? manner : null,
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

      {mode === "start" && (
        <>
          {/* Sleep Position */}
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
                    {isSafe && (
                      <span
                        className="ml-1 text-xs"
                        style={{ opacity: 0.7 }}
                      >
                        (safe)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep Manner */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              How did the child settle?
            </label>
            <div className="flex flex-wrap gap-2">
              {SLEEP_MANNERS.map(([value, cfg]) => (
                <button
                  key={value}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    haptics.impact("light");
                    setManner(value);
                  }}
                  className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor:
                      manner === value
                        ? "var(--care-sleep)"
                        : "var(--border)",
                    background:
                      manner === value
                        ? "var(--care-sleep-bg)"
                        : "var(--card)",
                    color:
                      manner === value
                        ? "var(--care-sleep-fg)"
                        : "var(--foreground)",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={1}
          placeholder={
            mode === "end"
              ? "How did the child wake? Any notes..."
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
          disabled={
            isPending ||
            (mode === "start" && (!position || !manner))
          }
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Recording..."
            : mode === "start"
              ? "Start Sleep"
              : "End Sleep"}
        </button>
      </div>
    </form>
  );
}
