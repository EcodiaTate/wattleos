// src/components/domain/attendance/attendance-history-client.tsx
//
// ============================================================
// WattleOS V2 - Attendance History Client
// ============================================================
// Interactive attendance history view. Loads summary data for
// a class over a date range, then shows per-day breakdowns.
//
// WHY client component: Date range changes need instant
// re-fetching without full page reload.
// ============================================================

"use client";

import type { AttendanceDaySummary } from "@/lib/actions/attendance";
import { getAttendanceSummary } from "@/lib/actions/attendance";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants/attendance";
import { useCallback, useEffect, useState } from "react";

// ============================================================
// Props
// ============================================================

interface ClassOption {
  id: string;
  name: string;
  room: string | null;
  cycleLevel: string | null;
}

interface AttendanceHistoryClientProps {
  classes: ClassOption[];
}

// ============================================================
// Helpers
// ============================================================

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 13); // Last 2 weeks
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatDateShort(dateStr: string): string {
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

export function AttendanceHistoryClient({
  classes,
}: AttendanceHistoryClientProps) {
  const defaults = defaultDateRange();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes.length === 1 ? classes[0].id : "",
  );
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [summaries, setSummaries] = useState<AttendanceDaySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);

    const result = await getAttendanceSummary({
      classId: selectedClassId,
      startDate,
      endDate,
    });

    if (result.data) {
      setSummaries(result.data);
    }
    setLoading(false);
  }, [selectedClassId, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate totals
  const totals = summaries.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      present: acc.present + s.present,
      absent: acc.absent + s.absent,
      late: acc.late + s.late,
      excused: acc.excused + s.excused,
      half_day: acc.half_day + s.half_day,
    }),
    { total: 0, present: 0, absent: 0, late: 0, excused: 0, half_day: 0 },
  );

  const attendanceRate =
    totals.total > 0
      ? (
          ((totals.present + totals.late + totals.half_day) / totals.total) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-gray-700">
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
      </div>

      {/* No class selected */}
      {!selectedClassId && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Select a class to view attendance history.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-amber-600" />
        </div>
      )}

      {/* Results */}
      {selectedClassId && !loading && (
        <>
          {/* Summary cards */}
          {summaries.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard
                label="Attendance Rate"
                value={`${attendanceRate}%`}
                sublabel={`${summaries.length} school days`}
                color="green"
              />
              <SummaryCard
                label="Total Present"
                value={String(totals.present)}
                sublabel={`of ${totals.total} records`}
                color="green"
              />
              <SummaryCard
                label="Total Absent"
                value={String(totals.absent)}
                sublabel={totals.absent > 0 ? "Needs follow-up" : "None"}
                color="red"
              />
              <SummaryCard
                label="Total Late"
                value={String(totals.late)}
                sublabel=""
                color="amber"
              />
            </div>
          )}

          {/* Daily table */}
          {summaries.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
              No attendance records found for this date range.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-green-600">
                      Present
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-red-600">
                      Absent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-amber-600">
                      Late
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-blue-600">
                      Excused
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-purple-600">
                      Half Day
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summaries.map((day) => {
                    const rate =
                      day.total > 0
                        ? (
                            ((day.present + day.late + day.half_day) /
                              day.total) *
                            100
                          ).toFixed(0)
                        : "0";

                    return (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                          {formatDateShort(day.date)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {day.total}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <StatusCell count={day.present} status="present" />
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <StatusCell count={day.absent} status="absent" />
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <StatusCell count={day.late} status="late" />
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <StatusCell count={day.excused} status="excused" />
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <StatusCell count={day.half_day} status="half_day" />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatusCell({
  count,
  status,
}: {
  count: number;
  status: keyof typeof ATTENDANCE_STATUS_CONFIG;
}) {
  if (count === 0) {
    return <span className="text-gray-300">—</span>;
  }

  const config = ATTENDANCE_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}
    >
      {count}
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  sublabel: string;
  color: "green" | "red" | "amber" | "blue";
}

const CARD_COLORS: Record<SummaryCardProps["color"], string> = {
  green: "border-green-200 bg-green-50",
  red: "border-red-200 bg-red-50",
  amber: "border-amber-200 bg-amber-50",
  blue: "border-blue-200 bg-blue-50",
};

const CARD_TEXT_COLORS: Record<SummaryCardProps["color"], string> = {
  green: "text-green-700",
  red: "text-red-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
};

function SummaryCard({ label, value, sublabel, color }: SummaryCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${CARD_COLORS[color]}`}>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${CARD_TEXT_COLORS[color]}`}>
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}
