// src/app/(app)/pedagogy/accreditation/page.tsx
// ============================================================
// Accreditation Dashboard - AMI / AMS / MSAA overview
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getAccreditationDashboard } from "@/lib/actions/accreditation";
import { AccreditationDashboardClient } from "@/components/domain/accreditation/accreditation-dashboard-client";

export const metadata = { title: "Accreditation Checklist - WattleOS" };

export default async function AccreditationPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ACCREDITATION) ||
    hasPermission(context, Permissions.MANAGE_ACCREDITATION);

  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_ACCREDITATION);

  const result = await getAccreditationDashboard();
  const data = result.data ?? {
    cycles: [],
    active_cycle_by_body: { ami: null, ams: null, msaa: null },
    total_cycles: 0,
    accredited_count: 0,
  };

  return <AccreditationDashboardClient data={data} canManage={canManage} />;
}
