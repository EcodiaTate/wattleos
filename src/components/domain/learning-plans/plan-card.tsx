"use client";

import Link from "next/link";
import type { IndividualLearningPlanListItem } from "@/types/domain";
import { PlanStatusBadge } from "./plan-status-badge";
import { SupportCategoryTags } from "./support-category-tags";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface PlanCardProps {
  plan: IndividualLearningPlanListItem;
}

export function PlanCard({ plan }: PlanCardProps) {
  const student = plan.student;
  const displayName = student.preferred_name
    ? `${student.preferred_name} ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const goalTotal = plan.goal_count;
  const goalsAchieved = plan.goals_achieved;
  const progressPercent = goalTotal > 0 ? Math.round((goalsAchieved / goalTotal) * 100) : 0;

  const isOverdue =
    plan.next_review !== null &&
    new Date(plan.next_review + "T00:00:00") < new Date();

  return (
    <Link
      href={`/admin/learning-plans/${plan.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Student avatar */}
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {getInitials(student.first_name, student.last_name)}
            </div>
          )}
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {plan.plan_title}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {displayName}
            </p>
          </div>
        </div>
        <PlanStatusBadge status={plan.plan_status} />
      </div>

      {/* Support category tags */}
      {plan.support_categories.length > 0 && (
        <div className="mt-2">
          <SupportCategoryTags categories={plan.support_categories} />
        </div>
      )}

      {/* Goal progress bar */}
      {goalTotal > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Goals
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {goalsAchieved}/{goalTotal} achieved
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: "var(--ilp-goal-achieved)",
              }}
            />
          </div>
        </div>
      )}

      {/* Next review date */}
      {plan.next_review !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>
            Next review:
          </span>
          <span
            className="font-medium"
            style={{
              color: isOverdue
                ? "var(--destructive)"
                : "var(--foreground)",
            }}
          >
            {formatDate(plan.next_review)}
            {isOverdue && " (overdue)"}
          </span>
        </div>
      )}
    </Link>
  );
}
