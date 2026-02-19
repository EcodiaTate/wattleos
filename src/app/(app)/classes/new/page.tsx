// src/app/(app)/classes/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create Class Page
// ============================================================
// Server Component. Renders ClassForm in create mode.
//
// Why permission gate: Only users who can manage enrollment
// should be able to create new classrooms.
// ============================================================

import { ClassForm } from "@/components/domain/sis/ClassForm";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CreateClassPage() {
  const context = await getTenantContext();

  // Gate: manage_enrollment or manage_students to create classes
  if (
    !context.permissions.includes(Permissions.MANAGE_ENROLLMENT) &&
    !context.permissions.includes(Permissions.MANAGE_STUDENTS)
  ) {
    redirect("/classes");
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/classes" className="hover:text-foreground">
          Classes
        </Link>
        <span>/</span>
        <span className="text-foreground">New Class</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Create New Class
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new Montessori classroom or environment. You can enroll
          students and link a curriculum after creating the class.
        </p>
      </div>

      {/* Form */}
      <ClassForm />
    </div>
  );
}
