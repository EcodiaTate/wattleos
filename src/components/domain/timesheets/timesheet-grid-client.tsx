// ============================================================
// src/components/domain/timesheets/timesheet-grid-client.tsx
// ============================================================
// Interactive time entry grid for the current pay period.
// One row per day with inline editing of times, break, type.
//
// WHY client component: Every cell is an interactive input.
// We need useState for local edits and useTransition for
// non-blocking server action calls on blur/change.
//
// WHY upsert on blur: The server action `logTimeEntry` is an
// upsert (one entry per user per day). Saving on blur means
// the user never loses work - each cell auto-saves.
// ============================================================

"use client";

import { deleteTimeEntry, logTimeEntry } from "@/lib/actions/time-entries";
import { submitTimesheet } from "@/lib/actions/timesheets";
import {
  DAY_LABELS,
  LEAVE_TYPES,
  TIME_ENTRY_TYPE_CONFIG,
  TIME_ENTRY_TYPES,
  TIMESHEET_STATUS_CONFIG,
} from "@/lib/constants/timesheets";
import type {
  PayPeriod,
  TimeEntry,
  TimeEntryType,
  Timesheet,
  TimesheetStatus,
} from "@/types/domain";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface TimesheetGridClientProps {
  payPeriod: PayPeriod;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultBreakMinutes: number;
  existingEntries: TimeEntry[];
  currentTimesheet: (Timesheet & { pay_period_name?: string }) | null;
}

/** Local row state for each day in the period */
interface DayRow {
  date: string; // ISO date string 'YYYY-MM-DD'
  dayLabel: string; // 'Mon', 'Tue', etc.
  dateLabel: string; // 'Feb 17'
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
  breakMinutes: number;
  entryType: TimeEntryType;
  notes: string;
  totalHours: number; // computed locally for instant feedback
  entryId: string | null; // null if not yet saved
  isSaving: boolean;
  error: string | null;
  isWeekend: boolean;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function generateDaysInPeriod(
  startDate: string,
  endDate: string,
  defaultStart: string,
  defaultEnd: string,
  defaultBreak: number,
  existingEntries: TimeEntry[],
): DayRow[] {
  const days: DayRow[] = [];
  const entryMap = new Map<string, TimeEntry>();

  for (const entry of existingEntries) {
    entryMap.set(entry.date, entry);
  }

  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    const iso = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Map to Mon=0..Sun=6
    const existing = entryMap.get(iso);

    const startTime = existing?.start_time?.slice(0, 5) ?? defaultStart;
    const endTime = existing?.end_time?.slice(0, 5) ?? defaultEnd;
    const breakMin = existing?.break_minutes ?? defaultBreak;

    days.push({
      date: iso,
      dayLabel: DAY_LABELS[dayIndex],
      dateLabel: current.toLocaleDateString("en-AU", {
        month: "short",
        day: "numeric",
      }),
      startTime,
      endTime,
      breakMinutes: breakMin,
      entryType: (existing?.entry_type as TimeEntryType) ?? "regular",
      notes: existing?.notes ?? "",
      totalHours:
        existing?.total_hours ?? computeHours(startTime, endTime, breakMin),
      entryId: existing?.id ?? null,
      isSaving: false,
      error: null,
      isWeekend,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

function computeHours(start: string, end: string, breakMin: number): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const worked = (endMins - startMins) / 60 - breakMin / 60;
  return Math.max(0, Math.round(worked * 100) / 100);
}

function formatHours(h: number): string {
  return h.toFixed(1);
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function TimesheetGridClient({
  payPeriod,
  defaultStartTime,
  defaultEndTime,
  defaultBreakMinutes,
  existingEntries,
  currentTimesheet,
}: TimesheetGridClientProps) {
  const router = useRouter();
  const [isSubmitting, startSubmitTransition] = useTransition();

  // ── Local state ──────────────────────────────────────────

  const [rows, setRows] = useState<DayRow[]>(() =>
    generateDaysInPeriod(
      payPeriod.start_date,
      payPeriod.end_date,
      defaultStartTime,
      defaultEndTime,
      defaultBreakMinutes,
      existingEntries,
    ),
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Derived
  const timesheetStatus: TimesheetStatus | null =
    currentTimesheet?.status ?? null;
  const isLocked =
    payPeriod.status === "locked" || payPeriod.status === "processed";
  const isEditable =
    !isLocked &&
    (timesheetStatus === null ||
      timesheetStatus === "draft" ||
      timesheetStatus === "rejected");

  const totalRegular = rows
    .filter(
      (r) =>
        r.entryType === "regular" ||
        r.entryType === "overtime" ||
        r.entryType === "public_holiday",
    )
    .reduce((sum, r) => sum + r.totalHours, 0);
  const totalOvertime = rows
    .filter((r) => r.entryType === "overtime")
    .reduce((sum, r) => sum + r.totalHours, 0);
  const totalLeave = rows
    .filter((r) => LEAVE_TYPES.includes(r.entryType))
    .reduce((sum, r) => sum + r.totalHours, 0);
  const grandTotal = rows.reduce((sum, r) => sum + r.totalHours, 0);

  // Check if all weekdays have an entry saved (entryId not null)
  const weekdayRows = rows.filter((r) => !r.isWeekend);
  const allWeekdaysFilled = weekdayRows.every((r) => r.entryId !== null);
  const canSubmit = isEditable && allWeekdaysFilled && !isSubmitting;

  // ── Row update handler ───────────────────────────────────

  const updateRow = useCallback((date: string, patch: Partial<DayRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.date !== date) return row;
        const updated = { ...row, ...patch };

        // Recompute total if times or break changed
        if (
          "startTime" in patch ||
          "endTime" in patch ||
          "breakMinutes" in patch
        ) {
          updated.totalHours = computeHours(
            updated.startTime,
            updated.endTime,
            updated.breakMinutes,
          );
        }
        return updated;
      }),
    );
  }, []);

  // ── Save a single row (called on blur) ──────────────────

  const saveRow = useCallback(
    async (date: string) => {
      const row = rows.find((r) => r.date === date);
      if (!row || !isEditable) return;

      // Don't save if start/end are empty
      if (!row.startTime || !row.endTime) return;

      updateRow(date, { isSaving: true, error: null });

      const result = await logTimeEntry({
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        breakMinutes: row.breakMinutes,
        entryType: row.entryType,
        notes: row.notes || undefined,
      });

      if (result.error) {
        updateRow(date, { isSaving: false, error: result.error.message });
      } else if (result.data) {
        updateRow(date, {
          isSaving: false,
          error: null,
          entryId: result.data.id,
          totalHours: result.data.total_hours,
        });
      }
    },
    [rows, isEditable, updateRow],
  );

  // ── Delete a row entry ───────────────────────────────────

  const clearRow = useCallback(
    async (date: string) => {
      const row = rows.find((r) => r.date === date);
      if (!row?.entryId || !isEditable) return;

      updateRow(date, { isSaving: true, error: null });

      const result = await deleteTimeEntry(row.entryId);

      if (result.error) {
        updateRow(date, { isSaving: false, error: result.error.message });
      } else {
        updateRow(date, {
          isSaving: false,
          error: null,
          entryId: null,
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          breakMinutes: defaultBreakMinutes,
          entryType: "regular",
          notes: "",
          totalHours: computeHours(
            defaultStartTime,
            defaultEndTime,
            defaultBreakMinutes,
          ),
        });
      }
    },
    [
      rows,
      isEditable,
      updateRow,
      defaultStartTime,
      defaultEndTime,
      defaultBreakMinutes,
    ],
  );

  // ── Submit handler ───────────────────────────────────────

  const handleSubmit = () => {
    setSubmitError(null);
    setSubmitSuccess(false);

    startSubmitTransition(async () => {
      const result = await submitTimesheet(payPeriod.id);

      if (result.error) {
        setSubmitError(result.error.message);
      } else {
        setSubmitSuccess(true);
        // Refresh the page data from the server
        router.refresh();
      }
    });
  };

  // ── Fill weekdays with defaults ──────────────────────────

  const fillDefaults = useCallback(async () => {
    for (const row of rows) {
      if (!row.isWeekend && row.entryId === null) {
        await saveRow(row.date);
      }
    }
  }, [rows, saveRow]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {timesheetStatus && (
        <StatusBanner
          status={timesheetStatus}
          rejectionNotes={currentTimesheet?.rejection_notes ?? null}
        />
      )}

      {/* Period locked banner */}
      {isLocked && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <p className="text-sm font-medium text-orange-800">
              This pay period is locked. No further changes can be made.
            </p>
          </div>
        </div>
      )}

      {/* Period header card */}
      <div className="rounded-lg borderborder-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {payPeriod.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {new Date(payPeriod.start_date + "T00:00:00").toLocaleDateString(
                "en-AU",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                },
              )}
              {" – "}
              {new Date(payPeriod.end_date + "T00:00:00").toLocaleDateString(
                "en-AU",
                {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )}
            </p>
          </div>

          {/* Summary pills */}
          <div className="hidden items-center gap-3 sm:flex">
            <SummaryPill
              label="Total"
              value={formatHours(grandTotal)}
              variant="primary"
            />
            <SummaryPill
              label="Regular"
              value={formatHours(totalRegular - totalOvertime)}
              variant="default"
            />
            {totalOvertime > 0 && (
              <SummaryPill
                label="Overtime"
                value={formatHours(totalOvertime)}
                variant="warning"
              />
            )}
            {totalLeave > 0 && (
              <SummaryPill
                label="Leave"
                value={formatHours(totalLeave)}
                variant="info"
              />
            )}
          </div>
        </div>
      </div>

      {/* Time Entry Grid */}
      <div className="overflow-x-auto rounded-lg borderborder-border bg-background">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Break
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <DayRowComponent
                key={row.date}
                row={row}
                isEditable={isEditable}
                onUpdate={(patch) => updateRow(row.date, patch)}
                onBlurSave={() => saveRow(row.date)}
                onClear={() => clearRow(row.date)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile summary (visible on small screens) */}
      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        <SummaryPill
          label="Total"
          value={formatHours(grandTotal)}
          variant="primary"
        />
        <SummaryPill
          label="Regular"
          value={formatHours(totalRegular - totalOvertime)}
          variant="default"
        />
        {totalOvertime > 0 && (
          <SummaryPill
            label="Overtime"
            value={formatHours(totalOvertime)}
            variant="warning"
          />
        )}
        {totalLeave > 0 && (
          <SummaryPill
            label="Leave"
            value={formatHours(totalLeave)}
            variant="info"
          />
        )}
      </div>

      {/* Actions bar */}
      {isEditable && (
        <div className="flex items-center justify-between rounded-lg borderborder-border bg-background px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fillDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
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
                  d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
                />
              </svg>
              Fill Defaults
            </button>
            {!allWeekdaysFilled && (
              <p className="text-xs text-muted-foreground">
                Save all weekday entries before submitting
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting…
              </>
            ) : (
              <>
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
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
                Submit Timesheet
              </>
            )}
          </button>
        </div>
      )}

      {/* Error/Success feedback */}
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}
      {submitSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">
            Timesheet submitted successfully! Your approver will review it
            shortly.
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  rejectionNotes,
}: {
  status: TimesheetStatus;
  rejectionNotes: string | null;
}) {
  const config = TIMESHEET_STATUS_CONFIG[status];
  if (!config) return null;

  // Map status to border/background colors for the banner
  const bannerStyles: Record<TimesheetStatus, string> = {
    draft: "border-border bg-background",
    submitted: "border-blue-200 bg-blue-50",
    approved: "border-green-200 bg-green-50",
    rejected: "border-red-200 bg-red-50",
    synced: "border-purple-200 bg-purple-50",
  };

  const textStyles: Record<TimesheetStatus, string> = {
    draft: "text-foreground",
    submitted: "text-blue-700",
    approved: "text-green-700",
    rejected: "text-red-700",
    synced: "text-purple-700",
  };

  const messages: Record<TimesheetStatus, string> = {
    draft:
      "Your timesheet is in draft. Fill in your hours and submit when ready.",
    submitted: "Your timesheet has been submitted and is awaiting approval.",
    approved: "Your timesheet has been approved.",
    rejected:
      "Your timesheet was returned for revision. Please update and resubmit.",
    synced: "Your timesheet has been approved and synced to payroll.",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 ${bannerStyles[status]}`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
          {config.label}
        </span>
        <p className={`text-sm ${textStyles[status]}`}>{messages[status]}</p>
      </div>
      {status === "rejected" && rejectionNotes && (
        <div className="mt-2 rounded-md bg-red-100 px-3 py-2">
          <p className="text-xs font-medium text-red-800">Reviewer notes:</p>
          <p className="mt-0.5 text-sm text-red-700">{rejectionNotes}</p>
        </div>
      )}
    </div>
  );
}

function DayRowComponent({
  row,
  isEditable,
  onUpdate,
  onBlurSave,
  onClear,
}: {
  row: DayRow;
  isEditable: boolean;
  onUpdate: (patch: Partial<DayRow>) => void;
  onBlurSave: () => void;
  onClear: () => void;
}) {
  const typeConfig = TIME_ENTRY_TYPE_CONFIG[row.entryType];
  const isLeave = LEAVE_TYPES.includes(row.entryType);

  return (
    <tr
      className={`${row.isWeekend ? "bg-background/50" : ""} ${row.error ? "bg-red-50/30" : ""}`}
    >
      {/* Day label */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <span
          className={`text-sm font-medium ${row.isWeekend ? "text-muted-foreground" : "text-foreground"}`}
        >
          {row.dayLabel}
        </span>
      </td>

      {/* Date */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <span className="text-sm text-muted-foreground">{row.dateLabel}</span>
      </td>

      {/* Start time */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <input
          type="time"
          value={row.startTime}
          onChange={(e) => onUpdate({ startTime: e.target.value })}
          onBlur={onBlurSave}
          disabled={!isEditable}
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
      </td>

      {/* End time */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <input
          type="time"
          value={row.endTime}
          onChange={(e) => onUpdate({ endTime: e.target.value })}
          onBlur={onBlurSave}
          disabled={!isEditable}
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
      </td>

      {/* Break */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <select
          value={row.breakMinutes}
          onChange={(e) => onUpdate({ breakMinutes: Number(e.target.value) })}
          onBlur={onBlurSave}
          disabled={!isEditable}
          className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        >
          <option value={0}>0 min</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
          <option value={60}>60 min</option>
        </select>
      </td>

      {/* Total hours */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <span className="text-sm font-medium text-foreground">
          {formatHours(row.totalHours)}h
        </span>
      </td>

      {/* Entry type */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <select
          value={row.entryType}
          onChange={(e) => {
            onUpdate({ entryType: e.target.value as TimeEntryType });
            // Trigger save after type change
            setTimeout(onBlurSave, 0);
          }}
          disabled={!isEditable}
          className={`w-32 rounded-md border px-2 py-1.5 text-xs font-medium focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60 ${typeConfig?.bgColor ?? "bg-background"} ${typeConfig?.color ?? "text-foreground"} border-gray-300`}
        >
          {TIME_ENTRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {TIME_ENTRY_TYPE_CONFIG[type]?.label ?? type}
            </option>
          ))}
        </select>
      </td>

      {/* Notes */}
      <td className="px-4 py-2.5">
        <input
          type="text"
          value={row.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          onBlur={onBlurSave}
          disabled={!isEditable}
          placeholder={row.isWeekend ? "" : "Optional"}
          className="w-full min-w-[100px] rounded-md border border-gray-300 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
        />
      </td>

      {/* Status / Actions */}
      <td className="whitespace-nowrap px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {row.isSaving && (
            <svg
              className="h-4 w-4 animate-spin text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {!row.isSaving && row.entryId && !row.error && (
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          )}
          {row.error && (
            <span className="text-xs text-red-500" title={row.error}>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </span>
          )}
          {isEditable && row.entryId && (
            <button
              type="button"
              onClick={onClear}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-red-500"
              title="Clear entry"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SummaryPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "primary" | "default" | "warning" | "info";
}) {
  const styles: Record<typeof variant, string> = {
    primary: "bg-amber-50 text-amber-700 border-amber-200",
    default: "bg-background text-foregroundborder-border",
    warning: "bg-orange-50 text-orange-700 border-orange-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${styles[variant]}`}
    >
      <span className="text-xs">{label}</span>
      <span className="text-sm font-semibold">{value}h</span>
    </div>
  );
}
