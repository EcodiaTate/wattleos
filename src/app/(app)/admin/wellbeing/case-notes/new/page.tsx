import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { CaseNoteForm } from "@/components/domain/wellbeing/case-note-form";

export const metadata = { title: "New Case Note - WattleOS" };

export default async function NewCaseNotePage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_COUNSELLOR_NOTES)) redirect("/dashboard");

  const studentsResult = await listActiveStudents();

  if (studentsResult.error || !studentsResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {studentsResult.error?.message ?? "Failed to load students."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/wellbeing/case-notes" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            New Case Note
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Record a confidential counselling session note
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <CaseNoteForm students={studentsResult.data} canManage={true} />
      </div>
    </div>
  );
}