// src/app/(app)/attendance/chronic-absence/[studentId]/page.tsx
//
// Per-student chronic absence detail:
//   - Rate summary + status badge
//   - 12-week trend chart
//   - Active flag panel (create / resolve / dismiss)
//   - Follow-up log timeline
//   - Wellbeing referral prompt for severe cases

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StudentAbsenceDetailClient } from "@/components/domain/chronic-absence/student-absence-detail-client";
import { getStudentAbsenceDetail } from "@/lib/actions/chronic-absence";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

interface Props {
  params: Promise<{ studentId: string }>;
}

export const metadata = { title: "Student Absence Detail - WattleOS" };

export default async function StudentAbsenceDetailPage({ params }: Props) {
  const { studentId } = await params;
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_CHRONIC_ABSENCE)) {
    redirect("/attendance");
  }

  const result = await getStudentAbsenceDetail(studentId);
  if (result.error || !result.data) notFound();

  const detail = result.data;
  const canManage = hasPermission(ctx, Permissions.MANAGE_CHRONIC_ABSENCE);
  const studentName = `${detail.summary.student.preferred_name ?? detail.summary.student.first_name} ${detail.summary.student.last_name}`;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/attendance" className="hover:underline">
          Attendance
        </Link>
        <span>/</span>
        <Link href="/attendance/chronic-absence" className="hover:underline">
          Chronic Absence
        </Link>
        <span>/</span>
        <span className="text-foreground">{studentName}</span>
      </div>

      <StudentAbsenceDetailClient detail={detail} canManage={canManage} />
    </div>
  );
}
