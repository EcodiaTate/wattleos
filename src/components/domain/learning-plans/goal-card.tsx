"use client";

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { IlpGoalStatus, IlpGoalWithStrategies } from "@/types/domain";
import {
  DEVELOPMENTAL_DOMAIN_CONFIG,
  STRATEGY_TYPE_CONFIG,
  VALID_GOAL_TRANSITIONS,
  ILP_GOAL_STATUS_CONFIG,
} from "@/lib/constants/ilp";
import { GoalStatusBadge } from "./goal-status-badge";
import { PriorityBadge } from "./priority-badge";

interface GoalCardProps {
  goal: IlpGoalWithStrategies;
  canManage: boolean;
  onStatusChange?: (goalId: string, status: IlpGoalStatus) => void;
}

export function GoalCard({ goal, canManage, onStatusChange }: GoalCardProps) {
  const haptics = useHaptics();
  const [isExpanded, setIsExpanded] = useState(false);

  const domainCfg = DEVELOPMENTAL_DOMAIN_CONFIG[goal.developmental_domain];
  const validTransitions = VALID_GOAL_TRANSITIONS[goal.goal_status] ?? [];

  // Calculate a simple progress representation based on status
  const progressMap: Record<IlpGoalStatus, number> = {
    not_started: 0,
    in_progress: 50,
    achieved: 100,
    modified: 40,
    discontinued: 0,
  };
  const progressPercent = progressMap[goal.goal_status];

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border"
      style={{ background: "var(--card)" }}
    >
      {/* Header (clickable to expand) */}
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setIsExpanded(!isExpanded);
        }}
        className="active-push w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-lg">{domainCfg.emoji}</span>
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {goal.goal_title}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {domainCfg.label}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <PriorityBadge priority={goal.priority} />
            <GoalStatusBadge status={goal.goal_status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background:
                  goal.goal_status === "achieved"
                    ? "var(--ilp-goal-achieved)"
                    : goal.goal_status === "discontinued"
                      ? "var(--ilp-goal-discontinued)"
                      : "var(--ilp-goal-in-progress)",
              }}
            />
          </div>
        </div>

        {/* Expand indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>
            {goal.strategies.length} strateg{goal.strategies.length === 1 ? "y" : "ies"}
          </span>
          <span>\u00b7</span>
          <span>
            {goal.evidence_count} evidence item{goal.evidence_count !== 1 ? "s" : ""}
          </span>
          <span className="ml-auto">{isExpanded ? "\u25b2" : "\u25bc"}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--border)" }}>
          {/* Goal description */}
          {goal.goal_description && (
            <div className="mb-3">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Description
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {goal.goal_description}
              </p>
            </div>
          )}

          {/* EYLF Outcomes */}
          {goal.eylf_outcome_ids.length > 0 && (
            <div className="mb-3">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                EYLF Outcomes
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {goal.eylf_outcome_ids.map((outcome, idx) => (
                  <span
                    key={idx}
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      background: "var(--muted)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {outcome}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Baseline & Success Criteria */}
          {goal.baseline_notes && (
            <div className="mb-3">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Baseline
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {goal.baseline_notes}
              </p>
            </div>
          )}

          {goal.success_criteria && (
            <div className="mb-3">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Success Criteria
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {goal.success_criteria}
              </p>
            </div>
          )}

          {/* Target date */}
          {goal.target_date && (
            <div className="mb-3 text-xs">
              <span style={{ color: "var(--muted-foreground)" }}>Target: </span>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                {new Date(goal.target_date + "T00:00:00").toLocaleDateString(
                  "en-AU",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </span>
            </div>
          )}

          {/* Strategies list */}
          {goal.strategies.length > 0 && (
            <div className="mb-3">
              <p
                className="mb-2 text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Strategies
              </p>
              <div className="space-y-2">
                {goal.strategies.map((strategy) => {
                  const typeCfg = STRATEGY_TYPE_CONFIG[strategy.strategy_type];
                  return (
                    <div
                      key={strategy.id}
                      className="rounded-[var(--radius-md)] border border-border p-3"
                      style={{ background: "var(--background)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: "var(--muted)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {typeCfg.label}
                          </span>
                          <p
                            className="mt-1.5 whitespace-pre-wrap text-sm"
                            style={{ color: "var(--foreground)" }}
                          >
                            {strategy.strategy_description}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {strategy.responsible_role && (
                              <span>Responsible: {strategy.responsible_role}</span>
                            )}
                            {strategy.implementation_frequency && (
                              <span>Frequency: {strategy.implementation_frequency}</span>
                            )}
                          </div>
                        </div>
                        {!strategy.is_active && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: "var(--muted)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status change buttons */}
          {canManage && validTransitions.length > 0 && onStatusChange && (
            <div className="mt-3 flex flex-wrap gap-2">
              {validTransitions.map((targetStatus) => {
                const cfg = ILP_GOAL_STATUS_CONFIG[targetStatus as IlpGoalStatus];
                return (
                  <button
                    key={targetStatus}
                    type="button"
                    onClick={() => {
                      if (targetStatus === "achieved") {
                        haptics.heavy();
                      } else {
                        haptics.medium();
                      }
                      onStatusChange(goal.id, targetStatus as IlpGoalStatus);
                    }}
                    className="active-push touch-target rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      background: cfg.cssVar,
                      color: cfg.cssVarFg,
                    }}
                  >
                    Mark as {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
