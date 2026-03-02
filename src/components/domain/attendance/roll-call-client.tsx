// src/components/domain/attendance/roll-call-client.tsx
//
// ============================================================
// WattleOS V2 - Roll Call Client Component
// ============================================================
// The primary daily attendance workflow. A guide:
// 1. Selects their class (auto-selects if only one)
// 2. Sees today's date (can change)
// 3. Taps each student's status (Present / Absent / Late / Excused / Half Day)
// 4. Sees summary bar update in real-time
// 5. Taps "Save Roll" to persist
//
// Design priorities:
// - Thumb-friendly on iPad (large tap targets, haptic feedback)
// - Medical alerts visible (⚠ badges on student rows)
// - Quick: "Mark All Present" button for good days
// - Optimistic: each tap saves immediately via markAttendance
//
// WHY optimistic single-save (not bulk-only): Guides get
// interrupted constantly. If they mark 15 students present
// then a child falls over, the 15 are already saved.
// The "Save Roll" button is a confirmation + marks any
// remaining unmarked students as absent.
// ============================================================

"use client";

import type { StudentAttendanceRow } from "@/lib/actions/attendance";
import {
  bulkMarkAttendance,
  getClassAttendance,
  markAttendance,
} from "@/lib/actions/attendance";
import {
  ATTENDANCE_STATUS_CONFIG,
  type AttendanceStatusValue,
} from "@/lib/constants/attendance";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import type { AttendanceStatus } from "@/types/domain";
import { useCallback, useEffect, useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface ClassOption {
  id: string;
  name: string;
  room: string | null;
  cycleLevel: string | null;
}

interface RollCallClientProps {
  classes: ClassOption[];
}

// ============================================================
// Helpers
// ============================================================

function todayDateString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// Component
// ============================================================

export function RollCallClient({ classes }: RollCallClientProps) {
  const haptics = useHaptics();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes.length === 1 ? classes[0].id : "",
  );
  const [date, setDate] = useState<string>(todayDateString());
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, AttendanceStatusValue>
  >({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveAllPending, startSaveAll] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ----------------------------------------------------------
  // Load class attendance when class or date changes
  // ----------------------------------------------------------
  const loadAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setSuccessMessage(null);

    const result = await getClassAttendance(selectedClassId, date);

    if (result.data) {
      setRows(result.data);
      // Initialize local statuses from existing records
      const statuses: Record<string, AttendanceStatusValue> = {};
      const notes: Record<string, string> = {};
      for (const row of result.data) {
        if (row.record) {
          statuses[row.student.id] = row.record.status as AttendanceStatusValue;
          notes[row.student.id] = row.record.notes ?? "";
        }
      }
      setLocalStatuses(statuses);
      setLocalNotes(notes);
    }

    setLoading(false);
  }, [selectedClassId, date]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // ----------------------------------------------------------
  // Mark single student (optimistic save)
  // ----------------------------------------------------------
  async function handleMark(studentId: string, status: AttendanceStatusValue) {
    // Toggle: if already this status, clear it
    const current = localStatuses[studentId];
    if (current === status) {
      haptics.impact("light");
      setLocalStatuses((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      return;
    }

    // Haptic feedback - medium for meaningful attendance action
    haptics.impact("medium");

    // Optimistic update
    setLocalStatuses((prev) => ({ ...prev, [studentId]: status }));
    setSaving((prev) => ({ ...prev, [studentId]: true }));

    await markAttendance({
      studentId,
      classId: selectedClassId,
      date,
      status,
      notes: localNotes[studentId] || null,
    });

    setSaving((prev) => ({ ...prev, [studentId]: false }));
  }

  // ----------------------------------------------------------
  // Mark All Present
  // ----------------------------------------------------------
  function handleMarkAllPresent() {
    haptics.impact("medium");
    const newStatuses: Record<string, AttendanceStatusValue> = {
      ...localStatuses,
    };
    for (const row of rows) {
      if (!newStatuses[row.student.id]) {
        newStatuses[row.student.id] = "present";
      }
    }
    setLocalStatuses(newStatuses);

    // Save all in bulk
    startSaveAll(async () => {
      const records = rows
        .filter(
          (r) =>
            !localStatuses[r.student.id] ||
            localStatuses[r.student.id] !== newStatuses[r.student.id],
        )
        .map((r) => ({
          studentId: r.student.id,
          status: newStatuses[r.student.id] as AttendanceStatus,
          notes: localNotes[r.student.id] || null,
        }));

      if (records.length > 0) {
        await bulkMarkAttendance({
          classId: selectedClassId,
          date,
          records,
        });
      }

      haptics.success();
      setSuccessMessage("All students marked present.");
      setTimeout(() => setSuccessMessage(null), 3000);
    });
  }

  // ----------------------------------------------------------
  // Save entire roll (marks unmarked as absent)
  // ----------------------------------------------------------
  function handleSaveRoll() {
    haptics.impact("medium");
    startSaveAll(async () => {
      const records = rows.map((r) => ({
        studentId: r.student.id,
        status: (localStatuses[r.student.id] ?? "absent") as AttendanceStatus,
        notes: localNotes[r.student.id] || null,
      }));

      const result = await bulkMarkAttendance({
        classId: selectedClassId,
        date,
        records,
      });

      if (result.data) {
        haptics.success();
        setSuccessMessage(
          `Roll saved - ${result.data.marked} students recorded.`,
        );
        // Refresh to get updated records
        await loadAttendance();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        haptics.error();
      }
    });
  }

  // ----------------------------------------------------------
  // Summary stats
  // ----------------------------------------------------------
  const totalStudents = rows.length;
  const marked = Object.keys(localStatuses).length;
  const unmarked = totalStudents - marked;
  const presentCount = Object.values(localStatuses).filter(
    (s) => s === "present",
  ).length;
  const absentCount = Object.values(localStatuses).filter(
    (s) => s === "absent",
  ).length;
  const lateCount = Object.values(localStatuses).filter(
    (s) => s === "late",
  ).length;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div
        className="flex flex-wrap items-end gap-[var(--density-card-padding)] rounded-[var(--radius)] border border-border p-[var(--density-card-padding)]"
        style={{ background: "var(--card)" }}
      >
        {/* Class selector */}
        <GlowTarget
          id="att-select-class"
          category="select"
          label="Class picker"
        >
          <div className="min-w-[200px] flex-1">
            <label
              className="block text-xs font-medium"
              style={{ color: "var(--form-label-fg)" }}
            >
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                haptics.selection();
                setSelectedClassId(e.target.value);
              }}
              className="mt-1 block w-full rounded-[var(--radius-md)] border border-border bg-background px-[var(--density-input-padding-x)] py-[var(--density-input-padding-y)] text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              style={{ height: "var(--density-input-height)" }}
            >
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.room ? ` - ${c.room}` : ""}
                  {c.cycleLevel ? ` (${c.cycleLevel})` : ""}
                </option>
              ))}
            </select>
          </div>
        </GlowTarget>

        {/* Date picker */}
        <GlowTarget
          id="att-input-date"
          category="input"
          label="Date selector"
          context={{ value: date }}
        >
          <div>
            <label
              className="block text-xs font-medium"
              style={{ color: "var(--form-label-fg)" }}
            >
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block rounded-[var(--radius-md)] border border-border bg-background px-[var(--density-input-padding-x)] py-[var(--density-input-padding-y)] text-sm text-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              style={{ height: "var(--density-input-height)" }}
            />
          </div>
        </GlowTarget>

        {/* Quick actions */}
        {selectedClassId && rows.length > 0 && (
          <GlowTarget
            id="att-btn-mark-all"
            category="button"
            label="Mark All Present"
          >
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                disabled={saveAllPending}
                className="active-push touch-target rounded-[var(--radius-md)] px-[var(--density-button-padding-x)] text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  height: "var(--density-button-height)",
                  background: "var(--attendance-present)",
                  color: "var(--attendance-present-fg)",
                }}
              >
                Mark All Present
              </button>
            </div>
          </GlowTarget>
        )}
      </div>

      {/* Date display */}
      {selectedClassId && (
        <p className="text-sm font-medium text-muted-foreground">
          {formatDateDisplay(date)}
        </p>
      )}

      {/* Success message */}
      {successMessage && (
        <div
          className="rounded-[var(--radius)] px-4 py-3 text-sm font-medium animate-fade-in"
          style={{
            background: "var(--primary-50)",
            color: "var(--attendance-present)",
            border: "1px solid var(--attendance-present)",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          className="rounded-[var(--radius)] border border-border p-12 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2"
            style={{
              borderColor: "var(--border)",
              borderTopColor: "var(--primary)",
            }}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading students...
          </p>
        </div>
      )}

      {/* No class selected */}
      {!selectedClassId && !loading && (
        <div
          className="rounded-[var(--radius)] border border-border p-12 text-center"
          style={{ background: "var(--card)" }}
        >
          <p className="text-sm text-muted-foreground">
            Select a class to begin the roll call.
          </p>
        </div>
      )}

      {/* Empty class */}
      {selectedClassId && !loading && rows.length === 0 && (
        <div
          className="rounded-[var(--radius)] border border-border p-12 text-center"
          style={{ background: "var(--card)" }}
        >
          <p className="text-sm font-medium text-foreground">
            No students enrolled
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This class has no active enrollments.
          </p>
        </div>
      )}

      {/* Student list */}
      {selectedClassId && !loading && rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div
            className="flex flex-wrap gap-3 rounded-[var(--radius)] border border-border px-4 py-3"
            style={{ background: "var(--card)" }}
          >
            <SummaryPill
              label="Total"
              count={totalStudents}
              variant="neutral"
            />
            <SummaryPill
              label="Present"
              count={presentCount}
              variant="present"
            />
            <SummaryPill label="Absent" count={absentCount} variant="absent" />
            <SummaryPill label="Late" count={lateCount} variant="late" />
            {unmarked > 0 && (
              <SummaryPill
                label="Unmarked"
                count={unmarked}
                variant="neutral"
              />
            )}
          </div>

          {/* Student rows */}
          <div
            className="divide-y divide-border rounded-[var(--radius)] border border-border"
            style={{ background: "var(--card)" }}
          >
            {rows.map((row) => (
              <GlowTarget
                key={row.student.id}
                id={`att-row-student-${row.student.id}`}
                category="row"
                label={`${row.student.preferred_name ?? row.student.first_name} ${row.student.last_name}`}
                context={{
                  status: localStatuses[row.student.id] ?? "unmarked",
                }}
              >
                <StudentRow
                  row={row}
                  currentStatus={localStatuses[row.student.id] ?? null}
                  notes={localNotes[row.student.id] ?? ""}
                  isSaving={saving[row.student.id] ?? false}
                  onMark={(status) => handleMark(row.student.id, status)}
                  onNotesChange={(notes) =>
                    setLocalNotes((prev) => ({
                      ...prev,
                      [row.student.id]: notes,
                    }))
                  }
                />
              </GlowTarget>
            ))}
          </div>

          {/* Save button */}
          <div
            className="flex items-center justify-between rounded-[var(--radius)] border border-border px-4 py-3"
            style={{ background: "var(--card)" }}
          >
            <p className="text-sm text-muted-foreground">
              {unmarked > 0
                ? `${unmarked} student${unmarked !== 1 ? "s" : ""} unmarked - they'll be recorded as absent.`
                : "All students marked."}
            </p>
            <GlowTarget
              id="att-btn-save-roll"
              category="button"
              label="Save Roll"
            >
              <button
                onClick={handleSaveRoll}
                disabled={saveAllPending}
                className="active-push touch-target rounded-[var(--radius-md)] px-5 text-sm font-semibold shadow-sm disabled:opacity-50"
                style={{
                  height: "var(--density-button-height)",
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {saveAllPending ? "Saving..." : "Save Roll"}
              </button>
            </GlowTarget>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Student Row
// ============================================================

interface StudentRowProps {
  row: StudentAttendanceRow;
  currentStatus: AttendanceStatusValue | null;
  notes: string;
  isSaving: boolean;
  onMark: (status: AttendanceStatusValue) => void;
  onNotesChange: (notes: string) => void;
}

const STATUS_ORDER: AttendanceStatusValue[] = [
  "present",
  "absent",
  "late",
  "excused",
  "half_day",
];

// Maps status to the CSS variable tokens from the design system
const STATUS_CSS: Record<AttendanceStatusValue, { bg: string; fg: string }> = {
  present: {
    bg: "var(--attendance-present)",
    fg: "var(--attendance-present-fg)",
  },
  absent: { bg: "var(--attendance-absent)", fg: "var(--attendance-absent-fg)" },
  late: { bg: "var(--attendance-late)", fg: "var(--attendance-late-fg)" },
  excused: {
    bg: "var(--attendance-excused)",
    fg: "var(--attendance-excused-fg)",
  },
  half_day: {
    bg: "var(--attendance-half-day)",
    fg: "var(--attendance-half-day-fg)",
  },
};

function StudentRow({
  row,
  currentStatus,
  notes,
  isSaving,
  onMark,
  onNotesChange,
}: StudentRowProps) {
  const [showNotes, setShowNotes] = useState(false);
  const displayName = row.student.preferred_name ?? row.student.first_name;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {row.student.photo_url ? (
            <img
              src={row.student.photo_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Name + medical alerts */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName} {row.student.last_name}
            </p>
            {isSaving && (
              <div
                className="h-3 w-3 animate-spin rounded-full border border-border"
                style={{ borderTopColor: "var(--primary)" }}
              />
            )}
          </div>

          {/* Medical alerts */}
          {row.medicalAlerts.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {row.medicalAlerts.map((alert, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background:
                      alert.severity === "life_threatening"
                        ? "var(--medical-life-threatening)"
                        : "var(--medical-moderate)",
                    color:
                      alert.severity === "life_threatening"
                        ? "var(--medical-life-threatening-fg)"
                        : "var(--medical-moderate-fg)",
                  }}
                >
                  <svg
                    className="h-2.5 w-2.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {alert.condition_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status buttons - large touch targets, haptic feedback via parent */}
        <div className="flex flex-shrink-0 gap-1.5">
          {STATUS_ORDER.map((status) => {
            const config = ATTENDANCE_STATUS_CONFIG[status];
            const isActive = currentStatus === status;
            const css = STATUS_CSS[status];

            return (
              <button
                key={status}
                onClick={() => onMark(status)}
                title={config.label}
                className="active-push touch-target flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-all sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5"
                style={
                  isActive
                    ? {
                        background: css.bg,
                        color: css.fg,
                        boxShadow: "var(--shadow-sm)",
                      }
                    : {
                        background: "var(--muted)",
                        color: "var(--muted-foreground)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {/* Emoji icon on mobile, text label on desktop */}
                <span className="sm:hidden">{config.icon}</span>
                <span className="hidden text-xs sm:inline">{config.label}</span>
              </button>
            );
          })}

          {/* Notes toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Add note"
            className="active-push touch-target flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-sm transition-colors sm:h-auto sm:w-auto sm:px-2 sm:py-1.5"
            style={
              notes
                ? { background: "var(--info)", color: "var(--info-foreground)" }
                : {
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                  }
            }
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes input (collapsible) */}
      {showNotes && (
        <div className="ml-[52px] mt-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add a note (e.g., 'Left early at 2pm')"
            className="selectable block w-full rounded-[var(--radius-md)] border border-border bg-background px-[var(--density-input-padding-x)] py-[var(--density-input-padding-y)] text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Summary Pill
// ============================================================

interface SummaryPillProps {
  label: string;
  count: number;
  variant: "neutral" | "present" | "absent" | "late" | "excused" | "half_day";
}

const PILL_CSS: Record<
  SummaryPillProps["variant"],
  { bg: string; fg: string }
> = {
  neutral: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
  present: {
    bg: "var(--attendance-present)",
    fg: "var(--attendance-present-fg)",
  },
  absent: { bg: "var(--attendance-absent)", fg: "var(--attendance-absent-fg)" },
  late: { bg: "var(--attendance-late)", fg: "var(--attendance-late-fg)" },
  excused: {
    bg: "var(--attendance-excused)",
    fg: "var(--attendance-excused-fg)",
  },
  half_day: {
    bg: "var(--attendance-half-day)",
    fg: "var(--attendance-half-day-fg)",
  },
};

function SummaryPill({ label, count, variant }: SummaryPillProps) {
  const css = PILL_CSS[variant];
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: css.bg, color: css.fg }}
    >
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}
