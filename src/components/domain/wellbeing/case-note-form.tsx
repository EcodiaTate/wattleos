"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { CounsellorCaseNoteWithStudent, Student } from "@/types/domain";
import {
  createCaseNote,
  updateCaseNote,
  deleteCaseNote,
} from "@/lib/actions/wellbeing";
import { CASE_NOTE_TYPE_CONFIG } from "@/lib/constants/wellbeing";
import type { CounsellorNoteType } from "@/types/domain";

const NOTE_TYPES = Object.entries(CASE_NOTE_TYPE_CONFIG).map(([value, cfg]) => ({
  value: value as CounsellorNoteType,
  label: cfg.label,
  description: cfg.description,
}));

interface CaseNoteFormProps {
  students: Array<Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">>;
  note?: CounsellorCaseNoteWithStudent | null;
  canManage: boolean;
  defaultStudentId?: string;
}

export function CaseNoteForm({ students, note, canManage, defaultStudentId }: CaseNoteFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [studentId, setStudentId] = useState(note?.student_id || defaultStudentId || "");
  const [noteType, setNoteType] = useState<CounsellorNoteType>(note?.note_type || "follow_up");
  const [sessionDate, setSessionDate] = useState(note?.session_date || new Date().toISOString().split("T")[0]);
  const [durationMinutes, setDurationMinutes] = useState(note?.duration_minutes?.toString() || "");
  const [content, setContent] = useState(note?.content || "");
  const [followUpRequired, setFollowUpRequired] = useState(note?.follow_up_required || false);
  const [followUpNotes, setFollowUpNotes] = useState(note?.follow_up_notes || "");
  const [isConfidential, setIsConfidential] = useState(note?.is_confidential ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) { setError("Please select a student"); haptics.error(); return; }
    if (!content.trim()) { setError("Note content is required"); haptics.error(); return; }

    startTransition(async () => {
      const input = {
        student_id: studentId,
        note_type: noteType,
        content: content.trim(),
        session_date: sessionDate,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        linked_flag_id: null,
        linked_referral_id: null,
        is_confidential: isConfidential,
        follow_up_required: followUpRequired,
        follow_up_notes: followUpNotes.trim() || null,
      };
      const result = note ? await updateCaseNote(note.id, input) : await createCaseNote(input);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/case-notes");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!note) return;
    startTransition(async () => {
      const result = await deleteCaseNote(note.id);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/case-notes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
          {error}
        </div>
      )}

      <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--wellbeing-high)", backgroundColor: "var(--wellbeing-high-bg)", color: "var(--foreground)" }}>
        🔒 These notes are confidential. Only staff with Counsellor or Principal roles can view them.
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Student *</label>
        <select disabled={!canManage || !!note} value={studentId}
          onChange={(e) => { setStudentId(e.target.value); haptics.selection(); }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name || `${s.first_name} ${s.last_name}`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Session Type *</label>
          <select disabled={!canManage} value={noteType}
            onChange={(e) => { setNoteType(e.target.value as CounsellorNoteType); haptics.selection(); }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
            {NOTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Session Date *</label>
          <input disabled={!canManage} type="date" value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Duration (minutes)</label>
        <input disabled={!canManage} type="number" min={1} max={480} value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="e.g. 45"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Session Notes *</label>
        <textarea disabled={!canManage} value={content} onChange={(e) => setContent(e.target.value)}
          rows={8} maxLength={10000} placeholder="Record session notes here..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{content.length}/10000</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input disabled={!canManage} type="checkbox" checked={followUpRequired}
            onChange={(e) => { setFollowUpRequired(e.target.checked); haptics.selection(); }}
            style={{ accentColor: "var(--primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Follow-up Required</span>
        </label>
        {followUpRequired && (
          <textarea disabled={!canManage} value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)}
            rows={2} maxLength={2000} placeholder="What follow-up is needed?"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        )}
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input disabled={!canManage} type="checkbox" checked={isConfidential}
            onChange={(e) => { setIsConfidential(e.target.checked); haptics.selection(); }}
            style={{ accentColor: "var(--primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Mark as Confidential</span>
        </label>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {isPending ? "Saving..." : note ? "Update Note" : "Save Note"}
          </button>
          {note && (showDeleteConfirm ? (
            <>
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>
                Confirm Delete
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isPending}
                className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setShowDeleteConfirm(true); haptics.warning(); }}
              style={{ color: "var(--destructive)" }} className="text-sm font-medium">
              Delete
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
