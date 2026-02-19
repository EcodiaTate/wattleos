// src/app/(app)/students/[id]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Edit Student Page
// ============================================================
// Server Component. Loads the student record, then renders
// StudentForm pre-filled for editing.
//
// Why server fetch: We need the current student data to
// pre-fill the form. Fetching server-side means no loading
// spinner - the page arrives ready to edit.
// ============================================================

import { StudentForm } from "@/components/domain/sis/StudentForm";
import { getStudent } from "@/lib/actions/students";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { formatStudentName } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface EditStudentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const { id } = await params;
  const context = await getTenantContext();

  // Gate: only users with manage_students can edit
  if (!context.permissions.includes(Permissions.MANAGE_STUDENTS)) {
    redirect(`/students/${id}`);
  }

  // Fetch the student
  const result = await getStudent(id);

  if (result.error || !result.data) {
    notFound();
  }

  const student = result.data;
  const displayName = formatStudentName(
    student.first_name,
    student.last_name,
    student.preferred_name,
  );
  const canManageEnrollment = context.permissions.includes(
    Permissions.MANAGE_ENROLLMENT,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/students" className="hover:text-foreground">
          Students
        </Link>
        <span>/</span>
        <Link href={`/students/${id}`} className="hover:text-foreground">
          {displayName}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Edit {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update this student&apos;s basic information.
        </p>
      </div>

      {/* Form - pre-filled with existing data */}
      <StudentForm
        initialData={student}
        canManageEnrollment={canManageEnrollment}
      />
    </div>
  );
}
