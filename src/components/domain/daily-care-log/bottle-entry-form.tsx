"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import { BOTTLE_TYPE_CONFIG } from "@/lib/constants/daily-care";
import type { BottleType } from "@/types/domain";

interface BottleEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const BOTTLE_TYPES = Object.entries(BOTTLE_TYPE_CONFIG) as [
  BottleType,
  { label: string },
][];

const QUICK_AMOUNTS = [30, 60, 90, 120, 150, 180, 210, 240] as const;

export function BottleEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
}: BottleEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bottleType, setBottleType] = useState<BottleType | null>(null);
  const [amountMl, setAmountMl] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!bottleType) {
      setError("Please select a bottle type");
      haptics.error();
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: "bottle",
        bottle_type: bottleType,
        bottle_amount_ml: amountMl,
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

      {/* Bottle Type */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Bottle Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BOTTLE_TYPES.map(([value, cfg]) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setBottleType(value);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor:
                  bottleType === value
                    ? "var(--care-bottle)"
                    : "var(--border)",
                background:
                  bottleType === value
                    ? "var(--care-bottle-bg)"
                    : "var(--card)",
                color:
                  bottleType === value
                    ? "var(--care-bottle-fg)"
                    : "var(--foreground)",
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Amount (ml)
        </label>

        {/* Quick-select amounts */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((ml) => (
            <button
              key={ml}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setAmountMl(ml);
              }}
              className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor:
                  amountMl === ml
                    ? "var(--care-bottle)"
                    : "var(--border)",
                background:
                  amountMl === ml
                    ? "var(--care-bottle-bg)"
                    : "var(--card)",
                color:
                  amountMl === ml
                    ? "var(--care-bottle-fg)"
                    : "var(--foreground)",
              }}
            >
              {ml}
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amountMl ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setAmountMl(val === "" ? null : parseInt(val, 10));
            }}
            disabled={isPending}
            min={0}
            max={1000}
            placeholder="Custom ml"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
          <span
            className="text-sm font-medium shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            ml
          </span>
        </div>
      </div>

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
          placeholder="Any additional notes..."
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
          disabled={isPending || !bottleType}
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
