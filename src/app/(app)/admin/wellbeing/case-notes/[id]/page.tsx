import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCaseNote } from "@/lib/actions/wellbeing";
import { listActiveStudents } from "@/lib/actions/students";
import { CaseNoteForm } from "@/components/domain/wellbeing/case-note-form";
import { CASE_NOTE_TYPE_CONFIG } from "@/lib/constants/wellbeing";

export const metadata = { title: "Case Note - WattleOS" };

export default async function CaseNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_COUNSELLOR_NOTES);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COUNSELLOR_NOTES);

  const [noteResult, studentsResult] = await Promise.all([
    getCaseNote(id),
    listActiveStudents(),
  ]);

  if (noteResult.error || !noteResult.data) notFound();

  const note = noteResult.data;
  const studentName =
    note.students.preferred_name ||
    `${note.students.first_name} ${note.students.last_name}`;
  const authorName = `${note.author.first_name} ${note.author.last_name}`;
  const noteTypeLabel =
    CASE_NOTE_TYPE_CONFIG[note.note_type]?.label ?? note.note_type;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/wellbeing/case-notes"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          ← Back
        </Link>
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Case Note - {studentName}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {noteTypeLabel} · {note.session_date} · by {authorName}
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <CaseNoteForm
          students={studentsResult.data ?? []}
          note={note}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
