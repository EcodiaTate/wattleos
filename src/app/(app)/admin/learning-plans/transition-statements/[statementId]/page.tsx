import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getTransitionStatement } from "@/lib/actions/ilp";
import { TransitionStatementForm } from "@/components/domain/learning-plans/transition-statement-form";

export async function generateMetadata(props: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = await props.params;
  return {
    title: `Transition Statement ${statementId.slice(0, 8)} - WattleOS`,
  };
}

export default async function TransitionStatementDetailPage(props: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = await props.params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TRANSITION_STATEMENTS)) {
    redirect("/admin/learning-plans/transition-statements");
  }

  const result = await getTransitionStatement(statementId);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Transition statement not found."}
        </p>
        <Link
          href="/admin/learning-plans/transition-statements"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to transition statements
        </Link>
      </div>
    );
  }

  const statement = result.data;
  const studentName =
    statement.student
      ? `${statement.student.first_name ?? ""} ${statement.student.last_name ?? ""}`.trim()
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
          href="/admin/learning-plans/transition-statements"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Transition Statements
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>{studentName}</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Transition Statement
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Transition-to-school statement for {studentName}
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <TransitionStatementForm statement={statement} students={[]} />
      </div>
    </div>
  );
}
