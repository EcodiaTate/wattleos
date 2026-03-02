// src/app/(app)/pedagogy/environment-planner/rotations/new/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listShelfLocations } from "@/lib/actions/materials";
import { listEnvironmentPlans } from "@/lib/actions/environment-planner";
import { RotationScheduleForm } from "@/components/domain/environment-planner/rotation-schedule-form";

export default async function NewRotationSchedulePage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER)) redirect("/pedagogy/environment-planner");

  const [locationsResult, plansResult] = await Promise.all([
    listShelfLocations(),
    listEnvironmentPlans({ per_page: 100 }),
  ]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Schedule Rotation
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Plan when and what materials will be rotated on the shelf.
        </p>
      </div>
      <RotationScheduleForm
        locations={locationsResult.data ?? []}
        plans={plansResult.data?.plans ?? []}
        backHref="/pedagogy/environment-planner"
      />
    </div>
  );
}
