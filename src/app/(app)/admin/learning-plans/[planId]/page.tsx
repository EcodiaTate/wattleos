import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPlan } from "@/lib/actions/ilp";
import { PlanDetailClient } from "@/components/domain/learning-plans/plan-detail-client";

export async function generateMetadata(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  return { title: `Plan ${planId.slice(0, 8)} - WattleOS` };
}

export default async function PlanDetailPage(props: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await props.params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ILP) ||
    hasPermission(context, Permissions.MANAGE_ILP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_ILP);

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
        <span style={{ color: "var(--foreground)" }}>{studentName}</span>
      </div>

      <PlanDetailClient plan={plan} canManage={canManage} />
    </div>
  );
}
