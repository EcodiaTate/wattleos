"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import { NAPPY_TYPE_CONFIG } from "@/lib/constants/daily-care";
import type { NappyType } from "@/types/domain";

interface NappyEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
  /** Pre-select a nappy type (used by QuickEntryPanel for one-less-tap UX). */
  initialNappyType?: import("@/types/domain").NappyType | null;
}

const NAPPY_TYPES = Object.entries(NAPPY_TYPE_CONFIG) as [
  NappyType,
  { label: string },
][];

export function NappyEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
  initialNappyType,
}: NappyEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nappyType, setNappyType] = useState<NappyType | null>(initialNappyType ?? null);
  const [creamApplied, setCreamApplied] = useState(false);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nappyType) {
      setError("Please select a nappy type");
      haptics.error();
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: "nappy_change",
        nappy_type: nappyType,
        nappy_cream_applied: creamApplied,
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

      {/* Nappy Type */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Nappy Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {NAPPY_TYPES.map(([value, cfg]) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setNappyType(value);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
              style={{
                borderColor:
                  nappyType === value
                    ? "var(--care-nappy)"
                    : "var(--border)",
                background:
                  nappyType === value
                    ? "var(--care-nappy-bg)"
                    : "var(--card)",
                color:
                  nappyType === value
                    ? "var(--care-nappy-fg)"
                    : "var(--foreground)",
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cream Applied */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={creamApplied}
          onChange={(e) => {
            haptics.impact("light");
            setCreamApplied(e.target.checked);
          }}
          disabled={isPending}
          className="h-5 w-5 rounded border border-border"
          style={{ accentColor: "var(--primary)" }}
        />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cream applied
        </span>
      </label>

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
          disabled={isPending || !nappyType}
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
