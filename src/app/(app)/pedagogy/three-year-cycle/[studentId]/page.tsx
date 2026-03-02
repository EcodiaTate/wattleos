// src/app/(app)/pedagogy/three-year-cycle/[studentId]/page.tsx
// ============================================================
// Three-Year Cycle Progress - per-student longitudinal detail
// ============================================================

import { notFound, redirect } from "next/navigation";
import { StudentCycleDetailClient } from "@/components/domain/three-year-cycle/student-cycle-detail-client";
import { getStudentCycleProfile } from "@/lib/actions/three-year-cycle";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Student Cycle Profile - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentCycleDetailPage({ params }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const { studentId } = await params;
  const result = await getStudentCycleProfile(studentId);

  if (result.error || !result.data) {
    notFound();
  }

  return <StudentCycleDetailClient profile={result.data} />;
}
