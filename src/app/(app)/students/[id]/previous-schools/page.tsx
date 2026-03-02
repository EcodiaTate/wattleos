// src/app/(app)/students/[id]/previous-schools/page.tsx
//
// ============================================================
// WattleOS V2 - Student Previous School Records
// ============================================================
// Server Component. Fetches prior school records for a student
// and delegates interactive CRUD to PreviousSchoolRecordsClient.
//
// Route: /students/[id]/previous-schools
// Permissions:
//   VIEW_PREVIOUS_SCHOOL_RECORDS - read access
//   MANAGE_PREVIOUS_SCHOOL_RECORDS - write access
// ============================================================

import { PreviousSchoolRecordsClient } from "@/components/domain/previous-school-records/previous-school-records-client";
import { getStudent } from "@/lib/actions/students";
import { getPreviousSchoolRecords } from "@/lib/actions/previous-school-records";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { formatStudentName } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Previous Schools - WattleOS" };

export default async function PreviousSchoolsPage({ params }: PageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Fetch student + records in parallel
  const [studentResult, recordsResult] = await Promise.all([
    getStudent(id),
    getPreviousSchoolRecords(id),
  ]);

  if (studentResult.error || !studentResult.data) {
    notFound();
  }

  const student = studentResult.data;
  const records = recordsResult.data ?? [];
  const displayName = formatStudentName(
    student.first_name,
    student.last_name,
    student.preferred_name,
  );
  const canManage = hasPermission(
    context,
    Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
  );

  return (
    <div className="space-y-6 pb-tab-bar">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/students" className="hover:underline">
          Students
        </Link>
        <span>›</span>
        <Link href={`/students/${id}`} className="hover:underline">
          {displayName}
        </Link>
        <span>›</span>
        <span style={{ color: "var(--foreground)" }}>Previous Schools</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Previous Schools
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {displayName}
          </p>
        </div>
        <Link
          href={`/students/${id}`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Back to profile
        </Link>
      </div>

      {/* Records list */}
      <PreviousSchoolRecordsClient
        studentId={id}
        records={records}
        canManage={canManage}
      />
    </div>
  );
}
