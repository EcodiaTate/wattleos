// src/app/(app)/pedagogy/environment-planner/plans/[planId]/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEnvironmentPlan } from "@/lib/actions/environment-planner";
import { listInventoryItems } from "@/lib/actions/materials";
import { EnvironmentPlanDetailClient } from "@/components/domain/environment-planner/environment-plan-detail-client";

export default async function EnvironmentPlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_ENVIRONMENT_PLANNER)) redirect("/");

  const canManage = hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER);

  const [planResult, itemsResult] = await Promise.all([
    getEnvironmentPlan(planId),
    listInventoryItems({ per_page: 200 }),
  ]);

  if (planResult.error || !planResult.data) {
    return (
      <div className="p-6" style={{ color: "var(--text-secondary)" }}>
        Plan not found.
      </div>
    );
  }

  return (
    <EnvironmentPlanDetailClient
      plan={planResult.data}
      availableItems={itemsResult.data?.items ?? []}
      canManage={canManage}
    />
  );
}
