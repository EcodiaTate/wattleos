import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPlan } from "@/lib/actions/ilp";
import { ReviewForm } from "@/components/domain/learning-plans/review-form";

export const metadata = { title: "New Plan Review - WattleOS" };

export default async function NewReviewPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ILP)) {
    redirect("/admin/learning-plans");
  }

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
        <span style={{ color: "var(--foreground)" }}>New Review</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Record Plan Review
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Document a formal review of {studentName}&apos;s learning plan
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <ReviewForm planId={planId} goals={plan.goals ?? []} />
      </div>
    </div>
  );
}
