"use client";

// src/components/domain/visitor-log/visitor-log-client.tsx
//
// ============================================================
// WattleOS V2 - Visitor Log (Staff Admin View)
// ============================================================
// Lists visitor sign-in records with:
//   - Date range filter + "on site only" toggle
//   - Visitor type filter
//   - Quick sign-out button for visitors still on site
//   - Delete (soft) action
//   - CSV export
//   - Sign-in modal
// ============================================================

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteVisitorRecord,
  exportVisitorLog,
  listVisitorRecords,
  signOutVisitor,
} from "@/lib/actions/visitor-log";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { VisitorSignInRecord, VisitorType } from "@/types/domain";
import { VisitorSignInForm } from "./visitor-sign-in-form";

// ── Helpers ───────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: true,
  });
}

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  parent_guardian: "Parent / Guardian",
  community_member: "Community Member",
  official: "Official",
  delivery: "Delivery",
  volunteer: "Volunteer",
  other: "Other",
};

// Colour tokens per visitor type - use muted CSS vars, not hardcoded
const VISITOR_TYPE_COLORS: Record<VisitorType, { bg: string; fg: string }> = {
  parent_guardian: {
    bg: "var(--color-blue-100, #dbeafe)",
    fg: "var(--color-blue-700, #1d4ed8)",
  },
  community_member: {
    bg: "var(--color-green-100, #dcfce7)",
    fg: "var(--color-green-700, #15803d)",
  },
  official: {
    bg: "var(--color-purple-100, #f3e8ff)",
    fg: "var(--color-purple-700, #7e22ce)",
  },
  delivery: {
    bg: "var(--color-amber-100, #fef3c7)",
    fg: "var(--color-amber-700, #b45309)",
  },
  volunteer: {
    bg: "var(--color-teal-100, #ccfbf1)",
    fg: "var(--color-teal-700, #0f766e)",
  },
  other: { bg: "var(--muted)", fg: "var(--muted-foreground)" },
};

// ── Visitor type pill ────────────────────────────────────────

function VisitorTypePill({ type }: { type: VisitorType }) {
  const c = VISITOR_TYPE_COLORS[type];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {VISITOR_TYPE_LABELS[type]}
    </span>
  );
}

// ── On-site badge ─────────────────────────────────────────────

function OnSiteBadge({ isOnSite }: { isOnSite: boolean }) {
  if (!isOnSite) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: "var(--color-green-100, #dcfce7)",
        color: "var(--color-green-700, #15803d)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full animate-pulse"
        style={{ background: "var(--color-green-500, #22c55e)" }}
      />
      On site
    </span>
  );
}

// ── Main component ────────────────────────────────────────────

interface VisitorLogClientProps {
  canManage: boolean;
}

export function VisitorLogClient({ canManage }: VisitorLogClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [typeFilter, setTypeFilter] = useState<VisitorType | "all">("all");
  const [onSiteOnly, setOnSiteOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [records, setRecords] = useState<VisitorSignInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (
      sd: string,
      ed: string,
      tf: VisitorType | "all",
      oso: boolean,
      q: string,
    ) => {
      setLoading(true);
      setError("");
      try {
        const result = await listVisitorRecords({
          startDate: sd,
          endDate: ed,
          visitor_type: tf === "all" ? undefined : tf,
          on_site_only: oso,
          search: q || undefined,
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
    },
    [],
  );

  useEffect(() => {
    void load(startDate, endDate, typeFilter, onSiteOnly, search);
  }, [startDate, endDate, typeFilter, onSiteOnly, search, load]);

  const handleSignOut = (id: string) => {
    haptics.impact("medium");
    setSigningOut(id);
    startTransition(async () => {
      const result = await signOutVisitor({
        id,
        signed_out_at: new Date().toISOString(),
      });
      setSigningOut(null);
      if (result.error) {
        alert(result.error.message);
        return;
      }
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, signed_out_at: result.data!.signed_out_at } : r,
        ),
      );
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this visitor record? This cannot be undone.")) return;
    haptics.impact("medium");
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteVisitorRecord(id);
      setDeletingId(null);
      if (result.error) {
        alert(result.error.message);
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const handleExport = () => {
    haptics.impact("light");
    startTransition(async () => {
      const result = await exportVisitorLog(startDate, endDate);
      if (!result.data) return;
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visitor-log-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const onSiteCount = records.filter((r) => r.signed_out_at === null).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, purpose…"
          className="rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-52"
        />

        {/* On-site toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onSiteOnly}
            onChange={(e) => {
              haptics.impact("light");
              setOnSiteOnly(e.target.checked);
            }}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          <span className="text-sm text-foreground">On site only</span>
          {onSiteCount > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-xs font-medium"
              style={{
                background: "var(--color-green-100, #dcfce7)",
                color: "var(--color-green-700, #15803d)",
              }}
            >
              {onSiteCount}
            </span>
          )}
        </label>

        <div className="ml-auto flex gap-2">
          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending || records.length === 0}
            className="touch-target flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export CSV
          </button>

          {/* Sign in */}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                haptics.impact("medium");
                setShowForm(true);
              }}
              className="active-push touch-target flex items-center gap-2 rounded-[var(--radius-md)] bg-foreground px-3 py-2 text-sm font-medium text-background"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Sign In Visitor
            </button>
          )}
        </div>
      </div>

      {/* Type filter row */}
      <div className="flex flex-wrap gap-1">
        {(
          ["all", ...Object.keys(VISITOR_TYPE_LABELS)] as Array<
            "all" | VisitorType
          >
        ).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              haptics.impact("light");
              setTypeFilter(f);
            }}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors border"
            style={
              typeFilter === f
                ? {
                    background: "var(--foreground)",
                    color: "var(--background)",
                    borderColor: "var(--foreground)",
                  }
                : {
                    background: "var(--background)",
                    color: "var(--muted-foreground)",
                    borderColor: "var(--border)",
                  }
            }
          >
            {f === "all" ? "All types" : VISITOR_TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Sign-in modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[var(--radius-xl)] border border-border bg-background p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Sign In Visitor
            </h2>
            <VisitorSignInForm
              onSuccess={(record) => {
                setRecords((prev) => [record, ...prev]);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

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
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">
            No visitor records for this period
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in visitors using the button above.
          </p>
        </div>
      )}

      {/* Records table */}
      {!loading && records.length > 0 && (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sign In
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sign Out
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Purpose
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Host
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  ID
                </th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => {
                const isOnSite = r.signed_out_at === null;
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">
                      {formatDateTime(r.signed_in_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isOnSite ? (
                        <OnSiteBadge isOnSite />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTimeOnly(r.signed_out_at!)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {r.visitor_name}
                      </div>
                      {r.organisation && (
                        <div className="text-xs text-muted-foreground">
                          {r.organisation}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <VisitorTypePill type={r.visitor_type} />
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-foreground">
                      <span className="line-clamp-2">{r.purpose}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {r.host_name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.id_sighted ? (
                        <svg
                          className="h-4 w-4"
                          style={{ color: "var(--color-green-600, #16a34a)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Sign out */}
                          {isOnSite && (
                            <button
                              type="button"
                              onClick={() => handleSignOut(r.id)}
                              disabled={signingOut === r.id}
                              className="touch-target rounded px-2 py-1 text-xs font-medium transition-colors border border-border text-foreground hover:bg-muted disabled:opacity-50"
                              title="Sign out visitor"
                            >
                              {signingOut === r.id ? "…" : "Sign Out"}
                            </button>
                          )}
                          {/* Delete */}
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
                        </div>
                      </td>
                    )}
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
