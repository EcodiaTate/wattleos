// src/app/(app)/programs/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create Program Page
// ============================================================

import { ProgramForm } from "@/components/domain/programs/program-form";
import { createProgram } from "@/lib/actions/programs/programs";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewProgramPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  return (
    <div className="content-narrow animate-fade-in space-y-[var(--density-section-gap)]">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-[var(--breadcrumb-fg)] gap-2">
        <Link href="/programs" className="hover:text-[var(--primary)] transition-colors">
          Programs
        </Link>
        <span className="text-[var(--breadcrumb-separator)]">/</span>
        <span className="text-[var(--breadcrumb-active-fg)] font-medium">New Program</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
        Create Program
      </h1>

      <div className="rounded-[var(--radius)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)] border border-[var(--border)]">
        <ProgramForm onSubmit={createProgram} />
      </div>
    </div>
  );
}