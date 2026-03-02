// src/app/(app)/pedagogy/normalization/[studentId]/page.tsx
// ============================================================
// Student normalization detail - radar chart, trend, goals,
// and observation history for a single student.
// ============================================================

import { redirect } from "next/navigation";
import { StudentDetailClient } from "@/components/domain/normalization/student-detail-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStudentNormalizationDetail } from "@/lib/actions/normalization";

export const metadata = { title: "Student Normalization - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentNormalizationPage({ params }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_NORMALIZATION) ||
    hasPermission(context, Permissions.MANAGE_NORMALIZATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_NORMALIZATION);
  const { studentId } = await params;

  const result = await getStudentNormalizationDetail(studentId);
  if (result.error) redirect("/pedagogy/normalization");

  return <StudentDetailClient data={result.data!} canManage={canManage} />;
}
