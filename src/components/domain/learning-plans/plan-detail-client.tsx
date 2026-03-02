"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { updatePlanStatus } from "@/lib/actions/ilp";
import type {
  IndividualLearningPlanWithDetails,
  IlpPlanStatus,
} from "@/types/domain";
import {
  SUPPORT_CATEGORY_CONFIG,
  FUNDING_SOURCE_CONFIG,
  VALID_PLAN_TRANSITIONS,
  ILP_PLAN_STATUS_CONFIG,
} from "@/lib/constants/ilp";
import { PlanStatusBadge } from "./plan-status-badge";
import { SupportCategoryTags } from "./support-category-tags";
import { GoalCard } from "./goal-card";
import { CollaboratorList } from "./collaborator-list";
import { EvidenceLinker } from "./evidence-linker";
import { ReviewTimeline } from "./review-timeline";

type Tab = "overview" | "goals" | "collaborators" | "evidence" | "reviews";

const TABS: Array<{ label: string; value: Tab }> = [
  { label: "Overview", value: "overview" },
  { label: "Goals", value: "goals" },
  { label: "Collaborators", value: "collaborators" },
  { label: "Evidence", value: "evidence" },
  { label: "Reviews", value: "reviews" },
];

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

interface PlanDetailClientProps {
  plan: IndividualLearningPlanWithDetails;
  canManage: boolean;
}

export function PlanDetailClient({ plan, canManage }: PlanDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const student = plan.student;
  const displayName = student.preferred_name
    ? `${student.preferred_name} ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const goalsTotal = plan.goals.length;
  const goalsAchieved = plan.goals.filter(
    (g) => g.goal_status === "achieved",
  ).length;

  const validTransitions = VALID_PLAN_TRANSITIONS[plan.plan_status] ?? [];

  function handleStatusChange(newStatus: IlpPlanStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updatePlanStatus(plan.id, newStatus);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.medium();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {getInitials(student.first_name, student.last_name)}
            </div>
          )}
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {plan.plan_title}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {displayName}
            </p>
            <div className="mt-1">
              <PlanStatusBadge status={plan.plan_status} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/learning-plans/${plan.id}/edit`}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              Edit Plan
            </Link>

            {validTransitions.map((targetStatus) => {
              const cfg = ILP_PLAN_STATUS_CONFIG[targetStatus as IlpPlanStatus];
              return (
                <button
                  key={targetStatus}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange(targetStatus as IlpPlanStatus)}
                  className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isPending ? "..." : cfg.label}
                </button>
              );
            })}

            {plan.plan_status === "active" && (
              <Link
                href={`/admin/learning-plans/${plan.id}/review`}
                className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Start Review
              </Link>
            )}

            <Link
              href={`/admin/learning-plans/${plan.id}/export`}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              Export
            </Link>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0 scroll-native" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              haptics.light();
              setActiveTab(tab.value);
            }}
            className="active-push flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderColor:
                activeTab === tab.value ? "var(--primary)" : "transparent",
              color:
                activeTab === tab.value
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
            }}
          >
            {tab.label}
            {tab.value === "goals" && goalsTotal > 0 && (
              <span className="ml-1 opacity-70">({goalsTotal})</span>
            )}
            {tab.value === "collaborators" && plan.collaborators.length > 0 && (
              <span className="ml-1 opacity-70">({plan.collaborators.length})</span>
            )}
            {tab.value === "reviews" && plan.reviews.length > 0 && (
              <span className="ml-1 opacity-70">({plan.reviews.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab plan={plan} displayName={displayName} goalsTotal={goalsTotal} goalsAchieved={goalsAchieved} />
      )}

      {activeTab === "goals" && (
        <GoalsTab plan={plan} canManage={canManage} />
      )}

      {activeTab === "collaborators" && (
        <CollaboratorList
          collaborators={plan.collaborators}
          canManage={canManage}
          planId={plan.id}
        />
      )}

      {activeTab === "evidence" && (
        <EvidenceLinker
          planId={plan.id}
          evidence={[]}
          canManage={canManage}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewTimeline reviews={plan.reviews} />
      )}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({
  plan,
  displayName,
  goalsTotal,
  goalsAchieved,
}: {
  plan: IndividualLearningPlanWithDetails;
  displayName: string;
  goalsTotal: number;
  goalsAchieved: number;
}) {
  const progressPercent = goalsTotal > 0 ? Math.round((goalsAchieved / goalsTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Status" value={ILP_PLAN_STATUS_CONFIG[plan.plan_status].label} />
        <StatCard label="Goals" value={`${goalsAchieved}/${goalsTotal}`} />
        <StatCard label="Collaborators" value={String(plan.collaborators.length)} />
        <StatCard label="Reviews" value={String(plan.reviews.length)} />
      </div>

      {/* Goal progress */}
      {goalsTotal > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Goal Progress
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
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

      {/* Support categories */}
      {plan.support_categories.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <p
            className="mb-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Support Categories
          </p>
          <SupportCategoryTags categories={plan.support_categories} />
        </div>
      )}

      {/* Plan details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Dates */}
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <p
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Key Dates
          </p>
          <div className="space-y-2">
            <DetailRow label="Start Date" value={formatDate(plan.start_date)} />
            {plan.review_due_date && (
              <DetailRow label="Review Due" value={formatDate(plan.review_due_date)} />
            )}
            {plan.next_review_date && (
              <DetailRow label="Next Review" value={formatDate(plan.next_review_date)} />
            )}
            {plan.end_date && (
              <DetailRow label="End Date" value={formatDate(plan.end_date)} />
            )}
          </div>
        </div>

        {/* Funding */}
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          <p
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Funding
          </p>
          <div className="space-y-2">
            <DetailRow
              label="Source"
              value={
                plan.funding_source
                  ? FUNDING_SOURCE_CONFIG[plan.funding_source].label
                  : "Not specified"
              }
            />
            {plan.funding_reference && (
              <DetailRow label="Reference" value={plan.funding_reference} />
            )}
          </div>
        </div>
      </div>

      {/* Consent */}
      <div
        className="rounded-[var(--radius-lg)] border border-border p-4"
        style={{ background: "var(--card)" }}
      >
        <p
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Parent/Guardian Consent
        </p>
        <div className="space-y-2">
          <DetailRow
            label="Consent"
            value={plan.parent_consent_given ? "Obtained" : "Not yet obtained"}
          />
          {plan.parent_consent_date && (
            <DetailRow label="Date" value={formatDate(plan.parent_consent_date)} />
          )}
          {plan.parent_consent_by && (
            <DetailRow label="Given By" value={plan.parent_consent_by} />
          )}
        </div>
      </div>

      {/* Child profile sections */}
      {plan.child_strengths && (
        <TextSection title="Child Strengths" text={plan.child_strengths} />
      )}
      {plan.child_interests && (
        <TextSection title="Child Interests" text={plan.child_interests} />
      )}
      {plan.background_information && (
        <TextSection title="Background Information" text={plan.background_information} />
      )}
      {plan.family_goals && (
        <TextSection title="Family Goals" text={plan.family_goals} />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-3 text-center"
      style={{ background: "var(--card)" }}
    >
      <p
        className="text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-lg font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function TextSection({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--card)" }}
    >
      <p
        className="mb-2 text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </p>
      <p
        className="whitespace-pre-wrap text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        {text}
      </p>
    </div>
  );
}

// ── Goals Tab ────────────────────────────────────────────────

function GoalsTab({
  plan,
  canManage,
}: {
  plan: IndividualLearningPlanWithDetails;
  canManage: boolean;
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleGoalStatusChange(goalId: string, newStatus: string) {
    startTransition(async () => {
      const { updateGoal } = await import("@/lib/actions/ilp");
      const result = await updateGoal(goalId, { goal_status: newStatus as "not_started" | "in_progress" | "achieved" | "modified" | "discontinued" });
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.medium();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Link
            href={`/admin/learning-plans/${plan.id}/goals/new`}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Add Goal
          </Link>
        </div>
      )}

      {plan.goals.length === 0 ? (
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
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No goals added yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {plan.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              canManage={canManage}
              onStatusChange={(goalId, status) =>
                handleGoalStatusChange(goalId, status)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
