// src/app/(app)/attendance/history/page.tsx
//
// ============================================================
// WattleOS V2 - Attendance History Page
// ============================================================
// Server Component with client-side filtering. Shows attendance
// records for a class over a date range, with summary stats.
//
// WHY separate from roll call: Roll call is today's workflow.
// History is a reporting/review tool - different mental model,
// different layout (table vs tap-to-mark).
// ============================================================

import { AttendanceHistoryClient } from "@/components/domain/attendance/attendance-history-client";
import { listClasses } from "@/lib/actions/classes";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AttendanceHistoryPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.MANAGE_ATTENDANCE) &&
    !hasPermission(context, Permissions.VIEW_ATTENDANCE_REPORTS)
  ) {
    redirect("/dashboard");
  }

  const classesResult = await listClasses();
  const classes = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/attendance" className="hover:text-foreground">
              Attendance
            </Link>
            <span>/</span>
            <span className="text-foreground">History</span>
          </nav>
          <h1 className="mt-1 text-xl font-bold text-foreground">
            Attendance History
          </h1>
        </div>
        <Link
          href="/attendance/absences"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
        >
          Absence Report
        </Link>
      </div>

      <AttendanceHistoryClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          room: c.room,
          cycleLevel: c.cycle_level,
        }))}
      />
    </div>
  );
}
