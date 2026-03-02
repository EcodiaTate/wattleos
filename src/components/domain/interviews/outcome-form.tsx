// src/components/domain/interviews/outcome-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { recordInterviewOutcome } from "@/lib/actions/interviews";

interface OutcomeFormProps {
  bookingId: string;
  studentName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OutcomeForm({ bookingId, studentName, onSuccess, onCancel }: OutcomeFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"completed" | "no_show">("completed");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      haptics.impact("heavy");
      const result = await recordInterviewOutcome({ bookingId, outcomeNotes: notes, status });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Recording outcome for <strong style={{ color: "var(--foreground)" }}>{studentName}</strong>
      </p>

      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "var(--medical-mild-bg)", color: "var(--medical-mild-fg)" }}
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Interview result
        </label>
        <div className="flex gap-2">
          {(["completed", "no_show"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { haptics.impact("light"); setStatus(s); }}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-medium touch-target active-push"
              style={{
                background:
                  status === s
                    ? s === "completed"
                      ? "var(--interview-booking-completed-bg)"
                      : "var(--interview-booking-no-show-bg)"
                    : "var(--muted)",
                color:
                  status === s
                    ? s === "completed"
                      ? "var(--interview-booking-completed-fg)"
                      : "var(--interview-booking-no-show-fg)"
                    : "var(--muted-foreground)",
                border: status === s ? "2px solid currentColor" : "1px solid var(--border)",
              }}
            >
              {s === "completed" ? "✓ Held" : "✗ No show"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Notes <span className="text-red-500">*</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          required
          placeholder={
            status === "completed"
              ? "Key discussion points, follow-up actions…"
              : "Reason parent didn't attend, follow-up required…"
          }
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium touch-target active-push"
          style={{
            background: isPending ? "var(--muted)" : "var(--primary)",
            color: isPending ? "var(--muted-foreground)" : "var(--primary-foreground)",
          }}
        >
          {isPending ? "Saving…" : "Save outcome"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={() => { haptics.impact("light"); onCancel(); }}
            className="rounded-lg px-4 py-2.5 text-sm font-medium touch-target"
            style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
