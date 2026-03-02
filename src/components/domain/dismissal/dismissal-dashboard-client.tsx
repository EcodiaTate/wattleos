"use client";

// src/components/domain/dismissal/dismissal-dashboard-client.tsx
//
// Main end-of-day dismissal dashboard. Shows all students for today
// with pending / confirmed / exception status. Staff confirm each
// student's departure here.

import { useCallback, useEffect, useRef, useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  getDismissalDashboard,
  getPickupAuthorizations,
  seedDismissalRecords,
} from "@/lib/actions/dismissal";
import type {
  DismissalDashboardData,
  DismissalRecordWithStudent,
  PickupAuthorization,
} from "@/types/domain";
import { DismissalStatusBadge } from "./dismissal-status-badge";
import { StudentDismissalCard } from "./student-dismissal-card";

// ─── helpers ─────────────────────────────────────────────────

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────

interface DismissalDashboardClientProps {
  initialDate?: string;
  canManage: boolean;
}

export function DismissalDashboardClient({
  initialDate,
  canManage,
}: DismissalDashboardClientProps) {
  const haptics = useHaptics();
  const [date, setDate] = useState(initialDate ?? todayDate());
  const [data, setData] = useState<DismissalDashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "exception">("all");

  // Per-student pickup authorizations cache
  const authCache = useRef<Record<string, PickupAuthorization[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getDismissalDashboard(date);
    if (result.error) {
      setError(result.error.message);
    } else {
      setData(result.data);
      // Pre-fetch pickup authorizations for all students in view
      const studentIds = (result.data?.records ?? []).map((r) => r.student.id);
      for (const sid of studentIds) {
        if (!authCache.current[sid]) {
          getPickupAuthorizations(sid).then((res) => {
            if (!res.error && res.data) authCache.current[sid] = res.data;
          });
        }
      }
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSeed() {
    setSeeding(true);
    haptics.impact("medium");
    const result = await seedDismissalRecords({ dismissal_date: date, class_id: null });
    if (result.error) {
      setError(result.error.message);
    } else {
      haptics.success();
      await load();
    }
    setSeeding(false);
  }

  // Filter records
  const filteredRecords: DismissalRecordWithStudent[] = (data?.records ?? []).filter((r) => {
    const fullName = `${r.student.first_name} ${r.student.last_name}`.toLowerCase();
    if (search && !fullName.includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--muted-foreground)" }}>
        <div className="text-center space-y-2">
          <div className="text-3xl">🚌</div>
          <p className="text-sm">Loading dismissal records…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border p-6 text-center" style={{ color: "var(--destructive)" }}>
        <p className="font-medium">Failed to load</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          type="button"
          className="mt-3 text-sm underline"
          onClick={load}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Date picker + seed button ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Date
          </label>
          <input
            type="date"
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {canManage && (
          <button
            type="button"
            disabled={seeding}
            className="touch-target rounded-lg px-3 py-1.5 text-sm font-medium border border-border active-push"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--foreground)",
              opacity: seeding ? 0.6 : 1,
            }}
            onClick={handleSeed}
          >
            {seeding ? "Generating…" : "Generate records"}
          </button>
        )}
      </div>

      {/* ── Summary chips ── */}
      {data && (
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "confirmed", "exception"] as const).map((s) => {
            const count =
              s === "all"
                ? data.summary.total
                : s === "pending"
                ? data.summary.pending
                : s === "confirmed"
                ? data.summary.confirmed
                : data.summary.exceptions;

            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                className="touch-target rounded-full px-3 py-1.5 text-sm font-medium active-push"
                style={{
                  backgroundColor: isActive
                    ? s === "exception"
                      ? "var(--dismissal-exception-bg)"
                      : s === "confirmed"
                      ? "var(--dismissal-confirmed-bg)"
                      : s === "pending"
                      ? "var(--dismissal-pending-bg)"
                      : "var(--primary)"
                    : "var(--muted)",
                  color: isActive
                    ? s === "exception"
                      ? "var(--dismissal-exception-fg)"
                      : s === "confirmed"
                      ? "var(--dismissal-confirmed-fg)"
                      : s === "pending"
                      ? "var(--dismissal-pending-fg)"
                      : "var(--primary-foreground)"
                    : "var(--muted-foreground)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => {
                  haptics.selection();
                  setStatusFilter(s);
                }}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                {" "}
                <span className="tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search ── */}
      <input
        type="search"
        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        placeholder="Search students…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Exception alert ── */}
      {data && data.summary.exceptions > 0 && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            backgroundColor: "var(--dismissal-exception-bg)",
            color: "var(--dismissal-exception-fg)",
            border: "1px solid var(--dismissal-exception)",
          }}
        >
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold">
              {data.summary.exceptions} exception{data.summary.exceptions !== 1 ? "s" : ""} require attention
            </p>
            <p className="text-sm mt-0.5 opacity-80">
              Review the flagged students below and take action.
            </p>
          </div>
        </div>
      )}

      {/* ── Record list ── */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl" style={{ color: "var(--empty-state-icon)" }}>🚌</div>
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            {data?.summary.total === 0
              ? "No records for this date"
              : "No students match this filter"}
          </p>
          {data?.summary.total === 0 && canManage && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Click "Generate records" to seed dismissal records from today's enrolments.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <StudentDismissalCard
              key={record.id}
              record={record}
              busRoutes={data?.bus_routes ?? []}
              pickupAuthorizations={authCache.current[record.student.id] ?? []}
              onUpdate={load}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* ── Completion progress ── */}
      {data && data.summary.total > 0 && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <div className="flex justify-between text-sm font-medium">
            <span style={{ color: "var(--foreground)" }}>Dismissal progress</span>
            <span style={{ color: "var(--muted-foreground)" }}>
              {data.summary.confirmed + data.summary.exceptions} / {data.summary.total}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(((data.summary.confirmed + data.summary.exceptions) / data.summary.total) * 100)}%`,
                backgroundColor:
                  data.summary.pending === 0
                    ? "var(--dismissal-confirmed)"
                    : "var(--primary)",
              }}
            />
          </div>
          {data.summary.pending === 0 && (
            <p className="text-sm font-medium" style={{ color: "var(--dismissal-confirmed)" }}>
              ✓ All students accounted for
            </p>
          )}
        </div>
      )}
    </div>
  );
}
