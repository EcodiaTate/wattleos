// src/app/(app)/pedagogy/environment-planner/plans/new/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listShelfLocations } from "@/lib/actions/materials";
import { EnvironmentPlanForm } from "@/components/domain/environment-planner/environment-plan-form";

export default async function NewEnvironmentPlanPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER)) redirect("/pedagogy/environment-planner");

  const locationsResult = await listShelfLocations();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          New Environment Plan
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Design a shelf layout for a specific location.
        </p>
      </div>
      <EnvironmentPlanForm
        locations={locationsResult.data ?? []}
        backHref="/pedagogy/environment-planner"
      />
    </div>
  );
}
