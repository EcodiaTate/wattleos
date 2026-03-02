"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { SickBayVisitWithStudent } from "@/types/domain";
import {
  createSickBayVisit,
  updateSickBayVisit,
  deleteSickBayVisit,
} from "@/lib/actions/sick-bay";
import { SickBayStatusBadge } from "./sick-bay-status-badge";

interface VisitFormProps {
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  }>;
  visit?: SickBayVisitWithStudent | null;
  canManage: boolean;
}

const VISIT_TYPES = [
  { value: "injury", label: "Injury" },
  { value: "illness", label: "Illness" },
  { value: "medication_given", label: "Medication Given" },
  { value: "first_aid", label: "First Aid" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "referred", label: "Referred" },
];

export function VisitForm({ students, visit, canManage }: VisitFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [studentId, setStudentId] = useState(visit?.student_id || "");
  const [visitType, setVisitType] = useState<
    "injury" | "illness" | "medication_given" | "first_aid" | "other"
  >(visit?.visit_type || "illness");
  const [visitDate, setVisitDate] = useState(
    visit?.visit_date || new Date().toISOString().split("T")[0],
  );
  const [arrivedAt, setArrivedAt] = useState(
    visit?.arrived_at?.slice(0, 16) || "",
  );
  const [departedAt, setDepartedAt] = useState(
    visit?.departed_at?.slice(0, 16) || "",
  );
  const [presentingComplaint, setPresentingComplaint] = useState(
    visit?.presenting_complaint || "",
  );
  const [treatmentGiven, setTreatmentGiven] = useState(
    visit?.treatment_given || "",
  );
  const [outcome, setOutcome] = useState(visit?.outcome || "");
  const [parentNotified, setParentNotified] = useState(
    visit?.parent_notified || false,
  );
  const [parentNotifiedAt, setParentNotifiedAt] = useState(
    visit?.parent_notified_at?.slice(0, 16) || "",
  );
  const [ambulanceCalled, setAmbulanceCalled] = useState(
    visit?.ambulance_called || false,
  );
  const [status, setStatus] = useState<"open" | "resolved" | "referred">(
    visit?.status || "open",
  );
  const [notes, setNotes] = useState(visit?.notes || "");

  const getStudentName = (id: string) => {
    const student = students.find((s) => s.id === id);
    if (!student) return "";
    return (
      student.preferred_name || `${student.first_name} ${student.last_name}`
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Please select a student");
      haptics.error();
      return;
    }

    startTransition(async () => {
      // datetime-local inputs return "YYYY-MM-DDTHH:MM" (no timezone) - convert
      // to full ISO strings so Zod's .datetime() validator accepts them.
      const toISO = (val: string) => (val ? new Date(val).toISOString() : null);

      const baseInput = {
        student_id: studentId,
        visit_type: visitType,
        visit_date: visitDate,
        arrived_at: toISO(arrivedAt),
        presenting_complaint: presentingComplaint || null,
        treatment_given: treatmentGiven || null,
        parent_notified: parentNotified,
        notes: notes || null,
      };

      const result = visit
        ? await updateSickBayVisit(visit.id, {
            ...baseInput,
            status,
            departed_at: toISO(departedAt),
            outcome: outcome || null,
            parent_notified_at: toISO(parentNotifiedAt),
            ambulance_called: ambulanceCalled,
          })
        : await createSickBayVisit(baseInput);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.push("/admin/sick-bay");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!visit) return;

    startTransition(async () => {
      const result = await deleteSickBayVisit(visit.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/sick-bay");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Student Select */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Student *
        </label>
        <select
          disabled={!canManage || !!visit}
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            haptics.selection();
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name || `${s.first_name} ${s.last_name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Visit Type */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Visit Type *
        </label>
        <select
          disabled={!canManage}
          value={visitType}
          onChange={(e) => {
            setVisitType(
              e.target.value as
                | "injury"
                | "illness"
                | "medication_given"
                | "first_aid"
                | "other",
            );
            haptics.selection();
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          {VISIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Visit Date */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Visit Date *
        </label>
        <input
          disabled={!canManage}
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Arrived At */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Arrived At
        </label>
        <input
          disabled={!canManage}
          type="datetime-local"
          value={arrivedAt}
          onChange={(e) => setArrivedAt(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          When the student arrived at sick bay
        </p>
      </div>

      {/* Presenting Complaint */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Presenting Complaint
        </label>
        <textarea
          disabled={!canManage}
          value={presentingComplaint}
          onChange={(e) => setPresentingComplaint(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
          placeholder="What was the student's complaint or concern?"
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {presentingComplaint.length}/2000
        </p>
      </div>

      {/* Treatment Given */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Treatment Given
        </label>
        <textarea
          disabled={!canManage}
          value={treatmentGiven}
          onChange={(e) => setTreatmentGiven(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
          placeholder="What action was taken?"
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {treatmentGiven.length}/2000
        </p>
      </div>

      {/* Parent Notified */}
      <div className="space-y-2">
        <label className="flex items-center gap-3">
          <input
            disabled={!canManage}
            type="checkbox"
            checked={parentNotified}
            onChange={(e) => {
              setParentNotified(e.target.checked);
              haptics.selection();
            }}
            style={{ accentColor: "var(--primary)" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Parent Notified
          </span>
        </label>
        {parentNotified && (
          <input
            disabled={!canManage}
            type="datetime-local"
            value={parentNotifiedAt}
            onChange={(e) => setParentNotifiedAt(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
            placeholder="When parent was notified"
          />
        )}
      </div>

      {/* Edit-only fields */}
      {visit && (
        <>
          {/* Status */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Status
            </label>
            <div className="flex items-center gap-3">
              <select
                disabled={!canManage}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "open" | "resolved" | "referred");
                  haptics.selection();
                }}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <SickBayStatusBadge status={status} size="md" />
            </div>
          </div>

          {/* Departed At */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Departed At
            </label>
            <input
              disabled={!canManage}
              type="datetime-local"
              value={departedAt}
              onChange={(e) => setDepartedAt(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              When the student left sick bay
            </p>
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Outcome
            </label>
            <textarea
              disabled={!canManage}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
              placeholder="Result and follow-up actions"
            />
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {outcome.length}/2000
            </p>
          </div>

          {/* Ambulance Called */}
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                disabled={!canManage}
                type="checkbox"
                checked={ambulanceCalled}
                onChange={(e) => {
                  setAmbulanceCalled(e.target.checked);
                  haptics.selection();
                }}
                style={{ accentColor: "var(--primary)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Ambulance Called
              </span>
            </label>
          </div>
        </>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes
        </label>
        <textarea
          disabled={!canManage}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
          placeholder="Additional notes or observations"
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {notes.length}/2000
        </p>
      </div>

      {/* Action Buttons */}
      {canManage && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving..." : visit ? "Update Visit" : "Record Visit"}
          </button>

          {visit &&
            (showDeleteConfirm ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "var(--destructive-foreground)",
                  }}
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  haptics.warning();
                }}
                style={{ color: "var(--destructive)" }}
                className="text-sm font-medium"
              >
                Delete
              </button>
            ))}
        </div>
      )}
    </form>
  );
}
