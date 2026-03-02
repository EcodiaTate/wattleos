// src/app/(app)/pedagogy/environment-planner/plans/[planId]/edit/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEnvironmentPlan } from "@/lib/actions/environment-planner";
import { listShelfLocations } from "@/lib/actions/materials";
import { EnvironmentPlanForm } from "@/components/domain/environment-planner/environment-plan-form";

export default async function EditEnvironmentPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER)) redirect("/pedagogy/environment-planner");

  const [planResult, locationsResult] = await Promise.all([
    getEnvironmentPlan(planId),
    listShelfLocations(),
  ]);

  if (planResult.error || !planResult.data) redirect("/pedagogy/environment-planner");

  const plan = planResult.data;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Edit Plan
        </h1>
      </div>
      <EnvironmentPlanForm
        plan={plan}
        locations={locationsResult.data ?? []}
        backHref={`/pedagogy/environment-planner/plans/${planId}`}
      />
    </div>
  );
}
