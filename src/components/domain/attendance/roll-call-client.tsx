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
// - Thumb-friendly on iPad (large tap targets)
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
      setLocalStatuses((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      return;
    }

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

      setSuccessMessage("All students marked present.");
      setTimeout(() => setSuccessMessage(null), 3000);
    });
  }

  // ----------------------------------------------------------
  // Save entire roll (marks unmarked as absent)
  // ----------------------------------------------------------
  function handleSaveRoll() {
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
        setSuccessMessage(
          `Roll saved - ${result.data.marked} students recorded.`,
        );
        // Refresh to get updated records
        await loadAttendance();
        setTimeout(() => setSuccessMessage(null), 3000);
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
      <div className="flex flex-wrap items-end gap-[var(--density-card-padding)] rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        {/* Class selector */}
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-foreground">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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

        {/* Date picker */}
        <div>
          <label className="block text-xs font-medium text-foreground">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Quick actions */}
        {selectedClassId && rows.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllPresent}
              disabled={saveAllPending}
              className="rounded-lg bg-[var(--mastery-mastered)] px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Mark All Present
            </button>
          </div>
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
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading students...
          </p>
        </div>
      )}

      {/* No class selected */}
      {!selectedClassId && !loading && (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a class to begin the roll call.
          </p>
        </div>
      )}

      {/* Empty class */}
      {selectedClassId && !loading && rows.length === 0 && (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
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
          <div className="flex flex-wrap gap-3 rounded-lg borderborder-border bg-background px-4 py-3">
            <SummaryPill label="Total" count={totalStudents} color="gray" />
            <SummaryPill label="Present" count={presentCount} color="green" />
            <SummaryPill label="Absent" count={absentCount} color="red" />
            <SummaryPill label="Late" count={lateCount} color="amber" />
            {unmarked > 0 && (
              <SummaryPill label="Unmarked" count={unmarked} color="gray" />
            )}
          </div>

          {/* Student rows */}
          <div className="divide-y divide-gray-100 rounded-lg borderborder-border bg-background">
            {rows.map((row) => (
              <StudentRow
                key={row.student.id}
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
            ))}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between rounded-lg borderborder-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {unmarked > 0
                ? `${unmarked} student${unmarked !== 1 ? "s" : ""} unmarked - they'll be recorded as absent.`
                : "All students marked."}
            </p>
            <button
              onClick={handleSaveRoll}
              disabled={saveAllPending}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {saveAllPending ? "Saving..." : "Save Roll"}
            </button>
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
        <div className="flex h-[var(--density-button-height)] w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-muted-foreground">
          {row.student.photo_url ? (
            <img
              src={row.student.photo_url}
              alt=""
              className="h-[var(--density-button-height)] w-10 rounded-full object-cover"
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
              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-amber-600" />
            )}
          </div>

          {/* Medical alerts */}
          {row.medicalAlerts.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {row.medicalAlerts.map((alert, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    alert.severity === "life_threatening"
                      ? "bg-red-100 text-red-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
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

        {/* Status buttons */}
        <div className="flex flex-shrink-0 gap-1.5">
          {STATUS_ORDER.map((status) => {
            const config = ATTENDANCE_STATUS_CONFIG[status];
            const isActive = currentStatus === status;

            return (
              <button
                key={status}
                onClick={() => onMark(status)}
                title={config.label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-all sm:h-auto sm:w-auto sm:px-2.5 sm:py-1.5 ${
                  isActive
                    ? `${config.buttonBg} text-primary-foreground shadow-sm`
                    : "borderborder-border bg-background text-muted-foreground hover:border-gray-300 hover:bg-background"
                }`}
              >
                {/* Icon on mobile, label on desktop */}
                <span className="sm:hidden">{config.icon}</span>
                <span className="hidden text-xs sm:inline">{config.label}</span>
              </button>
            );
          })}

          {/* Notes toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Add note"
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors sm:h-auto sm:w-auto sm:px-2 sm:py-1.5 ${
              notes
                ? "bg-blue-100 text-blue-600"
                : "borderborder-border bg-background text-muted-foreground hover:border-gray-300 hover:text-muted-foreground"
            }`}
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
            className="block w-full rounded-lg borderborder-border px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
  color: "gray" | "green" | "red" | "amber" | "blue" | "purple";
}

const PILL_COLORS: Record<SummaryPillProps["color"], string> = {
  gray: "bg-muted text-foreground",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

function SummaryPill({ label, count, color }: SummaryPillProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${PILL_COLORS[color]}`}
    >
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}
