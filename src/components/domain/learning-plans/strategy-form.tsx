"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createStrategy, updateStrategy } from "@/lib/actions/ilp";
import type { IlpStrategy, IlpStrategyType } from "@/types/domain";
import { STRATEGY_TYPE_CONFIG } from "@/lib/constants/ilp";

const STRATEGY_TYPE_OPTIONS = Object.entries(STRATEGY_TYPE_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpStrategyType,
    label: cfg.label,
  }),
);

interface StrategyFormProps {
  goalId: string;
  strategy?: IlpStrategy;
  onComplete?: () => void;
}

export function StrategyForm({ goalId, strategy, onComplete }: StrategyFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(
    strategy?.strategy_description ?? "",
  );
  const [strategyType, setStrategyType] = useState<IlpStrategyType>(
    strategy?.strategy_type ?? "instructional",
  );
  const [responsibleRole, setResponsibleRole] = useState(
    strategy?.responsible_role ?? "",
  );
  const [frequency, setFrequency] = useState(
    strategy?.implementation_frequency ?? "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Please enter a strategy description");
      haptics.error();
      return;
    }

    const input = {
      goal_id: goalId,
      strategy_description: description.trim(),
      strategy_type: strategyType,
      responsible_role: responsibleRole.trim() || null,
      implementation_frequency: frequency.trim() || null,
    };

    startTransition(async () => {
      const result = strategy
        ? await updateStrategy(strategy.id, input)
        : await createStrategy(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onComplete) {
        onComplete();
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-md)] border border-border p-3 space-y-3"
      style={{ background: "var(--background)" }}
    >
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-2 text-xs"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Description */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Strategy Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the strategy, how it will be implemented..."
          rows={3}
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Type dropdown */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Strategy Type
        </label>
        <select
          value={strategyType}
          onChange={(e) => {
            haptics.selection();
            setStrategyType(e.target.value as IlpStrategyType);
          }}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          {STRATEGY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Responsible role & Frequency */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Responsible Role
          </label>
          <input
            type="text"
            value={responsibleRole}
            onChange={(e) => setResponsibleRole(e.target.value)}
            placeholder="e.g., Lead Educator"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Frequency
          </label>
          <input
            type="text"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., Daily, 3x per week"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Submit row */}
      <div className="flex justify-end gap-2">
        {onComplete && (
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onComplete();
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-sm font-medium"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Saving..."
            : strategy
              ? "Update"
              : "Add Strategy"}
        </button>
      </div>
    </form>
  );
}
