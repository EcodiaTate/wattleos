"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createReview } from "@/lib/actions/ilp";
import type {
  IlpGoalWithStrategies,
  IlpReviewType,
  IlpProgressRating,
} from "@/types/domain";
import {
  REVIEW_TYPE_CONFIG,
  PROGRESS_RATING_CONFIG,
  DEVELOPMENTAL_DOMAIN_CONFIG,
} from "@/lib/constants/ilp";

const REVIEW_TYPE_OPTIONS = Object.entries(REVIEW_TYPE_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpReviewType,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

const PROGRESS_OPTIONS = Object.entries(PROGRESS_RATING_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpProgressRating,
    label: cfg.label,
  }),
);

interface GoalUpdateState {
  progress_rating: IlpProgressRating;
  notes: string;
}

interface ReviewFormProps {
  planId: string;
  goals: IlpGoalWithStrategies[];
  onComplete?: () => void;
}

export function ReviewForm({ planId, goals, onComplete }: ReviewFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [reviewType, setReviewType] = useState<IlpReviewType>("scheduled");
  const [reviewDate, setReviewDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState("");
  const [parentAttended, setParentAttended] = useState(false);
  const [overallProgress, setOverallProgress] = useState<IlpProgressRating>("progressing");
  const [goalUpdates, setGoalUpdates] = useState<Record<string, GoalUpdateState>>(
    () => {
      const initial: Record<string, GoalUpdateState> = {};
      for (const goal of goals) {
        initial[goal.id] = {
          progress_rating: "progressing",
          notes: "",
        };
      }
      return initial;
    },
  );
  const [summaryNotes, setSummaryNotes] = useState("");
  const [familyFeedback, setFamilyFeedback] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [newReviewDueDate, setNewReviewDueDate] = useState("");

  function addAttendee() {
    const trimmed = newAttendee.trim();
    if (trimmed && !attendees.includes(trimmed)) {
      setAttendees((prev) => [...prev, trimmed]);
      setNewAttendee("");
      haptics.light();
    }
  }

  function removeAttendee(idx: number) {
    haptics.light();
    setAttendees((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateGoalProgress(goalId: string, field: keyof GoalUpdateState, value: string) {
    setGoalUpdates((prev) => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value,
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reviewDate) {
      setError("Please enter a review date");
      haptics.error();
      return;
    }

    const goalUpdateArray = Object.entries(goalUpdates).map(
      ([goalId, update]) => ({
        goal_id: goalId,
        progress_rating: update.progress_rating,
        notes: update.notes.trim(),
      }),
    );

    const input = {
      plan_id: planId,
      review_type: reviewType,
      review_date: reviewDate,
      attendees,
      parent_attended: parentAttended,
      overall_progress: overallProgress,
      goal_updates: goalUpdateArray,
      summary_notes: summaryNotes.trim() || null,
      family_feedback: familyFeedback.trim() || null,
      next_steps: nextSteps.trim() || null,
      new_review_due_date: newReviewDueDate || null,
    };

    startTransition(async () => {
      const result = await createReview(input);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.heavy();
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
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Review Type */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Review Type
        </label>
        <select
          value={reviewType}
          onChange={(e) => {
            haptics.selection();
            setReviewType(e.target.value as IlpReviewType);
          }}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          {REVIEW_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.emoji} {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Review Date */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Review Date
        </label>
        <input
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Attendees (text array input) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Attendees
        </label>
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attendees.map((attendee, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {attendee}
                <button
                  type="button"
                  onClick={() => removeAttendee(idx)}
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
            value={newAttendee}
            onChange={(e) => setNewAttendee(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAttendee();
              }
            }}
            placeholder="Add attendee name..."
            className="flex-1 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
          <button
            type="button"
            onClick={addAttendee}
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

      {/* Parent Attended */}
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setParentAttended(!parentAttended);
        }}
        className="active-push flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm transition-colors"
        style={{
          background: parentAttended ? "var(--primary)" : "var(--input)",
          color: parentAttended
            ? "var(--primary-foreground)"
            : "var(--foreground)",
        }}
      >
        <span>{parentAttended ? "\u2713" : ""}</span>
        Parent/guardian attended
      </button>

      {/* Overall Progress (chip selector) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Overall Progress
        </label>
        <div className="flex flex-wrap gap-2">
          {PROGRESS_OPTIONS.map((opt) => {
            const isSelected = overallProgress === opt.value;
            const cfg = PROGRESS_RATING_CONFIG[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setOverallProgress(opt.value);
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isSelected ? cfg.cssVar : "var(--border)",
                  background: isSelected ? cfg.cssVar : "transparent",
                  color: isSelected ? cfg.cssVarFg : "var(--foreground)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-Goal Progress */}
      {goals.length > 0 && (
        <div className="space-y-3">
          <label
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Goal Progress
          </label>
          {goals.map((goal) => {
            const domainCfg = DEVELOPMENTAL_DOMAIN_CONFIG[goal.developmental_domain];
            const update = goalUpdates[goal.id];
            return (
              <div
                key={goal.id}
                className="rounded-[var(--radius-lg)] border border-border p-4 space-y-3"
                style={{ background: "var(--card)" }}
              >
                <div className="flex items-center gap-2">
                  <span>{domainCfg.emoji}</span>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {goal.goal_title}
                  </p>
                </div>

                {/* Progress rating dropdown */}
                <div className="space-y-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Progress Rating
                  </label>
                  <select
                    value={update.progress_rating}
                    onChange={(e) => {
                      haptics.selection();
                      updateGoalProgress(
                        goal.id,
                        "progress_rating",
                        e.target.value,
                      );
                    }}
                    className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                    style={{
                      background: "var(--input)",
                      color: "var(--foreground)",
                    }}
                  >
                    {PROGRESS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes for this goal */}
                <div className="space-y-1">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Notes
                  </label>
                  <textarea
                    value={update.notes}
                    onChange={(e) =>
                      updateGoalProgress(goal.id, "notes", e.target.value)
                    }
                    placeholder="Progress notes for this goal..."
                    rows={2}
                    className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                    style={{
                      background: "var(--input)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Summary Notes
        </label>
        <textarea
          value={summaryNotes}
          onChange={(e) => setSummaryNotes(e.target.value)}
          placeholder="Overall summary of the review discussion..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Family Feedback */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Family Feedback
        </label>
        <textarea
          value={familyFeedback}
          onChange={(e) => setFamilyFeedback(e.target.value)}
          placeholder="Feedback from parent/guardian..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Next Steps */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Next Steps
        </label>
        <textarea
          value={nextSteps}
          onChange={(e) => setNextSteps(e.target.value)}
          placeholder="Agreed next steps and actions..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* New Review Due Date */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Next Review Due Date
        </label>
        <input
          type="date"
          value={newReviewDueDate}
          onChange={(e) => setNewReviewDueDate(e.target.value)}
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
        {isPending ? "Submitting Review..." : "Submit Review"}
      </button>
    </form>
  );
}
