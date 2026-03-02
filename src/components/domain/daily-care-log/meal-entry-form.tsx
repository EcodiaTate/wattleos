"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCareEntry } from "@/lib/actions/daily-care";
import {
  MEAL_TYPE_CONFIG,
  FOOD_CONSUMED_CONFIG,
} from "@/lib/constants/daily-care";
import type { MealType, FoodConsumed } from "@/types/domain";

interface MealEntryFormProps {
  studentId: string;
  logDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MEAL_TYPES = Object.entries(MEAL_TYPE_CONFIG) as [
  MealType,
  { label: string },
][];

const FOOD_CONSUMED_OPTIONS = Object.entries(FOOD_CONSUMED_CONFIG) as [
  FoodConsumed,
  { label: string; emoji: string },
][];

export function MealEntryForm({
  studentId,
  logDate,
  onSuccess,
  onCancel,
}: MealEntryFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mealType, setMealType] = useState<MealType | null>(null);
  const [foodOffered, setFoodOffered] = useState("");
  const [foodConsumed, setFoodConsumed] = useState<FoodConsumed | null>(null);
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!mealType) {
      setError("Please select a meal type");
      haptics.error();
      return;
    }

    if (!foodConsumed) {
      setError("Please select how much food was consumed");
      haptics.error();
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");

      const result = await addCareEntry({
        student_id: studentId,
        log_date: logDate,
        entry_type: "meal",
        meal_type: mealType,
        food_offered: foodOffered.trim() || null,
        food_consumed: foodConsumed,
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

      {/* Meal Type */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Meal Type
        </label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(([value, cfg]) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setMealType(value);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor:
                  mealType === value
                    ? "var(--care-meal)"
                    : "var(--border)",
                background:
                  mealType === value
                    ? "var(--care-meal-bg)"
                    : "var(--card)",
                color:
                  mealType === value
                    ? "var(--care-meal-fg)"
                    : "var(--foreground)",
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Food Offered */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Food Offered
        </label>
        <input
          type="text"
          value={foodOffered}
          onChange={(e) => setFoodOffered(e.target.value)}
          disabled={isPending}
          placeholder="e.g. Sandwiches, fruit, yoghurt"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Food Consumed */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Food Consumed
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {FOOD_CONSUMED_OPTIONS.map(([value, cfg]) => (
            <button
              key={value}
              type="button"
              disabled={isPending}
              onClick={() => {
                haptics.impact("light");
                setFoodConsumed(value);
              }}
              className="active-push touch-target flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] border px-1 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor:
                  foodConsumed === value
                    ? "var(--care-meal)"
                    : "var(--border)",
                background:
                  foodConsumed === value
                    ? "var(--care-meal-bg)"
                    : "var(--card)",
                color:
                  foodConsumed === value
                    ? "var(--care-meal-fg)"
                    : "var(--foreground)",
              }}
            >
              <span className="text-base">{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
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
          disabled={isPending || !mealType || !foodConsumed}
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
