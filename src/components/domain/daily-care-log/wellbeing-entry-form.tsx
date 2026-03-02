"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import { WELLBEING_MOOD_CONFIG } from "@/lib/constants/daily-care";
import type { WellbeingMood } from "@/types/domain";

interface WellbeingEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MOOD_OPTIONS = Object.entries(WELLBEING_MOOD_CONFIG) as [
  WellbeingMood,
  { label: string; emoji: string },
][];

export function WellbeingEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
}: WellbeingEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mood, setMood] = useState<WellbeingMood | null>(null);
  const [temperature, setTemperature] = useState<string>("");
  const [notes, setNotes] = useState("");

  function setNormalTemperature() {
    haptics.impact("light");
    setTemperature("36.5");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!mood) {
      setError("Please select a mood");
      haptics.error();
      return;
    }

    if (!notes.trim()) {
      setError("Notes are required for wellbeing entries");
      haptics.error();
      return;
    }

    const tempValue = temperature.trim()
      ? parseFloat(temperature.trim())
      : null;

    if (tempValue !== null && (isNaN(tempValue) || tempValue < 34 || tempValue > 42)) {
      setError("Temperature must be between 34.0 and 42.0 \u00B0C");
      haptics.error();
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: "wellbeing_note",
        wellbeing_mood: mood,
        wellbeing_temperature: tempValue,
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

      {/* Mood Selector */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Mood
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {MOOD_OPTIONS.map(([value, cfg]) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setMood(value);
              }}
              className="active-push touch-target flex flex-col items-center gap-1 rounded-[var(--radius-md)] border px-1 py-2.5 transition-colors"
              style={{
                borderColor:
                  mood === value
                    ? "var(--care-wellbeing)"
                    : "var(--border)",
                background:
                  mood === value
                    ? "var(--care-wellbeing-bg)"
                    : "var(--card)",
                color:
                  mood === value
                    ? "var(--care-wellbeing-fg)"
                    : "var(--foreground)",
              }}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <span className="text-[10px] font-medium leading-tight">
                {cfg.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Temperature (optional)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            disabled={isPending}
            min={34.0}
            max={42.0}
            step={0.1}
            placeholder="e.g. 36.5"
            className="flex-1 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
          <span
            className="text-sm font-medium shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            {"\u00B0C"}
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={setNormalTemperature}
            className="active-push shrink-0 rounded-[var(--radius-md)] border border-border px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background:
                temperature === "36.5"
                  ? "var(--care-wellbeing-bg)"
                  : "var(--card)",
              color:
                temperature === "36.5"
                  ? "var(--care-wellbeing-fg)"
                  : "var(--foreground)",
              borderColor:
                temperature === "36.5"
                  ? "var(--care-wellbeing)"
                  : "var(--border)",
            }}
          >
            Normal (36.5)
          </button>
        </div>
      </div>

      {/* Notes (required) */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={3}
          placeholder="Describe the child's wellbeing, any concerns or observations..."
          required
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
          disabled={isPending || !mood || !notes.trim()}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Recording..." : "Record"}
        </button>
      </div>
    </form>
  );
}
