// src/app/(app)/programs/reports/page.tsx
//
// ============================================================
// WattleOS V2 - Program Utilization Reports
// ============================================================
// Server Component wrapper with a client island for the
// date range picker. Shows utilization (capacity vs bookings)
// and attendance (bookings vs check-ins) by program.
//
// WHY separate page: Admins need this for board reports,
// CCS compliance, and capacity planning. It's a read-only
// analytical view distinct from the day-to-day management.
// ============================================================

import { UtilizationReportClient } from "@/components/domain/programs/utilization-report-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export default async function ProgramReportsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_PROGRAM_REPORTS)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Program Utilization Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Capacity vs. attendance across all programs.
        </p>
      </div>

      <UtilizationReportClient />
    </div>
  );
}
