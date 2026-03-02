"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PreviousSchoolRecord } from "@/types/domain";
import {
  createPreviousSchoolRecord,
  updatePreviousSchoolRecord,
  deletePreviousSchoolRecord,
} from "@/lib/actions/previous-school-records";
import {
  SCHOOL_TYPE_OPTIONS,
  AUSTRALIAN_STATES,
  type SchoolType,
} from "@/lib/validations/previous-school-records";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  studentId: string;
  record?: PreviousSchoolRecord | null;
  canManage: boolean;
  onSaved?: () => void;
}

export function PreviousSchoolRecordForm({
  studentId,
  record,
  canManage,
  onSaved,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const isEdit = !!record;

  // ── Form state ───────────────────────────────────────────────
  const [schoolName, setSchoolName] = useState(record?.school_name ?? "");
  const [schoolType, setSchoolType] = useState<SchoolType | "">(
    (record?.school_type as SchoolType | null) ?? "",
  );
  const [suburb, setSuburb] = useState(record?.suburb ?? "");
  const [state, setState] = useState(record?.state ?? "");
  const [country, setCountry] = useState(record?.country ?? "Australia");
  const [startDate, setStartDate] = useState(record?.start_date ?? "");
  const [endDate, setEndDate] = useState(record?.end_date ?? "");
  const [yearLevelsText, setYearLevelsText] = useState(
    (record?.year_levels ?? []).join(", "),
  );
  const [principalName, setPrincipalName] = useState(record?.principal_name ?? "");
  const [contactPhone, setContactPhone] = useState(record?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(record?.contact_email ?? "");
  const [reasonForLeaving, setReasonForLeaving] = useState(
    record?.reason_for_leaving ?? "",
  );
  const [transferDocumentUrl, setTransferDocumentUrl] = useState(
    record?.transfer_document_url ?? "",
  );
  const [notes, setNotes] = useState(record?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────

  function parseYearLevels(raw: string): string[] {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ── Submit ───────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fields = {
        school_name: schoolName,
        school_type: schoolType || null,
        suburb: suburb || null,
        state: state || null,
        country: country || "Australia",
        start_date: startDate || null,
        end_date: endDate || null,
        year_levels: parseYearLevels(yearLevelsText),
        principal_name: principalName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        reason_for_leaving: reasonForLeaving || null,
        transfer_document_url: transferDocumentUrl || null,
        notes: notes || null,
      };

      const result = isEdit
        ? await updatePreviousSchoolRecord(record.id, fields)
        : await createPreviousSchoolRecord({ student_id: studentId, ...fields });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onSaved) {
        onSaved();
      } else {
        router.refresh();
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────

  function handleDelete() {
    if (!record) return;

    startTransition(async () => {
      const result = await deletePreviousSchoolRecord(record.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.impact("heavy");
      router.refresh();
    });
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
            backgroundColor: "color-mix(in srgb, var(--destructive) 8%, transparent)",
          }}
        >
          {error}
        </div>
      )}

      {/* School Name (required) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          School Name <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          disabled={!canManage}
          required
          maxLength={200}
          placeholder="e.g. Greenfields Primary School"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* School Type + State (side by side) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            School Type
          </label>
          <select
            value={schoolType}
            onChange={(e) => { setSchoolType(e.target.value as SchoolType | ""); haptics.selection(); }}
            disabled={!canManage}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Select type…</option>
            {SCHOOL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            State / Territory
          </label>
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); haptics.selection(); }}
            disabled={!canManage}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Select state…</option>
            {AUSTRALIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Suburb + Country */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Suburb / City
          </label>
          <input
            type="text"
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            disabled={!canManage}
            maxLength={100}
            placeholder="e.g. Richmond"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Country
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={!canManage}
            maxLength={100}
            placeholder="Australia"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Enrollment dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={!canManage}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={!canManage}
            min={startDate || undefined}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Year levels */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Year Levels Attended
        </label>
        <input
          type="text"
          value={yearLevelsText}
          onChange={(e) => setYearLevelsText(e.target.value)}
          disabled={!canManage}
          maxLength={500}
          placeholder="e.g. Prep, Grade 1, Grade 2 (comma-separated)"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Separate multiple levels with commas
        </p>
      </div>

      {/* Contact section */}
      <div
        className="space-y-4 rounded-lg border border-border p-4"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Previous School Contact
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            Principal / Contact Name
          </label>
          <input
            type="text"
            value={principalName}
            onChange={(e) => setPrincipalName(e.target.value)}
            disabled={!canManage}
            maxLength={200}
            placeholder="e.g. Ms Sarah Thompson"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Phone
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={!canManage}
              maxLength={30}
              placeholder="(03) 9000 0000"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!canManage}
              maxLength={200}
              placeholder="office@school.edu.au"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
            />
          </div>
        </div>
      </div>

      {/* Reason for leaving */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Reason for Leaving
        </label>
        <input
          type="text"
          value={reasonForLeaving}
          onChange={(e) => setReasonForLeaving(e.target.value)}
          disabled={!canManage}
          maxLength={1000}
          placeholder="e.g. Family relocated"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Transfer document URL */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Transfer Document URL
        </label>
        <input
          type="url"
          value={transferDocumentUrl}
          onChange={(e) => setTransferDocumentUrl(e.target.value)}
          disabled={!canManage}
          maxLength={2000}
          placeholder="https://…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Link to the uploaded transfer or handover document
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canManage}
          rows={3}
          maxLength={2000}
          placeholder="Optional notes about this school or the transition…"
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Actions */}
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
            {isPending
              ? "Saving…"
              : isEdit
                ? "Update Record"
                : "Add School"}
          </button>

          {isEdit && (
            showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--destructive)" }}>
                  Delete this record?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "var(--destructive-foreground)",
                  }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="active-push touch-target rounded-lg px-3 py-1.5 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  haptics.warning();
                }}
                className="active-push touch-target rounded-lg px-3 py-1.5 text-sm"
                style={{ color: "var(--destructive)" }}
              >
                Delete
              </button>
            )
          )}
        </div>
      )}
    </form>
  );
}
