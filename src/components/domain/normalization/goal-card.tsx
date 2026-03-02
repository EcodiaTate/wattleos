"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { INDICATOR_CONFIG, GOAL_STATUS_CONFIG, RATING_LABELS } from "@/lib/constants/normalization";
import { updateNormalizationGoal, deleteNormalizationGoal } from "@/lib/actions/normalization";
import type { NormalizationGoalWithDetails } from "@/types/domain";

interface GoalCardProps {
  goal: NormalizationGoalWithDetails;
  canManage: boolean;
}

export function GoalCard({ goal, canManage }: GoalCardProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const indicatorCfg = INDICATOR_CONFIG[goal.indicator];
  const statusCfg = GOAL_STATUS_CONFIG[goal.status];
  const progressPct = goal.target_rating > goal.current_rating
    ? Math.round(((goal.current_rating - 1) / (goal.target_rating - 1)) * 100)
    : 100;

  function handleMarkAchieved() {
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await updateNormalizationGoal(goal.id, { status: "achieved" });
      if (result.error) {
        haptics.error();
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this goal?")) return;
    startTransition(async () => {
      const result = await deleteNormalizationGoal(goal.id);
      if (result.error) {
        haptics.error();
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: `var(${indicatorCfg.cssVar})`,
              backgroundColor: `var(${indicatorCfg.cssVar})`,
              opacity: 0.15,
            }}
          >
            <span style={{ opacity: 1, color: `var(${indicatorCfg.cssVar})` }}>
              {indicatorCfg.label}
            </span>
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: `var(${statusCfg.cssVar}-fg)`,
              backgroundColor: `var(${statusCfg.cssVar}-bg)`,
            }}
          >
            {statusCfg.label}
          </span>
        </div>
        {goal.target_date && (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Target: {new Date(goal.target_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          {RATING_LABELS[goal.current_rating]}
        </span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              backgroundColor: `var(${indicatorCfg.cssVar})`,
            }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
          {RATING_LABELS[goal.target_rating]}
        </span>
      </div>

      {/* Strategy */}
      <p className="text-sm" style={{ color: "var(--foreground)" }}>
        {goal.strategy}
      </p>

      {goal.progress_notes && (
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          {goal.progress_notes}
        </p>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
        Set by {goal.created_by_user.first_name} {goal.created_by_user.last_name}
        {goal.achieved_at && ` · Achieved ${new Date(goal.achieved_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
      </p>

      {/* Actions */}
      {canManage && goal.status === "active" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleMarkAchieved}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: "var(--normalization-goal-achieved-bg)",
              color: "var(--normalization-goal-achieved-fg)",
            }}
          >
            Mark Achieved
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ color: "var(--destructive)" }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
