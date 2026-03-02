import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { PlanForm } from "@/components/domain/learning-plans/plan-form";

export const metadata = { title: "New Learning Plan - WattleOS" };

export default async function NewLearningPlanPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ILP)) {
    redirect("/admin/learning-plans");
  }

  const studentsResult = await listActiveStudents();

  if (studentsResult.error || !studentsResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {studentsResult.error?.message ?? "Failed to load students."}
        </p>
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
        <span style={{ color: "var(--foreground)" }}>New Plan</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Create Learning Plan
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Create an individual learning plan for a child with additional needs
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <PlanForm students={studentsResult.data} />
      </div>
    </div>
  );
}
