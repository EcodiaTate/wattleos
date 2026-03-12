"use client";

// src/components/domain/attendance/sign-in-out-record-list.tsx
//
// ============================================================
// WattleOS V2 - Sign-In/Out Record List (Staff Admin View)
// ============================================================
// Shows all kiosk events for a given date with filter/export.
// ============================================================

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteSignInOutRecord,
  exportSignInOutRecords,
  listSignInOutRecords,
} from "@/lib/actions/sign-in-out";
import {
  getReasonLabel,
  SIGN_IN_OUT_TYPE_CONFIG,
} from "@/lib/constants/sign-in-out";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { SignInOutRecordWithStudent, SignInOutType } from "@/types/domain";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function studentName(
  s: SignInOutRecordWithStudent["student"],
): string {
  return s.preferred_name
    ? `${s.preferred_name} ${s.last_name}`
    : `${s.first_name} ${s.last_name}`;
}

// ── Type Filter Pill ─────────────────────────────────────────

function TypePill({ type }: { type: SignInOutType }) {
  const cfg = SIGN_IN_OUT_TYPE_CONFIG[type];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: cfg.colorVar,
        color: cfg.fgVar,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────

interface SignInOutRecordListProps {
  initialDate: string; // YYYY-MM-DD
}

export function SignInOutRecordList({ initialDate }: SignInOutRecordListProps) {
  const haptics = useHaptics();
  const [date, setDate] = useState(initialDate);
  const [typeFilter, setTypeFilter] = useState<SignInOutType | "all">("all");
  const [records, setRecords] = useState<SignInOutRecordWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (d: string, f: SignInOutType | "all") => {
    setLoading(true);
    setError("");
    try {
      const result = await listSignInOutRecords({
        startDate: d,
        endDate: d,
        type: f === "all" ? undefined : f,
        page: 1,
        perPage: 200,
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        setRecords(result.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(date, typeFilter);
  }, [date, typeFilter, load]);

  const handleExport = () => {
    haptics.impact("light");
    startTransition(async () => {
      const result = await exportSignInOutRecords(date, date);
      if (!result.data) return;
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sign-in-out-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    haptics.impact("medium");
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteSignInOutRecord(id);
      setDeletingId(null);
      if (result.error) {
        alert(result.error.message);
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const lateCount = records.filter((r) => r.type === "late_arrival").length;
  const earlyCount = records.filter((r) => r.type === "early_departure").length;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date picker */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Type filter */}
        <div className="flex gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
          {(["all", "late_arrival", "early_departure"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { haptics.impact("light"); setTypeFilter(f); }}
              className="rounded-[var(--radius-sm)] px-3 py-1 text-sm font-medium transition-colors"
              style={
                typeFilter === f
                  ? { background: "var(--foreground)", color: "var(--background)" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {f === "all"
                ? "All"
                : f === "late_arrival"
                  ? "Late Arrivals"
                  : "Early Departures"}
            </button>
          ))}
        </div>

        {/* Summary pills */}
        <div className="flex gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--kiosk-late-arrival)",
              color: "var(--kiosk-late-arrival-fg)",
            }}
          >
            {lateCount} late
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--kiosk-early-departure)",
              color: "var(--kiosk-early-departure-fg)",
            }}
          >
            {earlyCount} early
          </span>
        </div>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isPending || records.length === 0}
          className="ml-auto touch-target flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-12 text-center">
          <svg
            className="mx-auto h-10 w-10"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">No records for this date</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Late arrivals and early departures recorded at the kiosk will appear here.
          </p>
        </div>
      )}

      {/* Records table */}
      {!loading && records.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Time
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Signed By
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Notes
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">
                    {formatTime(r.occurred_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">
                      {studentName(r.student)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TypePill type={r.type} />
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {getReasonLabel(r.type, r.reason_code)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {r.signed_by_name ? (
                      <span>
                        {r.signed_by_name}
                        {r.signed_by_relationship && (
                          <span className="ml-1 text-muted-foreground">
                            ({r.signed_by_relationship})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2">
                      {r.reason_notes ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="touch-target rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      title="Delete record"
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
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
