// src/components/domain/timesheets/pending-approvals-client.tsx
//
// ============================================================
// WattleOS V2 - Pending Approvals Client Component
// ============================================================
// Interactive component for the approver workflow. Shows
// submitted timesheets grouped by pay period, with:
//   • Expand to see daily entries
//   • Approve / Reject (with notes) individual timesheets
//   • Batch approve (select multiple → approve all)
//
// WHY 'use client': Approve/reject are mutations that need
// optimistic state, plus batch selection needs checkbox state.
// ============================================================

"use client";

import {
  approveTimesheet,
  getTimesheetDetail,
  rejectTimesheet,
} from "@/lib/actions/timesheets";
import { TIME_ENTRY_TYPE_CONFIG } from "@/lib/constants/timesheets";
import type {
  PayPeriod,
  TimeEntry,
  TimesheetWithEntries,
} from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface PendingApprovalsClientProps {
  groupedByPeriod: Record<
    string,
    {
      period: PayPeriod | null;
      timesheets: TimesheetWithEntries[];
    }
  >;
}

// ============================================================
// Detail cache type
// ============================================================

interface TimesheetDetail {
  timesheetId: string;
  data: TimesheetWithEntries | null;
  loading: boolean;
}

// ============================================================
// Component
// ============================================================

export function PendingApprovalsClient({
  groupedByPeriod,
}: PendingApprovalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Expand/collapse state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<string, TimesheetDetail>>(
    new Map(),
  );

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  // Action feedback
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Expand/collapse + lazy load detail ──────────────────
  const toggleExpand = async (timesheetId: string) => {
    if (expandedId === timesheetId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(timesheetId);

    if (!details.has(timesheetId)) {
      setDetails((prev) => {
        const next = new Map(prev);
        next.set(timesheetId, { timesheetId, data: null, loading: true });
        return next;
      });

      const result = await getTimesheetDetail(timesheetId);
      setDetails((prev) => {
        const next = new Map(prev);
        next.set(timesheetId, {
          timesheetId,
          data: result.data ?? null,
          loading: false,
        });
        return next;
      });
    }
  };

  // ── Approve single ─────────────────────────────────────
  const handleApprove = async (timesheetId: string) => {
    setActionMessage(null);
    const result = await approveTimesheet(timesheetId);
    if (result.error) {
      setActionMessage({ type: "error", text: result.error.message });
    } else {
      setActionMessage({ type: "success", text: "Timesheet approved." });
      startTransition(() => router.refresh());
    }
  };

  // ── Reject single ──────────────────────────────────────
  const handleReject = async () => {
    if (!rejectingId) return;
    if (!rejectionNotes.trim()) {
      setActionMessage({
        type: "error",
        text: "Please provide a reason for rejection.",
      });
      return;
    }

    setActionMessage(null);
    const result = await rejectTimesheet(rejectingId, rejectionNotes.trim());
    if (result.error) {
      setActionMessage({ type: "error", text: result.error.message });
    } else {
      setActionMessage({
        type: "success",
        text: "Timesheet rejected and returned to staff.",
      });
      setRejectingId(null);
      setRejectionNotes("");
      startTransition(() => router.refresh());
    }
  };

  // ── Batch approve ──────────────────────────────────────
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionMessage(null);

    let approved = 0;
    let failed = 0;

    for (const id of selectedIds) {
      const result = await approveTimesheet(id);
      if (result.error) {
        failed++;
      } else {
        approved++;
      }
    }

    setSelectedIds(new Set());

    if (failed > 0) {
      setActionMessage({
        type: "error",
        text: `Approved ${approved}, failed ${failed}. Check individual timesheets for issues.`,
      });
    } else {
      setActionMessage({
        type: "success",
        text: `${approved} timesheet(s) approved.`,
      });
    }

    startTransition(() => router.refresh());
  };

  // ── Checkbox toggle ────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allTimesheetIds = Object.values(groupedByPeriod).flatMap((g) =>
    g.timesheets.map((ts) => ts.id),
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === allTimesheetIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allTimesheetIds));
    }
  };

  // ── Format helpers ─────────────────────────────────────
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "pm" : "am";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m}${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Action message */}
      {actionMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Batch actions bar */}
      <div className="flex items-center gap-[var(--density-card-padding)] rounded-lg borderborder-border bg-background px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={
              selectedIds.size === allTimesheetIds.length &&
              allTimesheetIds.length > 0
            }
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          Select all ({allTimesheetIds.length})
        </label>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBatchApprove}
            disabled={isPending}
            className="rounded-lg bg-[var(--mastery-mastered)] px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Approve Selected ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Grouped timesheets */}
      {Object.entries(groupedByPeriod).map(([periodId, group]) => (
        <div key={periodId} className="space-y-3">
          {/* Period header */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {group.period?.name ?? "Unknown Period"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {group.period
                ? `${new Date(group.period.start_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${new Date(group.period.end_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
                : ""}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {group.timesheets.length} pending
            </span>
          </div>

          {/* Timesheet cards */}
          {group.timesheets.map((ts) => {
            const detail = details.get(ts.id);
            const isExpanded = expandedId === ts.id;

            return (
              <div
                key={ts.id}
                className="rounded-lg borderborder-border bg-background shadow-sm"
              >
                {/* Card header */}
                <div className="flex items-center gap-[var(--density-card-padding)] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(ts.id)}
                    onChange={() => toggleSelect(ts.id)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />

                  <button
                    onClick={() => toggleExpand(ts.id)}
                    className="flex flex-1 items-center gap-[var(--density-card-padding)] text-left"
                  >
                    {/* Avatar placeholder */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                      {ts.user.first_name?.[0] ?? ""}
                      {ts.user.last_name?.[0] ?? ""}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {ts.user.first_name} {ts.user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ts.total_hours.toFixed(1)}h total
                        {ts.overtime_hours > 0 &&
                          ` · ${ts.overtime_hours.toFixed(1)}h OT`}
                        {ts.leave_hours > 0 &&
                          ` · ${ts.leave_hours.toFixed(1)}h leave`}
                      </p>
                    </div>

                    {/* Expand chevron */}
                    <svg
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(ts.id)}
                      disabled={isPending}
                      className="rounded-lg bg-[var(--mastery-mastered)] px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(ts.id);
                        setRejectionNotes("");
                      }}
                      disabled={isPending}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {detail?.loading && (
                      <p className="text-sm text-muted-foreground">
                        Loading entries…
                      </p>
                    )}
                    {detail?.data && detail.data.time_entries.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-muted-foreground">
                              <th className="pb-2 pr-4">Date</th>
                              <th className="pb-2 pr-4">Start</th>
                              <th className="pb-2 pr-4">End</th>
                              <th className="pb-2 pr-4">Break</th>
                              <th className="pb-2 pr-4">Total</th>
                              <th className="pb-2 pr-4">Type</th>
                              <th className="pb-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.data.time_entries
                              .sort(
                                (a: TimeEntry, b: TimeEntry) =>
                                  new Date(a.date).getTime() -
                                  new Date(b.date).getTime(),
                              )
                              .map((entry: TimeEntry) => {
                                const typeConfig =
                                  TIME_ENTRY_TYPE_CONFIG[entry.entry_type] ??
                                  TIME_ENTRY_TYPE_CONFIG.regular;
                                return (
                                  <tr
                                    key={entry.id}
                                    className="border-b border-gray-50"
                                  >
                                    <td className="py-2 pr-4 font-medium text-foreground">
                                      {formatDate(entry.date)}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {formatTime(entry.start_time)}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {formatTime(entry.end_time)}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {entry.break_minutes}m
                                    </td>
                                    <td className="py-2 pr-4 font-medium text-foreground">
                                      {entry.total_hours.toFixed(1)}h
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
                                      >
                                        {typeConfig.shortLabel}
                                      </span>
                                    </td>
                                    <td className="py-2 text-muted-foreground">
                                      {entry.notes || " - "}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                          <tfoot>
                            <tr className="font-medium">
                              <td
                                colSpan={4}
                                className="pt-2 text-right text-muted-foreground"
                              >
                                Period Total:
                              </td>
                              <td className="pt-2 text-foreground">
                                {detail.data.total_hours.toFixed(1)}h
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                    {detail?.data && detail.data.time_entries.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No individual entries found for this timesheet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Reject modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-background p-[var(--density-card-padding)] shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              Reject Timesheet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The staff member will be notified and can revise and resubmit.
            </p>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="Reason for rejection (required)…"
              rows={3}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectionNotes("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionNotes.trim() || isPending}
                className="rounded-lg bg-[var(--attendance-absent)] px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-red-700 disabled:opacity-50"
              >
                Reject Timesheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
