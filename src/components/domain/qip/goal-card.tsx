"use client";

import { useTransition } from "react";
import type { QipGoal } from "@/types/domain";
import { NQS_ELEMENT_MAP } from "@/lib/constants/nqs-elements";
import { markGoalAchieved, deleteGoal } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface GoalCardProps {
  goal: QipGoal;
  responsibleName?: string;
  canManage: boolean;
  onEdit: (goal: QipGoal) => void;
  onUpdated: () => void;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  not_started: {
    bg: "var(--qip-unassessed)",
    fg: "var(--qip-unassessed-fg)",
    label: "Not Started",
  },
  in_progress: {
    bg: "var(--qip-working-towards)",
    fg: "var(--qip-working-towards-fg)",
    label: "In Progress",
  },
  achieved: {
    bg: "var(--qip-meeting)",
    fg: "var(--qip-meeting-fg)",
    label: "Achieved",
  },
};

export function GoalCard({
  goal,
  responsibleName,
  canManage,
  onEdit,
  onUpdated,
}: GoalCardProps) {
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();
  const element = NQS_ELEMENT_MAP.get(goal.nqs_element_id);
  const status = STATUS_STYLES[goal.status] ?? STATUS_STYLES.not_started;

  const isOverdue =
    goal.status !== "achieved" &&
    goal.due_date &&
    goal.due_date < new Date().toISOString().split("T")[0];

  function handleAchieve() {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await markGoalAchieved(goal.id);
      if (result.error) {
        haptics.error();
      } else {
        haptics.success();
        onUpdated();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Remove this goal?")) return;
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (result.error) {
        haptics.error();
      } else {
        onUpdated();
      }
    });
  }

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{
        backgroundColor: "var(--card)",
        opacity: isPending ? 0.6 : 1,
        borderLeftWidth: "3px",
        borderLeftColor: isOverdue
          ? "var(--attendance-absent-fg)"
          : status.bg,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            {goal.nqs_element_id}
          </span>
          <span
            className="status-badge"
            style={{
              "--badge-bg": status.bg,
              "--badge-fg": status.fg,
            } as React.CSSProperties}
          >
            {status.label}
          </span>
        </div>
        {isOverdue && (
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--attendance-absent-fg)" }}
          >
            Overdue
          </span>
        )}
      </div>

      {/* Element name */}
      {element && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {element.name}
        </p>
      )}

      {/* Description */}
      <p
        className="mt-2 text-sm"
        style={{ color: "var(--foreground)" }}
      >
        {goal.description}
      </p>

      {/* Strategies */}
      {goal.strategies && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="font-semibold">Strategies:</span>{" "}
          {goal.strategies}
        </p>
      )}

      {/* Meta row */}
      <div
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        {responsibleName && <span>Assigned: {responsibleName}</span>}
        {goal.due_date && (
          <span>
            Due:{" "}
            {new Date(goal.due_date).toLocaleDateString("en-AU")}
          </span>
        )}
        {goal.success_measures && (
          <span>Measures: {goal.success_measures}</span>
        )}
      </div>

      {/* Actions */}
      {canManage && goal.status !== "achieved" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleAchieve}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--qip-meeting)",
              color: "var(--qip-meeting-fg)",
            }}
          >
            Mark Achieved
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="active-push touch-target ml-auto rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              color: "var(--destructive)",
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
