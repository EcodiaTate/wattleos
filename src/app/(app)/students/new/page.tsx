// src/app/(app)/students/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create Student Page
// ============================================================
// Server Component. Renders the StudentForm in create mode.
//
// Why server component wrapper: We check permissions server-side
// before rendering the form. If the user can't manage students,
// they shouldn't see the create form at all.
// ============================================================

import { StudentForm } from "@/components/domain/sis/StudentForm";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CreateStudentPage() {
  const context = await getTenantContext();

  // Gate: only users with manage_students can create
  if (!context.permissions.includes(Permissions.MANAGE_STUDENTS)) {
    redirect("/students");
  }

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
        <span className="text-foreground">New Student</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Add New Student
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the student&apos;s details below. You can add guardians, medical
          conditions, and enrollment information after creating the record.
        </p>
      </div>

      {/* Form */}
      <StudentForm canManageEnrollment={canManageEnrollment} />
    </div>
  );
}
