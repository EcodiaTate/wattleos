// src/app/(app)/reports/students/page.tsx
//
// ============================================================
// WattleOS Report Builder - Student Management
// ============================================================
// Coordinators add/edit/delete students for the standalone
// report builder (no SIS). Free tier: 40 students.
//
// Server component wraps StudentsClient for all mutations.
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  listReportBuilderStudents,
  getStudentCount,
} from "@/lib/actions/reports/report-builder-students";
import { StudentsClient } from "@/components/domain/reports/StudentsClient";

export const metadata = { title: "Students - WattleOS Reports" };

export const FREE_TIER_STUDENT_LIMIT = 40;

export default async function ReportsStudentsPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_REPORTS)) {
    redirect("/reports");
  }

  const planTier = context.tenant.plan_tier as "free" | "pro" | "enterprise";
  const isFree = planTier === "free";

  const [studentsResult, countResult] = await Promise.all([
    listReportBuilderStudents({ per_page: 200 }),
    getStudentCount(),
  ]);

  const students = studentsResult.data ?? [];
  const studentCount = countResult.data ?? 0;
  const atLimit = isFree && studentCount >= FREE_TIER_STUDENT_LIMIT;

  return (
    <StudentsClient
      initialStudents={students}
      studentCount={studentCount}
      isFree={isFree}
      atLimit={atLimit}
      freeLimit={FREE_TIER_STUDENT_LIMIT}
    />
  );
}
