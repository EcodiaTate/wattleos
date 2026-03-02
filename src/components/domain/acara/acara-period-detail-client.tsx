"use client";

// src/components/domain/acara/acara-period-detail-client.tsx
//
// Full detail view for an ACARA report period.
// Handles: sync, student record list, override form, verify, export, submit.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AcaraStatusBadge, AcaraRateBadge } from "./acara-status-badge";
import {
  exportAcaraReportCsv,
  overrideAcaraStudentRecord,
  setAcaraReportStatus,
  syncAcaraStudentRecords,
} from "@/lib/actions/acara";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  AcaraReportPeriodWithCounts,
  AcaraStudentRecordWithStudent,
  AcaraCollectionType,
  AcaraReportStatus,
} from "@/types/domain";

const COLLECTION_LABELS: Record<AcaraCollectionType, string> = {
  annual_school_collection: "Annual School Collection",
  semester_1_snapshot: "Semester 1 Snapshot",
  semester_2_snapshot: "Semester 2 Snapshot",
};

interface Props {
  period: AcaraReportPeriodWithCounts;
  records: AcaraStudentRecordWithStudent[];
  canManage: boolean;
}

export function AcaraPeriodDetailClient({
  period: initialPeriod,
  records: initialRecords,
  canManage,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();

  const [period, setPeriod] = useState(initialPeriod);
  const [records, setRecords] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [overrideRecordId, setOverrideRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    skipped: number;
  } | null>(null);

  const isSubmitted = period.status === "submitted";

  // ── Filter ────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.student.first_name.toLowerCase().includes(q) ||
      r.student.last_name.toLowerCase().includes(q)
    );
  });

  // ── Sync ──────────────────────────────────────────────────
  function handleSync() {
    setActionError(null);
    setSyncResult(null);
    haptics.impact("medium");
    startTransition(async () => {
      const result = await syncAcaraStudentRecords(period.id);
      if (result.error) {
        setActionError(result.error.message);
        haptics.error();
        return;
      }
      setSyncResult(result.data!);
      haptics.success();
      router.refresh();
    });
  }

  // ── Verify ────────────────────────────────────────────────
  function handleVerify() {
    setActionError(null);
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await setAcaraReportStatus(period.id, "verified");
      if (result.error) {
        setActionError(result.error.message);
        haptics.error();
        return;
      }
      setPeriod((p) => ({ ...p, status: "verified" as AcaraReportStatus }));
      haptics.success();
    });
  }

  // ── Export ────────────────────────────────────────────────
  function handleExport() {
    setActionError(null);
    haptics.impact("medium");
    startTransition(async () => {
      const result = await exportAcaraReportCsv(period.id);
      if (result.error) {
        setActionError(result.error.message);
        haptics.error();
        return;
      }
      const { csv, filename } = result.data!;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setPeriod((p) => ({ ...p, status: "exported" as AcaraReportStatus }));
      haptics.success();
    });
  }

  // ── Submit ────────────────────────────────────────────────
  function handleSubmit() {
    if (
      !confirm("Mark this report as submitted to ACARA? This cannot be undone.")
    )
      return;
    setActionError(null);
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await setAcaraReportStatus(period.id, "submitted");
      if (result.error) {
        setActionError(result.error.message);
        haptics.error();
        return;
      }
      setPeriod((p) => ({ ...p, status: "submitted" as AcaraReportStatus }));
      haptics.success();
    });
  }

  // ── Delete period ─────────────────────────────────────────
  async function handleDeletePeriod() {
    if (!confirm("Delete this report period? This cannot be undone.")) return;
    haptics.impact("heavy");
    const { deleteAcaraReportPeriod } = await import("@/lib/actions/acara");
    const result = await deleteAcaraReportPeriod(period.id);
    if (result.error) {
      setActionError(result.error.message);
      haptics.error();
      return;
    }
    haptics.success();
    router.push("/attendance/acara-reporting");
  }

  return (
    <div className="space-y-5">
      {/* Status bar + actions */}
      <div
        className="rounded-xl border border-border px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: "var(--card)" }}
      >
        <AcaraStatusBadge status={period.status} />
        <div className="flex-1" />
        {canManage && !isSubmitted && (
          <>
            <button
              onClick={handleSync}
              disabled={isPending}
              className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isPending ? "Syncing…" : "↻ Sync Attendance"}
            </button>
            {period.status === "draft" && records.length > 0 && (
              <button
                onClick={handleVerify}
                disabled={isPending}
                className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: "var(--acara-verified)",
                  color: "var(--acara-verified-fg)",
                }}
              >
                ✓ Verify
              </button>
            )}
            {(period.status === "verified" || period.status === "draft") &&
              records.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={isPending}
                  className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: "var(--acara-exported)",
                    color: "var(--acara-exported-fg)",
                  }}
                >
                  ↓ Export CSV
                </button>
              )}
            {period.status === "exported" && (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: "var(--acara-submitted)",
                  color: "var(--acara-submitted-fg)",
                }}
              >
                ✓ Mark Submitted
              </button>
            )}
          </>
        )}
        {/* Re-export even after submitted */}
        {canManage && isSubmitted && (
          <button
            onClick={handleExport}
            disabled={isPending}
            className="touch-target active-push rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            ↓ Re-export CSV
          </button>
        )}
      </div>

      {/* Feedback banners */}
      {syncResult && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--acara-submitted)",
            background: "var(--acara-submitted-bg)",
            color: "var(--acara-submitted-fg)",
          }}
        >
          Sync complete - {syncResult.synced} records updated,{" "}
          {syncResult.skipped} manually overridden (skipped).
        </div>
      )}
      {actionError && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "var(--destructive-bg, hsl(0 60% 94%))",
            color: "var(--destructive)",
          }}
        >
          {actionError}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total Students" value={period.total_students} />
        <MiniStat
          label="Avg Rate"
          value={`${period.avg_attendance_rate.toFixed(1)}%`}
          color={
            period.avg_attendance_rate < 85
              ? "var(--acara-rate-at-risk)"
              : "var(--acara-rate-good)"
          }
        />
        <MiniStat
          label="Below 85%"
          value={period.students_below_85}
          color={
            period.students_below_85 > 0
              ? "var(--acara-rate-at-risk)"
              : undefined
          }
        />
        <MiniStat
          label="Below 70%"
          value={period.students_below_70}
          color={
            period.students_below_70 > 0
              ? "var(--acara-rate-severe)"
              : undefined
          }
        />
      </div>

      {/* Student records table */}
      <div
        className="rounded-xl border border-border overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <h2 className="text-sm font-semibold flex-1">
            Student Records ({filtered.length})
          </h2>
          <input
            type="search"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-48"
          />
        </div>

        {records.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No records yet - click <strong>Sync Attendance</strong> to pull
              data from the date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-native">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b border-border text-left"
                  style={{ background: "var(--muted)" }}
                >
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium text-right">Possible</th>
                  <th className="px-4 py-2 font-medium text-right">Actual</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Unexplained
                  </th>
                  <th className="px-4 py-2 font-medium text-right">Rate</th>
                  <th className="px-4 py-2 font-medium text-right">Override</th>
                  {canManage && !isSubmitted && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <StudentRow
                    key={r.id}
                    record={r}
                    canManage={canManage && !isSubmitted}
                    isEditing={overrideRecordId === r.id}
                    onEdit={() => setOverrideRecordId(r.id)}
                    onCancelEdit={() => setOverrideRecordId(null)}
                    onSaved={(updated) => {
                      setRecords((prev) =>
                        prev.map((rec) =>
                          rec.id === updated.id ? { ...rec, ...updated } : rec,
                        ),
                      );
                      setOverrideRecordId(null);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {period.notes && (
        <div
          className="rounded-xl border border-border px-4 py-3 text-sm"
          style={{ background: "var(--card)" }}
        >
          <p className="font-medium mb-1">Notes</p>
          <p style={{ color: "var(--muted-foreground)" }}>{period.notes}</p>
        </div>
      )}

      {/* Danger zone */}
      {canManage && !isSubmitted && (
        <div className="pt-2">
          <button
            onClick={handleDeletePeriod}
            className="touch-target text-sm px-3 py-1.5 rounded-lg border transition-colors hover:bg-muted"
            style={{
              color: "var(--destructive)",
              borderColor: "var(--destructive)",
            }}
          >
            Delete Period
          </button>
        </div>
      )}
    </div>
  );
}

// ── Student row with inline override form ─────────────────────

interface StudentRowProps {
  record: AcaraStudentRecordWithStudent;
  canManage: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: (updated: AcaraStudentRecordWithStudent) => void;
}

function StudentRow({
  record,
  canManage,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
}: StudentRowProps) {
  const haptics = useHaptics();
  const [fields, setFields] = useState({
    possible_days: record.possible_days,
    actual_days: record.actual_days,
    unexplained_days: record.unexplained_days,
    absent_explained: record.absent_explained,
    late_days: record.late_days,
    exempt_days: record.exempt_days,
    override_notes: record.override_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    haptics.impact("medium");
    const result = await overrideAcaraStudentRecord({
      id: record.id,
      ...fields,
      override_notes: fields.override_notes,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      haptics.error();
      return;
    }
    haptics.success();
    onSaved({ ...record, ...result.data! });
  }

  const s = record.student;
  const name = `${s.first_name} ${s.last_name}`;

  if (isEditing) {
    return (
      <tr style={{ background: "var(--muted)" }}>
        <td colSpan={7} className="px-4 py-3">
          <p className="font-medium text-sm mb-2">{name} - Override</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 text-xs">
            {(
              [
                ["possible_days", "Possible"],
                ["actual_days", "Actual"],
                ["unexplained_days", "Unexplained"],
                ["absent_explained", "Explained"],
                ["late_days", "Late"],
                ["exempt_days", "Exempt"],
              ] as [keyof typeof fields, string][]
            ).map(([key, label]) => (
              <div key={key} className="space-y-0.5">
                <label
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {label}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={
                    key === "override_notes"
                      ? undefined
                      : (fields[key] as number)
                  }
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      [key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            <label
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Reason for override *
            </label>
            <input
              type="text"
              value={fields.override_notes}
              onChange={(e) =>
                setFields((f) => ({ ...f, override_notes: e.target.value }))
              }
              maxLength={500}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              placeholder="Required reason…"
            />
          </div>
          {error && (
            <p className="text-xs mt-1" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="touch-target active-push rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {saving ? "Saving…" : "Save Override"}
            </button>
            <button
              onClick={onCancelEdit}
              className="touch-target active-push rounded border border-border bg-background px-3 py-1 text-xs hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-4 py-2">
        <span className="font-medium">{name}</span>
        {record.manually_overridden && (
          <span
            className="ml-1.5 text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--acara-exported-bg)",
              color: "var(--acara-exported-fg)",
            }}
          >
            overridden
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {record.possible_days}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {record.actual_days}
      </td>
      <td className="px-4 py-2 text-right tabular-nums">
        {record.unexplained_days > 0 ? (
          <span style={{ color: "var(--acara-rate-at-risk)" }}>
            {record.unexplained_days}
          </span>
        ) : (
          record.unexplained_days
        )}
      </td>
      <td className="px-4 py-2 text-right">
        <AcaraRateBadge rate={record.attendance_rate} size="sm" />
      </td>
      <td
        className="px-4 py-2 text-right text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        {record.manually_overridden ? "Manual" : "Auto"}
      </td>
      {canManage && (
        <td className="px-4 py-2 text-right">
          <button
            onClick={onEdit}
            className="touch-target text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
          >
            Edit
          </button>
        </td>
      )}
    </tr>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl border border-border px-4 py-3"
      style={{ background: "var(--card)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold mt-0.5 tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
