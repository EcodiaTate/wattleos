// src/app/(app)/attendance/absences/page.tsx
//
// ============================================================
// WattleOS V2 - Absence Report Page
// ============================================================
// Shows absent/late records with filtering for unexplained
// absences. Regulatory requirement: Australian schools must
// follow up on unexplained absences within 3 days.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listClasses } from '@/lib/actions/classes';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AbsenceReportClient } from '@/components/domain/attendance/absence-report-client';

export default async function AbsenceReportPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_ATTENDANCE_REPORTS)) {
    redirect('/dashboard');
  }

  const classesResult = await listClasses();
  const classes = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/attendance" className="hover:text-gray-700">
              Attendance
            </Link>
            <span>/</span>
            <span className="text-gray-900">Absence Report</span>
          </nav>
          <h1 className="mt-1 text-xl font-bold text-gray-900">
            Absence Report
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and follow up on unexplained absences.
          </p>
        </div>
        <Link
          href="/attendance/history"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Full History
        </Link>
      </div>

      <AbsenceReportClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />
    </div>
  );
}