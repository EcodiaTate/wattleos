"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createGoal, updateGoal } from "@/lib/actions/ilp";
import type {
  IlpGoal,
  IlpDevelopmentalDomain,
  IlpGoalPriority,
} from "@/types/domain";
import {
  DEVELOPMENTAL_DOMAIN_CONFIG,
  ILP_PRIORITY_CONFIG,
} from "@/lib/constants/ilp";

const DOMAIN_OPTIONS = Object.entries(DEVELOPMENTAL_DOMAIN_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpDevelopmentalDomain,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

const PRIORITY_OPTIONS = Object.entries(ILP_PRIORITY_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpGoalPriority,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

interface GoalFormProps {
  planId: string;
  goal?: IlpGoal;
  onComplete?: () => void;
}

export function GoalForm({ planId, goal, onComplete }: GoalFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(goal?.goal_title ?? "");
  const [description, setDescription] = useState(goal?.goal_description ?? "");
  const [domain, setDomain] = useState<IlpDevelopmentalDomain>(
    goal?.developmental_domain ?? "communication",
  );
  const [eylfOutcomes, setEylfOutcomes] = useState<string[]>(
    goal?.eylf_outcome_ids ?? [],
  );
  const [newOutcome, setNewOutcome] = useState("");
  const [priority, setPriority] = useState<IlpGoalPriority>(
    goal?.priority ?? "medium",
  );
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [baselineNotes, setBaselineNotes] = useState(
    goal?.baseline_notes ?? "",
  );
  const [successCriteria, setSuccessCriteria] = useState(
    goal?.success_criteria ?? "",
  );

  function addOutcome() {
    const trimmed = newOutcome.trim();
    if (trimmed && !eylfOutcomes.includes(trimmed)) {
      setEylfOutcomes((prev) => [...prev, trimmed]);
      setNewOutcome("");
      haptics.light();
    }
  }

  function removeOutcome(idx: number) {
    haptics.light();
    setEylfOutcomes((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a goal title");
      haptics.error();
      return;
    }

    const input = {
      plan_id: planId,
      goal_title: title.trim(),
      goal_description: description.trim() || null,
      developmental_domain: domain,
      eylf_outcome_ids: eylfOutcomes,
      priority,
      target_date: targetDate || null,
      baseline_notes: baselineNotes.trim() || null,
      success_criteria: successCriteria.trim() || null,
    };

    startTransition(async () => {
      const result = goal
        ? await updateGoal(goal.id, input)
        : await createGoal(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onComplete) {
        onComplete();
      } else {
        router.push(`/admin/learning-plans/${planId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Goal Title */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Goal Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Increase receptive vocabulary to age-appropriate level"
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Goal Description */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description of the goal, context, and rationale..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Developmental Domain (chip selector) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Developmental Domain
        </label>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_OPTIONS.map((opt) => {
            const isSelected = domain === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setDomain(opt.value);
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isSelected ? "var(--primary)" : "var(--border)",
                  background: isSelected ? "var(--primary)" : "transparent",
                  color: isSelected
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* EYLF Outcomes (text array) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          EYLF Outcomes
        </label>
        {eylfOutcomes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {eylfOutcomes.map((outcome, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {outcome}
                <button
                  type="button"
                  onClick={() => removeOutcome(idx)}
                  className="active-push ml-0.5 rounded-full text-xs opacity-60 hover:opacity-100"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  \u00d7
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOutcome();
              }
            }}
            placeholder="e.g., Outcome 5.1 - Children interact verbally..."
            className="flex-1 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
          <button
            type="button"
            onClick={addOutcome}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-medium"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Priority (chip selector) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Priority
        </label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((opt) => {
            const isSelected = priority === opt.value;
            const cfg = ILP_PRIORITY_CONFIG[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setPriority(opt.value);
                }}
                className="active-push flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: isSelected ? cfg.cssVar : "var(--border)",
                  background: isSelected ? cfg.cssVar : "transparent",
                  color: isSelected ? cfg.cssVarFg : "var(--foreground)",
                }}
              >
                {opt.emoji} {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Date */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Target Date
        </label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Baseline Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Baseline Notes
        </label>
        <textarea
          value={baselineNotes}
          onChange={(e) => setBaselineNotes(e.target.value)}
          placeholder="Current level of ability, assessments used, starting point..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Success Criteria */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Success Criteria
        </label>
        <textarea
          value={successCriteria}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          placeholder="How will we know when this goal has been achieved?"
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Saving..." : goal ? "Update Goal" : "Add Goal"}
      </button>
    </form>
  );
}
