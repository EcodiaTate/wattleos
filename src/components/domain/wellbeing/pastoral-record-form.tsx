"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { PastoralCareRecordWithStudent, Student } from "@/types/domain";
import {
  createPastoralRecord,
  updatePastoralRecord,
  deletePastoralRecord,
} from "@/lib/actions/wellbeing";
import { PastoralCategoryBadge } from "./pastoral-category-badge";
import type { PastoralCategory } from "@/types/domain";

const CATEGORIES = [
  { value: "behaviour" as const, label: "Behaviour" },
  { value: "emotional" as const, label: "Emotional" },
  { value: "social" as const, label: "Social" },
  { value: "family" as const, label: "Family" },
  { value: "health" as const, label: "Health" },
  { value: "academic" as const, label: "Academic" },
  { value: "other" as const, label: "Other" },
];

interface PastoralRecordFormProps {
  students: Array<Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">>;
  record?: PastoralCareRecordWithStudent | null;
  canManage: boolean;
  defaultStudentId?: string;
}

export function PastoralRecordForm({ students, record, canManage, defaultStudentId }: PastoralRecordFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [studentId, setStudentId] = useState(record?.student_id || defaultStudentId || "");
  const [category, setCategory] = useState<PastoralCategory>(record?.category || "behaviour");
  const [title, setTitle] = useState(record?.title || "");
  const [description, setDescription] = useState(record?.description || "");
  const [dateOfConcern, setDateOfConcern] = useState(
    record?.date_of_concern || new Date().toISOString().split("T")[0]
  );
  const [parentContacted, setParentContacted] = useState(record?.parent_contacted || false);
  const [parentContactedAt, setParentContactedAt] = useState(
    record?.parent_contacted_at?.slice(0, 16) || ""
  );
  const [parentContactNotes, setParentContactNotes] = useState(record?.parent_contact_notes || "");
  const [actionTaken, setActionTaken] = useState(record?.action_taken || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) { setError("Please select a student"); haptics.error(); return; }
    if (!title.trim()) { setError("Title is required"); haptics.error(); return; }
    if (!description.trim()) { setError("Description is required"); haptics.error(); return; }

    startTransition(async () => {
      const toISO = (val: string) => val ? new Date(val).toISOString() : null;
      const input = {
        student_id: studentId,
        category,
        title: title.trim(),
        description: description.trim(),
        date_of_concern: dateOfConcern,
        parent_contacted: parentContacted,
        parent_contacted_at: toISO(parentContactedAt),
        parent_contact_notes: parentContactNotes.trim() || null,
        action_taken: actionTaken.trim() || null,
        linked_flag_id: null,
      };
      const result = record ? await updatePastoralRecord(record.id, input) : await createPastoralRecord(input);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/pastoral");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!record) return;
    startTransition(async () => {
      const result = await deletePastoralRecord(record.id);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/pastoral");
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Student *</label>
        <select disabled={!canManage || !!record} value={studentId}
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
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Category *</label>
          <div className="flex items-center gap-2">
            <select disabled={!canManage} value={category}
              onChange={(e) => { setCategory(e.target.value as PastoralCategory); haptics.selection(); }}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <PastoralCategoryBadge category={category} showEmoji />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Date of Concern *</label>
          <input disabled={!canManage} type="date" value={dateOfConcern}
            onChange={(e) => setDateOfConcern(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Title *</label>
        <input disabled={!canManage} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          maxLength={200} placeholder="Brief title for this record..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{title.length}/200</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Description *</label>
        <textarea disabled={!canManage} value={description} onChange={(e) => setDescription(e.target.value)}
          rows={5} maxLength={5000} placeholder="Describe the concern in detail..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{description.length}/5000</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Action Taken</label>
        <textarea disabled={!canManage} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}
          rows={3} maxLength={3000} placeholder="Steps taken to address this concern..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input disabled={!canManage} type="checkbox" checked={parentContacted}
            onChange={(e) => { setParentContacted(e.target.checked); haptics.selection(); }}
            style={{ accentColor: "var(--primary)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Parent/Guardian Contacted</span>
        </label>
        {parentContacted && (
          <div className="ml-6 space-y-3">
            <input disabled={!canManage} type="datetime-local" value={parentContactedAt}
              onChange={(e) => setParentContactedAt(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
            <textarea disabled={!canManage} value={parentContactNotes} onChange={(e) => setParentContactNotes(e.target.value)}
              rows={2} maxLength={3000} placeholder="Notes from parent contact..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {isPending ? "Saving..." : record ? "Update Record" : "Save Record"}
          </button>
          {record && (showDeleteConfirm ? (
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
