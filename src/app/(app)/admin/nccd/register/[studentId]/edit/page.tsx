// src/app/(app)/admin/nccd/register/[studentId]/edit/page.tsx
//
// Edit an existing NCCD entry for a student.

import Link from "next/link";
import { redirect } from "next/navigation";

import { NccdEntryForm } from "@/components/domain/nccd/nccd-entry-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getStudentNccdEntry } from "@/lib/actions/nccd";
import { currentNccdYear } from "@/lib/constants/nccd";

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ year?: string }>;
}

export const metadata = {
  title: "Edit NCCD Entry",
};

export default async function NccdEditEntryPage({
  params,
  searchParams,
}: PageProps) {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_NCCD)) {
    redirect("/admin/nccd");
  }

  const { studentId } = await params;
  const { year } = await searchParams;
  const collectionYear = year ? parseInt(year) : currentNccdYear();

  const result = await getStudentNccdEntry(studentId, collectionYear);

  if (result.error || !result.data) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--muted-foreground)" }}>
          Failed to load NCCD entry: {result.error?.message}
        </p>
      </div>
    );
  }

  const entry = result.data;
  const studentName = entry.student.preferred_name
    ? `${entry.student.preferred_name} ${entry.student.last_name}`
    : `${entry.student.first_name} ${entry.student.last_name}`;

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
        <Link
          href={`/admin/nccd/register/${studentId}`}
          className="hover:underline"
        >
          {studentName}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Edit</span>
      </nav>

      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Edit NCCD Entry
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          {studentName} · {entry.collection_year} collection
        </p>
      </div>

      <div
        className="rounded-2xl border border-border p-5"
        style={{ background: "var(--card)" }}
      >
        <NccdEntryForm entry={entry} studentId={studentId} />
      </div>
    </div>
  );
}
