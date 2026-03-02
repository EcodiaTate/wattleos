import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { listPlans } from "@/lib/actions/ilp";
import { TransitionStatementForm } from "@/components/domain/learning-plans/transition-statement-form";

export const metadata = { title: "New Transition Statement - WattleOS" };

export default async function NewTransitionStatementPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TRANSITION_STATEMENTS)) {
    redirect("/admin/learning-plans/transition-statements");
  }

  const [studentsResult, plansResult] = await Promise.all([
    listActiveStudents(),
    listPlans({ plan_status: "active" }),
  ]);

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
        <Link
          href="/admin/learning-plans/transition-statements"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Transition Statements
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>New Statement</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Create Transition Statement
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Prepare a transition-to-school statement for a child moving to primary
          school
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <TransitionStatementForm
          students={studentsResult.data}
          plans={plansResult.data ?? []}
        />
      </div>
    </div>
  );
}
