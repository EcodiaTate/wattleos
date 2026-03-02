"use client";

// src/components/domain/visitor-log/contractor-log-client.tsx
//
// ============================================================
// WattleOS V2 - Contractor Log (Staff Admin View)
// ============================================================
// Lists contractor sign-in records with:
//   - Date range filter + "on site only" toggle
//   - Search (company, contact, location)
//   - Quick sign-out button for contractors still on site
//   - Delete (soft) action
//   - CSV export
//   - Sign-in modal
// ============================================================

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  deleteContractorRecord,
  exportContractorLog,
  listContractorRecords,
  signOutContractor,
} from "@/lib/actions/visitor-log";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { ContractorSignInRecord } from "@/types/domain";
import { ContractorSignInForm } from "./contractor-sign-in-form";

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

// ── On-site badge ─────────────────────────────────────────────

function OnSiteBadge() {
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

// ── Verification badge ────────────────────────────────────────

function VerificationBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={
        ok
          ? {
              background: "var(--color-green-100, #dcfce7)",
              color: "var(--color-green-700, #15803d)",
            }
          : { background: "var(--muted)", color: "var(--muted-foreground)" }
      }
    >
      {ok ? (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      ) : (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────

interface ContractorLogClientProps {
  canManage: boolean;
}

export function ContractorLogClient({ canManage }: ContractorLogClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [onSiteOnly, setOnSiteOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [records, setRecords] = useState<ContractorSignInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (sd: string, ed: string, oso: boolean, q: string) => {
      setLoading(true);
      setError("");
      try {
        const result = await listContractorRecords({
          startDate: sd,
          endDate: ed,
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
    void load(startDate, endDate, onSiteOnly, search);
  }, [startDate, endDate, onSiteOnly, search, load]);

  const handleSignOut = (id: string) => {
    haptics.impact("medium");
    setSigningOut(id);
    startTransition(async () => {
      const result = await signOutContractor({
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
    if (!confirm("Delete this contractor record? This cannot be undone."))
      return;
    haptics.impact("medium");
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteContractorRecord(id);
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
      const result = await exportContractorLog(startDate, endDate);
      if (!result.data) return;
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contractor-log-${startDate}-to-${endDate}.csv`;
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
          placeholder="Search company, contact…"
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
              Sign In Contractor
            </button>
          )}
        </div>
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
          <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto scroll-native rounded-[var(--radius-xl)] border border-border bg-background p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Sign In Contractor
            </h2>
            <ContractorSignInForm
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
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654m5.65-4.65a2.652 2.652 0 00-3.586 0L8.432 8.048M3.75 3.75l1.5 1.5M12 3.75l1.5 1.5M20.25 12l-1.5 1.5"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">
            No contractor records for this period
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in contractors using the button above.
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
                  Company
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Work Location
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Verification
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
                        <OnSiteBadge />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTimeOnly(r.signed_out_at!)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {r.company_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.contact_name}
                      </div>
                      {r.trade && (
                        <div className="text-xs text-muted-foreground">
                          {r.trade}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{r.work_location}</div>
                      {r.work_description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {r.work_description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <VerificationBadge
                          ok={r.induction_confirmed}
                          label="Induction"
                        />
                        {r.wwcc_number && (
                          <VerificationBadge
                            ok={r.wwcc_verified}
                            label="WWCC"
                          />
                        )}
                      </div>
                      {r.licence_number && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Lic: {r.licence_number}
                        </div>
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
                              title="Sign out contractor"
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
