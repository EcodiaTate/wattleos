"use client";

// src/components/domain/dismissal/dismissal-history-client.tsx
//
// Historical dismissal records - filterable by student, date range, status

import { useCallback, useEffect, useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { listDismissalHistory } from "@/lib/actions/dismissal";
import type { DismissalRecordWithStudent } from "@/types/domain";
import {
  DismissalMethodBadge,
  DismissalStatusBadge,
} from "./dismissal-status-badge";

const EXCEPTION_LABELS: Record<string, string> = {
  not_collected: "Not collected",
  unknown_person: "Unknown person",
  late_pickup: "Late pickup",
  refused_collection: "Refused collection",
  bus_no_show: "Bus no-show",
  other: "Other",
};

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DismissalHistoryClient() {
  const haptics = useHaptics();

  const [records, setRecords] = useState<DismissalRecordWithStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<
    "" | "pending" | "confirmed" | "exception"
  >("");

  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listDismissalHistory({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      status: status || undefined,
      page,
      per_page: PER_PAGE,
    });
    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      setRecords(result.data.data);
      setTotal(result.data.pagination.total);
    }
    setLoading(false);
  }, [fromDate, toDate, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilter() {
    haptics.selection();
    setPage(1);
    load();
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            From
          </label>
          <input
            type="date"
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            To
          </label>
          <input
            type="date"
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label
            className="block text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Status
          </label>
          <select
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="exception">Exception</option>
          </select>
        </div>
        <button
          type="button"
          className="touch-target rounded-lg px-3 py-1.5 text-sm font-medium active-push border border-border"
          style={{
            backgroundColor: "var(--muted)",
            color: "var(--foreground)",
          }}
          onClick={handleFilter}
        >
          Filter
        </button>
      </div>

      {error && (
        <p
          className="text-sm p-3 rounded-lg"
          style={{
            color: "var(--destructive)",
            backgroundColor:
              "color-mix(in srgb, var(--destructive) 10%, transparent)",
          }}
        >
          {error}
        </p>
      )}

      {/* ── Record count ── */}
      {!loading && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {total} record{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Table / list ── */}
      {loading ? (
        <div
          className="text-center py-12"
          style={{ color: "var(--muted-foreground)" }}
        >
          Loading…
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <div
            className="text-4xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            📋
          </div>
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            No records found
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Adjust the date range or filters
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {r.student.first_name} {r.student.last_name}
                    </span>
                    <DismissalStatusBadge status={r.status} size="sm" />
                    {r.actual_method && r.status !== "exception" && (
                      <DismissalMethodBadge
                        method={r.actual_method}
                        size="sm"
                        showEmoji={false}
                      />
                    )}
                  </div>

                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {shortDate(r.dismissal_date)}
                    {r.confirmed_at &&
                      ` · confirmed ${new Date(r.confirmed_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`}
                    {r.confirmer &&
                      ` by ${r.confirmer.first_name} ${r.confirmer.last_name}`}
                  </p>

                  {r.status === "exception" && r.exception_reason && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--dismissal-exception)" }}
                    >
                      ⚠{" "}
                      {EXCEPTION_LABELS[r.exception_reason] ??
                        r.exception_reason}
                      {r.exception_notes && `: ${r.exception_notes}`}
                    </p>
                  )}

                  {r.collected_by_name && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Collected by: {r.collected_by_name}
                    </p>
                  )}

                  {r.pickup_authorization && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Authorised: {r.pickup_authorization.authorized_name}
                    </p>
                  )}

                  {r.bus_route && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Bus: {r.bus_route.route_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
            style={{
              color: "var(--muted-foreground)",
              opacity: page <= 1 ? 0.4 : 1,
            }}
            onClick={() => {
              haptics.selection();
              setPage((p) => p - 1);
            }}
          >
            ← Previous
          </button>
          <span
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
            style={{
              color: "var(--muted-foreground)",
              opacity: page >= totalPages ? 0.4 : 1,
            }}
            onClick={() => {
              haptics.selection();
              setPage((p) => p + 1);
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
