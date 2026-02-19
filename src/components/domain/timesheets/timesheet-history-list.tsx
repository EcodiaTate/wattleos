// ============================================================
// src/components/domain/timesheets/timesheet-history-list.tsx
// ============================================================
// Renders a list of past timesheets as cards. Each card shows
// the pay period name, total hours, breakdown, and status badge.
// Expanding a card fetches the detailed time entries.
//
// WHY client component: Expand/collapse is interactive, and
// detail fetching on expand requires useState + useTransition.
// ============================================================

'use client';

import { useState, useTransition } from 'react';
import { getTimesheetDetail } from '@/lib/actions/timesheets';
import {
  TIMESHEET_STATUS_CONFIG,
  TIME_ENTRY_TYPE_CONFIG,
} from '@/lib/constants/timesheets';
import type {
  Timesheet,
  TimesheetWithEntries,
  TimesheetStatus,
  TimeEntryType,
} from '@/types/domain';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface TimesheetHistoryListProps {
  timesheets: Array<Timesheet & { pay_period_name?: string }>;
}

interface ExpandedDetail {
  timesheetId: string;
  data: TimesheetWithEntries | null;
  error: string | null;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatHours(h: number): string {
  return h.toFixed(1);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '–';
  return timeStr.slice(0, 5);
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function TimesheetHistoryList({ timesheets }: TimesheetHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<string, ExpandedDetail>>(new Map());
  const [isPending, startTransition] = useTransition();

  const toggleExpand = (timesheetId: string) => {
    if (expandedId === timesheetId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(timesheetId);

    // Fetch detail if not already cached
    if (!details.has(timesheetId)) {
      startTransition(async () => {
        const result = await getTimesheetDetail(timesheetId);
        setDetails((prev) => {
          const next = new Map(prev);
          next.set(timesheetId, {
            timesheetId,
            data: result.data ?? null,
            error: result.error?.message ?? null,
          });
          return next;
        });
      });
    }
  };

  return (
    <div className="space-y-3">
      {timesheets.map((ts) => {
        const isExpanded = expandedId === ts.id;
        const detail = details.get(ts.id);
        const statusConfig = TIMESHEET_STATUS_CONFIG[ts.status as TimesheetStatus];

        return (
          <div
            key={ts.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
          >
            {/* Card header - clickable to expand */}
            <button
              type="button"
              onClick={() => toggleExpand(ts.id)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {ts.pay_period_name ?? 'Pay Period'}
                  </h3>
                  {statusConfig && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
                      {statusConfig.label}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatHours(ts.total_hours)}h total</span>
                  <span className="text-gray-300">|</span>
                  <span>{formatHours(ts.regular_hours)}h regular</span>
                  {ts.overtime_hours > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-orange-600">{formatHours(ts.overtime_hours)}h overtime</span>
                    </>
                  )}
                  {ts.leave_hours > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-blue-600">{formatHours(ts.leave_hours)}h leave</span>
                    </>
                  )}
                </div>
              </div>

              {/* Expand chevron */}
              <svg
                className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Rejection notes (always visible if rejected) */}
            {ts.status === 'rejected' && ts.rejection_notes && (
              <div className="border-t border-red-100 bg-red-50 px-6 py-3">
                <p className="text-xs font-medium text-red-800">Reviewer notes:</p>
                <p className="mt-0.5 text-sm text-red-700">{ts.rejection_notes}</p>
              </div>
            )}

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-6 py-4">
                {isPending && !detail && (
                  <div className="flex items-center justify-center py-6">
                    <svg className="h-5 w-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="ml-2 text-sm text-gray-500">Loading entries…</span>
                  </div>
                )}

                {detail?.error && (
                  <p className="text-sm text-red-600">{detail.error}</p>
                )}

                {detail?.data && detail.data.time_entries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr>
                          <th className="py-2 pr-4 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Start</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">End</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Break</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                          <th className="pl-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {detail.data.time_entries
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((entry) => {
                            const typeConfig = TIME_ENTRY_TYPE_CONFIG[entry.entry_type as TimeEntryType];
                            return (
                              <tr key={entry.id}>
                                <td className="whitespace-nowrap py-2 pr-4 text-sm text-gray-900">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                                  {formatTime(entry.start_time)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                                  {formatTime(entry.end_time)}
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                                  {entry.break_minutes}m
                                </td>
                                <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                                  {formatHours(entry.total_hours)}h
                                </td>
                                <td className="whitespace-nowrap px-4 py-2">
                                  {typeConfig && (
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                                      {typeConfig.shortLabel ?? typeConfig.label}
                                    </span>
                                  )}
                                </td>
                                <td className="pl-4 py-2 text-sm text-gray-500">
                                  {entry.notes || '–'}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                {detail?.data && detail.data.time_entries.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No time entries for this period.
                  </p>
                )}

                {/* Submitted/approved timestamps */}
                {detail?.data && (
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    {detail.data.submitted_at && (
                      <span>
                        Submitted: {new Date(detail.data.submitted_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                    {detail.data.approved_at && (
                      <span>
                        Approved: {new Date(detail.data.approved_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                    {detail.data.synced_at && (
                      <span>
                        Synced: {new Date(detail.data.synced_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}