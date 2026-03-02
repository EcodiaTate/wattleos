// src/app/(app)/reports/periods/[periodId]/instances/page.tsx
//
// ============================================================
// WattleOS V2 - Period Instance List (Admin)
// ============================================================
// Lists all report instances for a period with status filters.
// Allows admin to click into each one to review/approve.
// Also shows bulk actions: approve all submitted, publish all approved.
// ============================================================

import { PeriodInstanceListClient } from "@/components/domain/reports/PeriodInstanceListClient";
import { listPeriodInstances } from "@/lib/actions/reports/instances";
import { getReportPeriod } from "@/lib/actions/reports/periods";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ReportInstanceStatus } from "@/types/domain";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ periodId: string }>;
  searchParams: Promise<{ status?: string; guide?: string }>;
}

export default async function PeriodInstanceListPage({
  params,
  searchParams,
}: PageProps) {
  const { periodId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports/my-reports");
  }

  const sp = await searchParams;
  const statusFilter = sp.status as ReportInstanceStatus | undefined;
  const guideFilter = sp.guide;

  const [periodResult, instancesResult] = await Promise.all([
    getReportPeriod(periodId),
    listPeriodInstances(periodId, {
      status: statusFilter,
      guide_id: guideFilter,
      per_page: 200,
    }),
  ]);

  if (periodResult.error || !periodResult.data) {
    redirect("/reports/periods");
  }

  const period = periodResult.data;
  const instances = instancesResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports/periods" className="hover:text-foreground">
              Periods
            </Link>
            <span>/</span>
            <Link
              href={`/reports/periods/${periodId}/dashboard`}
              className="hover:text-foreground"
            >
              {period.name}
            </Link>
            <span>/</span>
            <span className="text-foreground">Instances</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {period.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {instances.length} report{instances.length !== 1 ? "s" : ""}
            {statusFilter ? ` - ${statusFilter.replace(/_/g, " ")}` : " total"}
          </p>
        </div>
        <Link
          href={`/reports/periods/${periodId}/dashboard`}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            "",
            "not_started",
            "in_progress",
            "submitted",
            "changes_requested",
            "approved",
            "published",
          ] as const
        ).map((s) => (
          <Link
            key={s}
            href={
              s
                ? `/reports/periods/${periodId}/instances?status=${s}`
                : `/reports/periods/${periodId}/instances`
            }
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s || (!statusFilter && !s)
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {s
              ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
              : "All"}
          </Link>
        ))}
      </div>

      {/* Client list with bulk actions */}
      <PeriodInstanceListClient
        periodId={periodId}
        instances={instances}
        statusFilter={statusFilter}
      />
    </div>
  );
}
