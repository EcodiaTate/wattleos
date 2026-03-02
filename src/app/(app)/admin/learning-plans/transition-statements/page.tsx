import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listTransitionStatements } from "@/lib/actions/ilp";
import { TransitionStatementListClient } from "@/components/domain/learning-plans/transition-statement-list-client";

export const metadata = { title: "Transition Statements - WattleOS" };

export default async function TransitionStatementsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ILP) ||
    hasPermission(context, Permissions.MANAGE_TRANSITION_STATEMENTS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_TRANSITION_STATEMENTS,
  );

  const result = await listTransitionStatements();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ??
            "Failed to load transition statements."}
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
        <span style={{ color: "var(--foreground)" }}>
          Transition Statements
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Transition Statements
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Transition-to-school statements for children moving to primary
            school
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/learning-plans/transition-statements/new"
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Statement
          </Link>
        )}
      </div>

      <TransitionStatementListClient
        statements={result.data}
        canManage={canManage}
      />
    </div>
  );
}
