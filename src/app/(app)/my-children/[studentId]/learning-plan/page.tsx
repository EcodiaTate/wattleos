import { getTenantContext } from "@/lib/auth/tenant-context";
import { listPlans, getPlan } from "@/lib/actions/ilp";

export const metadata = { title: "Learning Plan - WattleOS" };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatGoalStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ParentLearningPlanPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;

  // getTenantContext still needed for auth - RLS enforces guardian access
  await getTenantContext();

  const plansResult = await listPlans({
    student_id: studentId,
    plan_status: "active",
  });

  if (plansResult.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {plansResult.error.message ?? "Failed to load learning plan."}
        </p>
      </div>
    );
  }

  const plans = plansResult.data ?? [];

  if (plans.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Learning Plan
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Individual learning plan details
          </p>
        </div>
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <svg
              className="h-6 w-6"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No Active Learning Plan
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            There is no active individual learning plan for this child at this
            time. If you believe one should be in place, please speak with your
            child&apos;s educator.
          </p>
        </div>
      </div>
    );
  }

  // Fetch the full plan details for the first active plan
  const planResult = await getPlan(plans[0].id);

  if (planResult.error || !planResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {planResult.error?.message ?? "Failed to load learning plan details."}
        </p>
      </div>
    );
  }

  const plan = planResult.data;
  const studentName = plan.student
    ? (plan.student.preferred_name ?? plan.student.first_name ?? "") +
      " " +
      (plan.student.last_name ?? "")
    : "Your Child";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Learning Plan
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {studentName.trim()}&apos;s individual learning plan
        </p>
      </div>

      {/* Plan overview card */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Plan Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plan.support_categories && plan.support_categories.length > 0 && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Support Categories
              </p>
              <p
                className="mt-0.5 text-sm capitalize"
                style={{ color: "var(--foreground)" }}
              >
                {plan.support_categories
                  .map((c) => c.replace("_", " "))
                  .join(", ")}
              </p>
            </div>
          )}
          {plan.start_date && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Start Date
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {formatDate(plan.start_date)}
              </p>
            </div>
          )}
          {plan.review_due_date && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Next Review
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {formatDate(plan.review_due_date)}
              </p>
            </div>
          )}
          {plan.funding_source && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Funding Source
              </p>
              <p
                className="mt-0.5 text-sm capitalize"
                style={{ color: "var(--foreground)" }}
              >
                {plan.funding_source.replace(/_/g, " ")}
              </p>
            </div>
          )}
          {plan.child_strengths && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Strengths & Interests
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {plan.child_strengths}
              </p>
            </div>
          )}
          {plan.background_information && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Background
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {plan.background_information}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      {plan.goals && plan.goals.length > 0 && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Goals
          </h2>
          <div className="space-y-4">
            {plan.goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-border p-4"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {goal.goal_title}
                  </h3>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                    style={{
                      backgroundColor: "var(--muted)",
                      color: "var(--foreground)",
                    }}
                  >
                    {formatGoalStatus(goal.goal_status)}
                  </span>
                </div>
                {goal.goal_description && (
                  <p
                    className="mt-2 whitespace-pre-wrap text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {goal.goal_description}
                  </p>
                )}
                {goal.strategies && goal.strategies.length > 0 && (
                  <div className="mt-3">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Strategies
                    </p>
                    <p
                      className="mt-0.5 whitespace-pre-wrap text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {goal.strategies
                        .map((s) => s.strategy_description)
                        .join("; ")}
                    </p>
                  </div>
                )}
                {goal.success_criteria && (
                  <div className="mt-3">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Success Criteria
                    </p>
                    <p
                      className="mt-0.5 whitespace-pre-wrap text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {goal.success_criteria}
                    </p>
                  </div>
                )}
                {goal.target_date && (
                  <p
                    className="mt-3 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Target: {formatDate(goal.target_date)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Background Information */}
      {plan.background_information && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-3 text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Background Information
          </h2>
          <p
            className="whitespace-pre-wrap text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {plan.background_information}
          </p>
        </div>
      )}

      {/* Recent reviews (read-only) */}
      {plan.reviews && plan.reviews.length > 0 && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Recent Reviews
          </h2>
          <div className="space-y-3">
            {plan.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-border p-4"
                style={{ backgroundColor: "var(--background)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatDate(review.review_date)} &mdash;{" "}
                    {review.review_type
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                    style={{
                      backgroundColor: "var(--muted)",
                      color: "var(--foreground)",
                    }}
                  >
                    {review.overall_progress
                      .split("_")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </span>
                </div>
                {review.summary_notes && (
                  <p
                    className="mt-2 whitespace-pre-wrap text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {review.summary_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
