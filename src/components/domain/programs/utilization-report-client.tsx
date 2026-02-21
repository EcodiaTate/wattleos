// src/components/domain/programs/utilization-report-client.tsx
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

  const [fromDate, setFromDate] = useState(fourWeeksAgo.toISOString().split("T")[0]);
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

  const inputCls = "rounded-lg border border-input bg-card px-[var(--density-input-padding-x)] h-[var(--density-input-height)] text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-[var(--transition-fast)]";

  return (
    <div className="space-y-[var(--density-section-gap)]">
      <div className="flex flex-wrap items-center gap-[var(--density-md)] bg-card p-[var(--density-md)] rounded-xl border border-border shadow-sm">
        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">From</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">To</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-lg bg-primary px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-bold text-primary-foreground hover:opacity-90 shadow-primary/20 shadow-md transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Report"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive font-medium animate-fade-in">
          {error}
        </div>
      )}

      {!loading && data.length === 0 && !error && (
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center bg-card/50">
          <p className="text-sm font-medium text-muted-foreground">No program data for this date range.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-fade-in-up">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">Program</th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Sessions</th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Capacity</th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Bookings</th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-xs font-bold uppercase tracking-widest text-muted-foreground w-40">Utilization</th>
                <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-xs font-bold uppercase tracking-widest text-muted-foreground">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((row) => {
                const typeConfig = PROGRAM_TYPE_CONFIG[row.program_type as ProgramTypeValue] ?? PROGRAM_TYPE_CONFIG.other;
                return (
                  <tr key={row.program_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <Link href={`/programs/${row.program_id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                        {row.program_name}
                      </Link>
                      <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter ${typeConfig.badgeBg} ${typeConfig.badgeText}`}>
                        {typeConfig.shortLabel}
                      </span>
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm font-medium tabular-nums">{row.total_sessions}</td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm font-medium tabular-nums text-muted-foreground">{row.total_capacity}</td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right text-sm font-bold tabular-nums">{row.total_bookings}</td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${row.utilization_pct >= 90 ? "bg-destructive" : row.utilization_pct >= 70 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${Math.min(100, row.utilization_pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground tabular-nums w-10 text-right">{row.utilization_pct}%</span>
                      </div>
                    </td>
                    <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${row.attendance_pct >= 90 ? "bg-success" : row.attendance_pct >= 70 ? "bg-warning" : "bg-destructive"}`}
                            style={{ width: `${Math.min(100, row.attendance_pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground tabular-nums w-10 text-right">{row.attendance_pct}%</span>
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