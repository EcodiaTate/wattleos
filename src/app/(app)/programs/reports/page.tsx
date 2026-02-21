// src/app/(app)/programs/reports/page.tsx
//
// ============================================================
// WattleOS V2 - Program Utilization Reports
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
    <div className="content-grid animate-fade-in space-y-[var(--density-section-gap)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Program Utilization Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Capacity vs. attendance across all programs.
        </p>
      </div>

      <UtilizationReportClient />
    </div>
  );
}