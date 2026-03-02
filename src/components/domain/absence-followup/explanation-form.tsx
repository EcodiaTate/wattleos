// src/components/domain/absence-followup/explanation-form.tsx

"use client";

import { useState, useTransition } from "react";
import { recordExplanation } from "@/lib/actions/absence-followup";
import { EXPLANATION_SOURCE_OPTIONS } from "@/lib/constants/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { ExplanationSource } from "@/types/domain";

interface ExplanationFormProps {
  alertId: string;
  hasAttendanceRecord: boolean;
  onSuccess?: () => void;
}

export function ExplanationForm({
  alertId,
  hasAttendanceRecord,
  onSuccess,
}: ExplanationFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [source, setSource] = useState<ExplanationSource>("guardian_call");
  const [explanation, setExplanation] = useState("");
  const [markExcused, setMarkExcused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.heavy();

    startTransition(async () => {
      const result = await recordExplanation({
        alert_id: alertId,
        explanation,
        explanation_source: source,
        mark_attendance_excused: markExcused,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="source"
          className="block text-sm font-medium"
        >
          How was the explanation received?
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value as ExplanationSource)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ color: "var(--foreground)" }}
        >
          {EXPLANATION_SOURCE_OPTIONS.filter((o) => o.value !== "auto").map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="explanation" className="block text-sm font-medium">
          Explanation
        </label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="e.g. Child is unwell with a cold. Parent will send a medical certificate."
          rows={3}
          required
          minLength={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ color: "var(--foreground)" }}
        />
      </div>

      {hasAttendanceRecord && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={markExcused}
            onChange={(e) => setMarkExcused(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm" style={{ color: "var(--foreground)" }}>
            Mark attendance as excused
          </span>
        </label>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || explanation.trim().length < 5}
        className="touch-target active-push w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        style={{
          background: "var(--absence-followup-explained)",
          color: "var(--absence-followup-explained-fg)",
        }}
      >
        {isPending ? "Recording…" : "Record Explanation"}
      </button>
    </form>
  );
}
