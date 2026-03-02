import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPlan } from "@/lib/actions/ilp";
import { PlanExportClient } from "@/components/domain/learning-plans/plan-export-client";

export const metadata = { title: "Export Learning Plan - WattleOS" };

export default async function PlanExportPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
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
        <span style={{ color: "var(--foreground)" }}>Export</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Export Learning Plan
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Generate a PDF summary of {studentName}&apos;s learning plan for
          sharing with families or allied health professionals
        </p>
      </div>

      {/* Plan summary card */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Plan Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Student
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {studentName}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Status
            </p>
            <p
              className="mt-0.5 text-sm capitalize"
              style={{ color: "var(--foreground)" }}
            >
              {plan.plan_status?.replace("_", " ") ?? "Draft"}
            </p>
          </div>
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
              {plan.start_date
                ? new Date(plan.start_date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not set"}
            </p>
          </div>
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
              {plan.next_review_date
                ? new Date(plan.next_review_date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not set"}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Goals
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {plan.goals?.length ?? 0} goal
              {(plan.goals?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Reviews
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {plan.reviews?.length ?? 0} review
              {(plan.reviews?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <PlanExportClient planId={planId} studentName={studentName} />
    </div>
  );
}
