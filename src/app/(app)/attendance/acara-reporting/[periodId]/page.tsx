// src/app/(app)/attendance/acara-reporting/[periodId]/page.tsx
//
// Report period detail - shows student records, allows sync,
// manual overrides, verification, and CSV export.

import Link from "next/link";
import { redirect } from "next/navigation";

import { AcaraPeriodDetailClient } from "@/components/domain/acara/acara-period-detail-client";
import {
  getAcaraReportPeriod,
  listAcaraStudentRecords,
} from "@/lib/actions/acara";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "ACARA Report Period - WattleOS" };

interface Props {
  params: Promise<{ periodId: string }>;
}

export default async function AcaraPeriodDetailPage({ params }: Props) {
  const { periodId } = await params;
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_ACARA_REPORTING)) {
    redirect("/attendance/acara-reporting");
  }

  const [periodResult, recordsResult] = await Promise.all([
    getAcaraReportPeriod(periodId),
    listAcaraStudentRecords({ report_period_id: periodId }),
  ]);

  if (periodResult.error || !periodResult.data) {
    redirect("/attendance/acara-reporting");
  }

  const canManage = hasPermission(ctx, Permissions.MANAGE_ACARA_REPORTING);
  const period = periodResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-sm mb-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Link href="/attendance" className="hover:underline">
              Attendance
            </Link>
            <span>/</span>
            <Link
              href="/attendance/acara-reporting"
              className="hover:underline"
            >
              ACARA Reporting
            </Link>
            <span>/</span>
            <span>
              {period.calendar_year}{" "}
              {period.collection_type === "annual_school_collection"
                ? "ASC"
                : period.collection_type === "semester_1_snapshot"
                  ? "Sem 1"
                  : "Sem 2"}
            </span>
          </div>
          <h1 className="text-2xl font-bold">
            {period.calendar_year} -{" "}
            {period.collection_type === "annual_school_collection"
              ? "Annual School Collection"
              : period.collection_type === "semester_1_snapshot"
                ? "Semester 1 Snapshot"
                : "Semester 2 Snapshot"}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {period.period_start} → {period.period_end}
          </p>
        </div>
      </div>

      <AcaraPeriodDetailClient
        period={period}
        records={recordsResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
