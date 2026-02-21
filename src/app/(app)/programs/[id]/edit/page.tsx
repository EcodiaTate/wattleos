// src/app/(app)/programs/[id]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Edit Program Page
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
    <div className="content-narrow animate-fade-in space-y-[var(--density-section-gap)]">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-[var(--breadcrumb-fg)] gap-2">
        <Link href="/programs" className="hover:text-[var(--primary)] transition-colors">
          Programs
        </Link>
        <span className="text-[var(--breadcrumb-separator)]">/</span>
        <Link href={`/programs/${id}`} className="hover:text-[var(--primary)] transition-colors">
          {program.name}
        </Link>
        <span className="text-[var(--breadcrumb-separator)]">/</span>
        <span className="text-[var(--breadcrumb-active-fg)] font-medium">Edit</span>
      </nav>

      <div className="flex items-center justify-between border-b border-[var(--border)] pb-[var(--density-md)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Edit: {program.name}
        </h1>
        <ProgramDeleteButton programId={id} programName={program.name} />
      </div>

      <div className="rounded-[var(--radius)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)] border border-[var(--border)]">
        <ProgramForm program={program} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}