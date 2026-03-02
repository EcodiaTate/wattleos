"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { RatingInput } from "./rating-input";
import { ALL_INDICATORS, INDICATOR_CONFIG } from "@/lib/constants/normalization";
import { createNormalizationGoal } from "@/lib/actions/normalization";
import type { NormalizationIndicator } from "@/types/domain";

interface GoalFormProps {
  students: Array<{ id: string; first_name: string; last_name: string; preferred_name: string | null }>;
  preSelectedStudentId?: string;
  preSelectedIndicator?: NormalizationIndicator;
  preSelectedCurrentRating?: number;
}

export function GoalForm({ students, preSelectedStudentId, preSelectedIndicator, preSelectedCurrentRating }: GoalFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState(preSelectedStudentId ?? "");
  const [indicator, setIndicator] = useState<NormalizationIndicator>(preSelectedIndicator ?? "concentration");
  const [currentRating, setCurrentRating] = useState(preSelectedCurrentRating ?? 2);
  const [targetRating, setTargetRating] = useState(Math.min((preSelectedCurrentRating ?? 2) + 1, 5));
  const [targetDate, setTargetDate] = useState("");
  const [strategy, setStrategy] = useState("");
  const [progressNotes, setProgressNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Please select a student");
      return;
    }
    if (!strategy.trim()) {
      setError("Please describe a strategy");
      return;
    }

    startTransition(async () => {
      const result = await createNormalizationGoal({
        student_id: studentId,
        indicator,
        current_rating: currentRating,
        target_rating: targetRating,
        target_date: targetDate || null,
        strategy: strategy.trim(),
        progress_notes: progressNotes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        router.push(`/pedagogy/normalization/${studentId}`);
        router.refresh();
      }
    });
  }

  const indicatorCfg = INDICATOR_CONFIG[indicator];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          Set Normalization Goal
        </h2>
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Student</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        >
          <option value="">Select student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name || s.first_name} {s.last_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Indicator</label>
        <div className="flex flex-wrap gap-2">
          {ALL_INDICATORS.map((ind) => {
            const cfg = INDICATOR_CONFIG[ind];
            const isActive = indicator === ind;
            return (
              <button
                key={ind}
                type="button"
                className="active-push touch-target rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                onClick={() => { setIndicator(ind); haptics.selection(); }}
                style={{
                  borderColor: isActive ? `var(${cfg.cssVar})` : "var(--border)",
                  backgroundColor: isActive ? `var(${cfg.cssVar})` : "transparent",
                  color: isActive ? "white" : "var(--muted-foreground)",
                }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {indicatorCfg.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RatingInput
          value={currentRating}
          onChange={(v) => {
            setCurrentRating(v);
            if (targetRating < v) setTargetRating(v);
            haptics.selection();
          }}
          label="Current Rating"
          indicatorColor="var(--muted-foreground)"
        />
        <RatingInput
          value={targetRating}
          onChange={(v) => {
            if (v >= currentRating) {
              setTargetRating(v);
              haptics.selection();
            }
          }}
          label="Target Rating"
          indicatorColor={`var(${indicatorCfg.cssVar})`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Target Date (optional)</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Strategy</label>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          rows={3}
          placeholder="Describe the approach to support this child's development in this area…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Examples: {indicatorCfg.examples.slice(0, 2).join(", ")}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Progress Notes (optional)
        </label>
        <textarea
          value={progressNotes}
          onChange={(e) => setProgressNotes(e.target.value)}
          rows={2}
          placeholder="Initial observations or context…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-lg px-6 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Creating…" : "Create Goal"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
