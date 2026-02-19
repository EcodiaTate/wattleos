// src/components/domain/attendance/absence-report-client.tsx
//
// ============================================================
// WattleOS V2 - Absence Report Client
// ============================================================
// Filterable list of absent/late records. Key features:
// - "Unexplained only" toggle (no notes = unexplained)
// - Class filter
// - Date range filter
// - Student links for follow-up
//
// WHY: Australian schools must follow up on unexplained
// absences. This surfaces the records that need action.
// ============================================================

"use client";

import type { AbsenceReportRow } from "@/lib/actions/attendance";
import { getAbsenceReport } from "@/lib/actions/attendance";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants/attendance";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================
// Props
// ============================================================

interface ClassOption {
  id: string;
  name: string;
}

interface AbsenceReportClientProps {
  classes: ClassOption[];
}

// ============================================================
// Helpers
// ============================================================

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6); // Last 7 days
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ============================================================
// Component
// ============================================================

export function AbsenceReportClient({ classes }: AbsenceReportClientProps) {
  const defaults = defaultRange();
  const [classId, setClassId] = useState<string>("");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [unexplainedOnly, setUnexplainedOnly] = useState(true);
  const [rows, setRows] = useState<AbsenceReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const result = await getAbsenceReport({
      classId: classId || undefined,
      startDate,
      endDate,
      unexplainedOnly,
    });

    if (result.data) {
      setRows(result.data);
    }
    setLoading(false);
  }, [classId, startDate, endDate, unexplainedOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const unexplainedCount = rows.filter((r) => !r.hasExplanation).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-gray-700">
            Class
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
          <input
            type="checkbox"
            checked={unexplainedOnly}
            onChange={(e) => setUnexplainedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <span className="text-sm text-gray-700">Unexplained only</span>
        </label>
      </div>

      {/* Alert banner */}
      {unexplainedCount > 0 && unexplainedOnly && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-red-700">
            {unexplainedCount} unexplained absence
            {unexplainedCount !== 1 ? "s" : ""} require follow-up.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" />
        </div>
      )}

      {/* Results */}
      {!loading && rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">
            {unexplainedOnly ? "No unexplained absences" : "No absences found"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {unexplainedOnly
              ? "All absences in this period have been explained."
              : "No absent or late records for this date range."}
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const displayName =
                  row.student.preferred_name ?? row.student.first_name;
                const config = ATTENDANCE_STATUS_CONFIG[row.status];

                return (
                  <tr
                    key={`${row.student.id}-${row.date}-${i}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/students/${row.student.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-amber-700"
                      >
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                          {row.student.photo_url ? (
                            <img
                              src={row.student.photo_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        {displayName} {row.student.last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeBg} ${config.badgeText}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.notes ? (
                        <span className="text-sm text-gray-600">
                          {row.notes}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <svg
                            className="h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Unexplained
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
