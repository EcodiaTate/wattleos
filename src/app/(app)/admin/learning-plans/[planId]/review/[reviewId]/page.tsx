import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPlan } from "@/lib/actions/ilp";

export async function generateMetadata(props: {
  params: Promise<{ planId: string; reviewId: string }>;
}) {
  const { reviewId } = await props.params;
  return { title: `Review ${reviewId.slice(0, 8)} - WattleOS` };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatReviewType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatProgressRating(rating: string): string {
  return rating
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ReviewDetailPage(props: {
  params: Promise<{ planId: string; reviewId: string }>;
}) {
  const { planId, reviewId } = await props.params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ILP) ||
    hasPermission(context, Permissions.MANAGE_ILP);
  if (!canView) redirect("/dashboard");

  const result = await getPlan(planId);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Learning plan not found."}
        </p>
        <Link
          href="/admin/learning-plans"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to learning plans
        </Link>
      </div>
    );
  }

  const plan = result.data;
  const studentName =
    plan.student
      ? `${plan.student.first_name ?? ""} ${plan.student.last_name ?? ""}`.trim()
      : "Unknown Student";

  const review = (plan.reviews ?? []).find((r) => r.id === reviewId);

  if (!review) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>Review not found.</p>
        <Link
          href={`/admin/learning-plans/${planId}`}
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/learning-plans"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Learning Plans
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link
          href={`/admin/learning-plans/${planId}`}
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {studentName}
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Review</span>
      </div>

      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Plan Review
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatReviewType(review.review_type)} review for {studentName}
        </p>
      </div>

      {/* Review details card */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Review Date
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {formatDate(review.review_date)}
            </p>
          </div>

          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Review Type
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {formatReviewType(review.review_type)}
            </p>
          </div>

          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Overall Progress
            </p>
            <p
              className="mt-0.5 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {formatProgressRating(review.overall_progress)}
            </p>
          </div>

          {review.conducted_by && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Reviewed By
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {review.conducted_by.slice(0, 8)}
              </p>
            </div>
          )}

          {review.attendees && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Attendees
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {review.attendees}
              </p>
            </div>
          )}

          {review.summary_notes && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Notes
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {review.summary_notes}
              </p>
            </div>
          )}

          {review.family_feedback && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Family Feedback
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {review.family_feedback}
              </p>
            </div>
          )}

          {review.new_review_due_date && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Next Review Date
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {formatDate(review.new_review_due_date)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goal progress updates */}
      {review.goal_updates && review.goal_updates.length > 0 && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Goal Progress Updates
          </h2>
          <div className="space-y-4">
            {review.goal_updates.map(
              (
                update: {
                  goal_id: string;
                  progress_rating: string;
                  notes: string;
                },
                index: number,
              ) => (
                <div
                  key={update.goal_id ?? index}
                  className="rounded-lg border border-border p-4"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        Goal {update.goal_id.slice(0, 8)}
                      </p>
                      {update.notes && (
                        <p
                          className="mt-1 whitespace-pre-wrap text-sm"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {update.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--muted)",
                        color: "var(--foreground)",
                      }}
                    >
                      {formatProgressRating(update.progress_rating)}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
