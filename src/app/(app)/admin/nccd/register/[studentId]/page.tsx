// src/app/(app)/admin/nccd/register/[studentId]/page.tsx
//
// Per-student NCCD entry detail view.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NccdStudentDetailClient } from "@/components/domain/nccd/nccd-student-detail-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStudentNccdEntry } from "@/lib/actions/nccd";
import { currentNccdYear } from "@/lib/constants/nccd";

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ year?: string }>;
}

export const metadata = {
  title: "Student NCCD Entry",
};

export default async function NccdStudentPage({
  params,
  searchParams,
}: PageProps) {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_NCCD)) {
    redirect("/dashboard");
  }

  const { studentId } = await params;
  const { year } = await searchParams;
  const collectionYear = year ? parseInt(year) : currentNccdYear();

  const canManage = hasPermission(ctx, Permissions.MANAGE_NCCD);

  const result = await getStudentNccdEntry(studentId, collectionYear);

  if (result.error) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--muted-foreground)" }}>
          Failed to load NCCD entry: {result.error.message}
        </p>
      </div>
    );
  }

  if (!result.data) {
    // No entry for this student/year - redirect to create
    if (canManage) {
      redirect(`/admin/nccd/register/new?student_id=${studentId}`);
    }
    notFound();
  }

  const entry = result.data;
  const studentName = entry.student.preferred_name
    ? `${entry.student.preferred_name} ${entry.student.last_name}`
    : `${entry.student.first_name} ${entry.student.last_name}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 pb-tab-bar">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/admin/nccd" className="hover:underline">
          NCCD
        </Link>
        <span>/</span>
        <Link href="/admin/nccd/register" className="hover:underline">
          Register
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>{studentName}</span>
      </nav>

      <NccdStudentDetailClient entry={entry} canManage={canManage} />
    </div>
  );
}
