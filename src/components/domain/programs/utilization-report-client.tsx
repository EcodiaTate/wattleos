// src/components/domain/programs/utilization-report-client.tsx
//
// ============================================================
// WattleOS V2 - Utilization Report Client
// ============================================================
// Client component that fetches utilization data for a
// user-selected date range and displays results in a table
// with visual percentage bars.
//
// WHY client: The date range picker triggers re-fetches.
// Results render inline with percentage bar visualizations.
// ============================================================

"use client";

import {
  getProgramUtilization,
  type UtilizationReportRow,
} from "@/lib/actions/programs/programs";
import {
  PROGRAM_TYPE_CONFIG,
  type ProgramTypeValue,
} from "@/lib/constants/programs";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UtilizationReportClient() {
  const today = new Date();
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(
    fourWeeksAgo.toISOString().split("T")[0],
  );
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [data, setData] = useState<UtilizationReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const result = await getProgramUtilization(fromDate, toDate);

    if (result.error) {
      setError(result.error.message);
      setData([]);
    } else {
      setData(result.data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const inputCls =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className={inputCls}
        />
        <label className="text-sm font-medium text-gray-700">To</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className={inputCls}
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && data.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            No program data for this date range.
          </p>
        </div>
      )}

      {data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Program
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sessions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Capacity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Bookings
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-40">
                  Utilization
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Checked In
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-40">
                  Attendance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => {
                const typeConfig =
                  PROGRAM_TYPE_CONFIG[row.program_type as ProgramTypeValue] ??
                  PROGRAM_TYPE_CONFIG.other;

                return (
                  <tr key={row.program_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/programs/${row.program_id}`}
                        className="text-sm font-medium text-gray-900 hover:text-amber-700"
                      >
                        {row.program_name}
                      </Link>
                      <span
                        className={`ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeConfig.badgeBg} ${typeConfig.badgeText}`}
                      >
                        {typeConfig.shortLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {row.total_sessions}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {row.total_capacity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {row.total_bookings}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              row.utilization_pct >= 90
                                ? "bg-red-500"
                                : row.utilization_pct >= 70
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(100, row.utilization_pct)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 tabular-nums w-10 text-right">
                          {row.utilization_pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {row.total_checked_in}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              row.attendance_pct >= 90
                                ? "bg-green-500"
                                : row.attendance_pct >= 70
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min(100, row.attendance_pct)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 tabular-nums w-10 text-right">
                          {row.attendance_pct}%
                        </span>
                      </div>
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
