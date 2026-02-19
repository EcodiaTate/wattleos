// src/app/(app)/programs/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create Program Page
// ============================================================
// Server Component wrapper that permission-checks, then
// renders the ProgramForm in create mode.
//
// WHY server wrapper: Permission check runs on the server.
// The form itself is a client component because it has
// interactive state (day toggles, conditional CCS section).
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/programs" className="hover:text-amber-600">
          Programs
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">New Program</span>
      </nav>

      <h1 className="text-xl font-bold text-gray-900">Create Program</h1>

      <ProgramForm onSubmit={createProgram} />
    </div>
  );
}
