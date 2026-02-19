// src/app/(app)/programs/[id]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Edit Program Page
// ============================================================
// Server Component that loads the existing program and
// renders the ProgramForm in edit mode. The update action
// is bound to the program ID.
//
// WHY bind the action: ProgramForm accepts a generic onSubmit.
// This page creates a wrapper that calls updateProgram with
// the correct ID, so the form doesn't need to know the ID.
// ============================================================

import { ProgramDeleteButton } from "@/components/domain/programs/program-delete-button";
import { ProgramForm } from "@/components/domain/programs/program-form";
import type {
  Program,
  UpdateProgramInput,
} from "@/lib/actions/programs/programs";
import { getProgram, updateProgram } from "@/lib/actions/programs/programs";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface EditProgramPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProgramPage({
  params,
}: EditProgramPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const result = await getProgram(id);

  if (result.error || !result.data) {
    notFound();
  }

  const program = result.data;

  // Bind the update action to the program ID
  async function handleUpdate(
    input: UpdateProgramInput,
  ): Promise<{ data: Program | null; error: { message: string } | null }> {
    "use server";
    const result = await updateProgram(id, input);
    return {
      data: result.data,
      error: result.error ? { message: result.error.message } : null,
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/programs" className="hover:text-amber-600">
          Programs
        </Link>
        <span className="mx-2">›</span>
        <Link href={`/programs/${id}`} className="hover:text-amber-600">
          {program.name}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">Edit</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Edit: {program.name}
        </h1>
        <ProgramDeleteButton programId={id} programName={program.name} />
      </div>

      <ProgramForm program={program} onSubmit={handleUpdate} />
    </div>
  );
}
