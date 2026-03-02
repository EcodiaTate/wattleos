"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImmunisationRecord, ImmunisationStatus } from "@/types/domain";
import {
  createImmunisationRecord,
  updateImmunisationRecord,
  deleteImmunisationRecord,
} from "@/lib/actions/immunisation";
import { ImmunisationSupportTracker } from "./immunisation-support-tracker";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ImmunisationRecordFormProps {
  studentId: string;
  record: ImmunisationRecord | null;
  canManage: boolean;
}

const STATUS_OPTIONS: { value: ImmunisationStatus; label: string }[] = [
  { value: "up_to_date", label: "Up to Date" },
  { value: "catch_up_schedule", label: "Catch-up Schedule" },
  { value: "medical_exemption", label: "Medical Exemption" },
  { value: "pending", label: "Pending" },
];

export function ImmunisationRecordForm({
  studentId,
  record,
  canManage,
}: ImmunisationRecordFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<ImmunisationStatus>(
    record?.status ?? "pending",
  );
  const [ihsDate, setIhsDate] = useState(record?.ihs_date ?? "");
  const [documentUrl, setDocumentUrl] = useState(record?.document_url ?? "");
  const [supportPeriodStart, setSupportPeriodStart] = useState(
    record?.support_period_start ?? "",
  );
  const [supportPeriodEnd, setSupportPeriodEnd] = useState(
    record?.support_period_end ?? "",
  );
  const [nextAirCheckDue, setNextAirCheckDue] = useState(
    record?.next_air_check_due ?? "",
  );
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCatchUp = status === "catch_up_schedule";
  const isExemption = status === "medical_exemption";
  const isEdit = record !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const input = {
        student_id: studentId,
        ihs_date: ihsDate || null,
        status,
        document_url: documentUrl || null,
        support_period_start: isCatchUp ? supportPeriodStart || null : null,
        support_period_end: isCatchUp ? supportPeriodEnd || null : null,
        next_air_check_due: isCatchUp ? nextAirCheckDue || null : null,
        notes: notes || null,
      };

      const result = isEdit
        ? await updateImmunisationRecord(record.id, input)
        : await createImmunisationRecord(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!record) return;

    startTransition(async () => {
      const result = await deleteImmunisationRecord(record.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.impact("heavy");
      router.push("/admin/immunisation");
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
            backgroundColor: "var(--immunisation-pending-bg)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Status */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Immunisation Status
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ImmunisationStatus);
            haptics.selection();
          }}
          disabled={!canManage}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* IHS Date */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          IHS Date
        </label>
        <input
          type="date"
          value={ihsDate}
          onChange={(e) => setIhsDate(e.target.value)}
          disabled={!canManage}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Date on the Immunisation History Statement from AIR
        </p>
      </div>

      {/* Document URL */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Document URL
        </label>
        <input
          type="url"
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
          disabled={!canManage}
          placeholder="https://..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Link to uploaded IHS document or exemption evidence
        </p>
      </div>

      {/* Catch-up schedule fields */}
      {isCatchUp && (
        <div
          className="space-y-4 rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--immunisation-catch-up-bg)" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--immunisation-catch-up)" }}
          >
            Catch-up Schedule Details
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Support Period Start
              </label>
              <input
                type="date"
                value={supportPeriodStart}
                onChange={(e) => setSupportPeriodStart(e.target.value)}
                disabled={!canManage}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Support Period End
              </label>
              <input
                type="date"
                value={supportPeriodEnd}
                onChange={(e) => setSupportPeriodEnd(e.target.value)}
                disabled={!canManage}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Auto-calculated: start + 16 weeks
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Next AIR Check Due
            </label>
            <input
              type="date"
              value={nextAirCheckDue}
              onChange={(e) => setNextAirCheckDue(e.target.value)}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Support period tracker */}
          {supportPeriodStart && supportPeriodEnd && (
            <ImmunisationSupportTracker
              supportPeriodStart={supportPeriodStart}
              supportPeriodEnd={supportPeriodEnd}
            />
          )}
        </div>
      )}

      {/* Medical exemption info */}
      {isExemption && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--immunisation-exemption-bg)" }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--immunisation-exemption)" }}
          >
            Medical Exemption
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Medical exemptions are recorded on the AIR by the child&apos;s GP.
            The service sights and notates the exemption - no physical document
            is required.
          </p>
          {record?.exemption_noted_at && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Noted on{" "}
              {new Date(record.exemption_noted_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canManage}
          rows={3}
          maxLength={2000}
          placeholder="Optional notes about this child's immunisation record..."
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
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
              ? "Saving..."
              : isEdit
                ? "Update Record"
                : "Create Record"}
          </button>

          {isEdit && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: "var(--destructive)" }}
                  >
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
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
