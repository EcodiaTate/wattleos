import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listCaseNotes } from "@/lib/actions/wellbeing";
import { CASE_NOTE_TYPE_CONFIG } from "@/lib/constants/wellbeing";

export const metadata = { title: "Counsellor Case Notes - WattleOS" };

export default async function CaseNotesPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_COUNSELLOR_NOTES) ||
    hasPermission(context, Permissions.MANAGE_COUNSELLOR_NOTES);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_COUNSELLOR_NOTES);
  const result = await listCaseNotes({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>{result.error.message}</p>
      </div>
    );
  }

  const notes = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Counsellor Case Notes
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Confidential session notes - restricted access
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/wellbeing"
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            ← Dashboard
          </Link>
          {canManage && (
            <Link
              href="/admin/wellbeing/case-notes/new"
              className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + New Note
            </Link>
          )}
        </div>
      </div>

      <div
        className="rounded-lg border p-3 text-sm"
        style={{
          borderColor: "var(--wellbeing-high)",
          backgroundColor: "var(--wellbeing-high-bg)",
          color: "var(--foreground)",
        }}
      >
        🔒 These records are confidential and only visible to staff with
        counsellor/principal access.
      </div>

      {notes.length === 0 ? (
        <div
          className="rounded-lg border border-border p-12 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="mx-auto mb-3 text-4xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            🔒
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No case notes
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Counsellor session notes will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const typeCfg = CASE_NOTE_TYPE_CONFIG[note.note_type];
            return (
              <Link
                key={note.id}
                href={`/admin/wellbeing/case-notes/${note.id}`}
                className="card-interactive block rounded-lg border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {note.students.preferred_name ||
                        `${note.students.first_name} ${note.students.last_name}`}
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {typeCfg?.label} -{" "}
                      {new Date(note.session_date).toLocaleDateString("en-AU")}
                      {note.duration_minutes
                        ? ` (${note.duration_minutes} min)`
                        : ""}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      by {note.author.first_name} {note.author.last_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {note.follow_up_required && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: "var(--wellbeing-medium)",
                          color: "var(--wellbeing-medium-fg)",
                        }}
                      >
                        Follow-up
                      </span>
                    )}
                    {note.is_confidential && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
