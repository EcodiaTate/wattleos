// src/app/(app)/attendance/acara-reporting/page.tsx
//
// ACARA Attendance Reporting - Dashboard
// Lists all report periods and provides quick access to create,
// sync, verify, and export ACARA-format attendance data.

import Link from "next/link";
import { redirect } from "next/navigation";

import { AcaraDashboardClient } from "@/components/domain/acara/acara-dashboard-client";
import { getAcaraDashboard } from "@/lib/actions/acara";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "ACARA Attendance Reporting - WattleOS" };

export default async function AcaraReportingPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_ACARA_REPORTING)) {
    redirect("/attendance");
  }

  const result = await getAcaraDashboard();
  const canManage = hasPermission(ctx, Permissions.MANAGE_ACARA_REPORTING);

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
            <span>ACARA Reporting</span>
          </div>
          <h1 className="text-2xl font-bold">ACARA Attendance Reporting</h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Build, verify, and export attendance data for the Australian
            Curriculum, Assessment and Reporting Authority Annual School
            Collection.
          </p>
        </div>
        {canManage && (
          <Link
            href="/attendance/acara-reporting/new"
            className="touch-target active-push shrink-0 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            + New Period
          </Link>
        )}
      </div>

      {result.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "var(--destructive-bg, hsl(0 60% 94%))",
            color: "var(--destructive)",
          }}
        >
          Failed to load dashboard: {result.error.message}
        </div>
      ) : result.data ? (
        <AcaraDashboardClient data={result.data} canManage={canManage} />
      ) : null}
    </div>
  );
}
