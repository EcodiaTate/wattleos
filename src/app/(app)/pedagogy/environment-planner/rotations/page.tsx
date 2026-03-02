// src/app/(app)/pedagogy/environment-planner/rotations/page.tsx
import { redirect } from "next/navigation";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listRotationSchedules } from "@/lib/actions/environment-planner";
import { listShelfLocations } from "@/lib/actions/materials";
import { RotationListClient } from "@/components/domain/environment-planner/rotation-list-client";

export default async function RotationSchedulesPage() {
  const ctx = await getTenantContext();
  if (!hasPermission(ctx, Permissions.VIEW_ENVIRONMENT_PLANNER)) redirect("/");

  const canManage = hasPermission(ctx, Permissions.MANAGE_ENVIRONMENT_PLANNER);

  const [schedulesResult, locationsResult] = await Promise.all([
    listRotationSchedules({ per_page: 50 }),
    listShelfLocations(),
  ]);

  return (
    <RotationListClient
      schedules={schedulesResult.data?.schedules ?? []}
      locations={locationsResult.data ?? []}
      canManage={canManage}
    />
  );
}
