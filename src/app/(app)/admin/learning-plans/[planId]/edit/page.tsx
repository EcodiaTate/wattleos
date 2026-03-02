import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPlan } from "@/lib/actions/ilp";
import { listActiveStudents } from "@/lib/actions/students";
import { PlanForm } from "@/components/domain/learning-plans/plan-form";

export const metadata = { title: "Edit Learning Plan - WattleOS" };

export default async function EditPlanPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ILP)) {
    redirect("/admin/learning-plans");
  }

  const [planResult, studentsResult] = await Promise.all([
    getPlan(planId),
    listActiveStudents(),
  ]);

  if (planResult.error || !planResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {planResult.error?.message ?? "Learning plan not found."}
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

  if (studentsResult.error || !studentsResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {studentsResult.error?.message ?? "Failed to load students."}
        </p>
      </div>
    );
  }

  const plan = planResult.data;
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
        <span style={{ color: "var(--foreground)" }}>Edit</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Edit Learning Plan
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Update the learning plan details, goals, and strategies
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <PlanForm plan={plan} students={studentsResult.data} />
      </div>
    </div>
  );
}
