// src/components/domain/absence-followup/alert-history-client.tsx

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertStatusBadge } from "./alert-status-badge";
import { exportAlertHistory, getAlertHistory } from "@/lib/actions/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceAlertStatus, AbsenceFollowupAlertWithStudent } from "@/types/domain";

interface AlertHistoryClientProps {
  initialAlerts: AbsenceFollowupAlertWithStudent[];
  totalCount: number;
  canManage: boolean;
}

export function AlertHistoryClient({
  initialAlerts,
  totalCount,
  canManage,
}: AlertHistoryClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AbsenceAlertStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const limit = 25;

  function loadPage(newPage: number, overrides?: Partial<{
    status: AbsenceAlertStatus | "";
    dateFrom: string;
    dateTo: string;
    search: string;
  }>) {
    haptics.selection();
    startTransition(async () => {
      const sf = overrides?.status ?? statusFilter;
      const df = overrides?.dateFrom ?? dateFrom;
      const dt = overrides?.dateTo ?? dateTo;
      const sq = overrides?.search ?? search;

      const result = await getAlertHistory({
        page: newPage,
        limit,
        ...(sf ? { status: sf } : {}),
        ...(df ? { date_from: df } : {}),
        ...(dt ? { date_to: dt } : {}),
        ...(sq ? { search: sq } : {}),
      });

      if (result.data) {
        setAlerts(result.data);
        setTotal(result.pagination?.total ?? 0);
        setPage(newPage);
      }
    });
  }

  function handleFilterChange() {
    loadPage(1);
  }

  async function handleExport() {
    if (!canManage) return;
    haptics.medium();
    const result = await exportAlertHistory({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    });

    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
            Search student
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={handleFilterChange}
            placeholder="Name…"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AbsenceAlertStatus | "");
              loadPage(1, { status: e.target.value as AbsenceAlertStatus | "" });
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="notified">Notified</option>
            <option value="explained">Explained</option>
            <option value="escalated">Escalated</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              loadPage(1, { dateFrom: e.target.value });
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              loadPage(1, { dateTo: e.target.value });
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        {canManage && (
          <button
            onClick={handleExport}
            className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Results */}
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {total} alert{total !== 1 ? "s" : ""} found
      </p>

      {alerts.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <div className="text-4xl" style={{ color: "var(--empty-state-icon)" }}>📭</div>
          <p className="text-sm font-medium">No alerts match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const studentName = alert.student
              ? `${alert.student.preferred_name ?? alert.student.first_name} ${alert.student.last_name}`
              : "Unknown";
            return (
              <Link
                key={alert.id}
                href={`/attendance/absence-followup/${alert.id}`}
                className="card-interactive flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted transition-colors"
                onClick={() => haptics.light()}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {alert.student?.photo_url ? (
                    <img
                      src={alert.student.photo_url}
                      alt={studentName}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      {alert.student?.first_name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{studentName}</p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {alert.alert_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {alert.notification_count > 0 && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      {alert.notification_count} notif.
                    </span>
                  )}
                  <AlertStatusBadge status={alert.status} size="sm" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            disabled={page <= 1 || isPending}
            onClick={() => loadPage(page - 1)}
            className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages || isPending}
            onClick={() => loadPage(page + 1)}
            className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
