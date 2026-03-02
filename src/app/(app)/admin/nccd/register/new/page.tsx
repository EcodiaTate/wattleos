// src/app/(app)/admin/nccd/register/new/page.tsx
//
// Create a new NCCD register entry (select student + fill form).

import Link from "next/link";
import { redirect } from "next/navigation";

import { NccdEntryForm } from "@/components/domain/nccd/nccd-entry-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";

export const metadata = {
  title: "New NCCD Entry",
};

export default async function NccdNewEntryPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_NCCD)) {
    redirect("/admin/nccd");
  }

  const studentsResult = await listActiveStudents();
  const students = (studentsResult.data ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    preferred_name: s.preferred_name,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6 pb-tab-bar">
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
        <span style={{ color: "var(--foreground)" }}>New Entry</span>
      </nav>

      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          New NCCD Entry
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Record a student with disability and the adjustments provided
        </p>
      </div>

      <div
        className="rounded-2xl border border-border p-5"
        style={{ background: "var(--card)" }}
      >
        <NccdEntryForm students={students} />
      </div>
    </div>
  );
}
