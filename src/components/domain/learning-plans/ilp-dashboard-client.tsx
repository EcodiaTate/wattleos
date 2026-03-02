"use client";

import Link from "next/link";
import type { IlpDashboardData } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { PlanCard } from "./plan-card";
import { TransitionStatementCard } from "./transition-statement-card";

interface StatCardProps {
  label: string;
  value: number;
  alert?: boolean;
}

function StatCard({ label, value, alert }: StatCardProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4 text-center"
      style={{ background: "var(--card)" }}
    >
      <p
        className="text-2xl font-bold"
        style={{
          color: alert ? "var(--destructive)" : "var(--foreground)",
        }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
    </div>
  );
}

interface IlpDashboardClientProps {
  data: IlpDashboardData;
  canManage: boolean;
}

export function IlpDashboardClient({
  data,
  canManage,
}: IlpDashboardClientProps) {
  const haptics = useHaptics();

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Individual Learning Plans
        </h1>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href="/admin/learning-plans/new"
              onClick={() => haptics.light()}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              New Plan
            </Link>
            <Link
              href="/admin/learning-plans/transitions/new"
              onClick={() => haptics.light()}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              New Transition Statement
            </Link>
          </div>
        )}
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Active Plans"
          value={data.summary.total_active_plans}
        />
        <StatCard
          label="Overdue Reviews"
          value={data.summary.plans_overdue_review}
          alert={data.summary.plans_overdue_review > 0}
        />
        <StatCard
          label="Goals In Progress"
          value={data.summary.goals_in_progress}
        />
        <StatCard
          label="Goals Achieved"
          value={data.summary.goals_achieved_this_term}
        />
        <StatCard
          label="Transition Statements"
          value={data.summary.transition_statements_in_progress}
        />
      </div>

      {/* Plans needing review */}
      {data.plans_needing_review.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Plans Needing Review
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: "var(--destructive)",
                  color: "var(--destructive-foreground, #fff)",
                }}
              >
                {data.plans_needing_review.length}
              </span>
            </h2>
            <Link
              href="/admin/learning-plans?status=active"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.plans_needing_review.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Recently updated */}
      {data.recently_updated.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Recently Updated
            </h2>
            <Link
              href="/admin/learning-plans"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all plans
            </Link>
          </div>
          <div className="space-y-3">
            {data.recently_updated.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Transition statements */}
      {data.transition_statements.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Transition Statements
            </h2>
            <Link
              href="/admin/learning-plans/transitions"
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data.transition_statements.map((stmt) => (
              <TransitionStatementCard key={stmt.id} statement={stmt} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state - no data at all */}
      {data.plans_needing_review.length === 0 &&
        data.recently_updated.length === 0 &&
        data.transition_statements.length === 0 &&
        data.summary.total_active_plans === 0 && (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No learning plans yet. Create your first plan to start tracking
              individual learning goals.
            </p>
            {canManage && (
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/admin/learning-plans/new"
                  onClick={() => haptics.light()}
                  className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Create Plan
                </Link>
                <Link
                  href="/admin/learning-plans/transitions/new"
                  onClick={() => haptics.light()}
                  className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
                  style={{
                    background: "var(--card)",
                    color: "var(--foreground)",
                  }}
                >
                  Create Transition Statement
                </Link>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
