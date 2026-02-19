// src/app/(app)/classes/[id]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Edit Class Page
// ============================================================
// Server Component. Loads class, renders ClassForm pre-filled.
// ============================================================

import { ClassForm } from "@/components/domain/sis/ClassForm";
import { getClass } from "@/lib/actions/classes";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface EditClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { id } = await params;
  const context = await getTenantContext();

  // Gate: manage_enrollment or manage_students to edit classes
  if (
    !context.permissions.includes(Permissions.MANAGE_ENROLLMENT) &&
    !context.permissions.includes(Permissions.MANAGE_STUDENTS)
  ) {
    redirect(`/classes/${id}`);
  }

  const result = await getClass(id);

  if (result.error || !result.data) {
    notFound();
  }

  const classData = result.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/classes" className="hover:text-foreground">
          Classes
        </Link>
        <span>/</span>
        <Link href={`/classes/${id}`} className="hover:text-foreground">
          {classData.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Edit {classData.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update classroom details. Changes take effect immediately.
        </p>
      </div>

      {/* Form - pre-filled */}
      <ClassForm initialData={classData} />
    </div>
  );
}
