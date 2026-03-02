"use client";

// src/components/domain/naplan/naplan-cohort-client.tsx
//
// Cohort list for a NAPLAN window: view students, record opt-outs,
// generate cohort from active enrolments.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { NaplanProficiencyDot } from "./naplan-proficiency-badge";
import {
  generateCohort,
  getWindowCohort,
  recordOptOut,
  removeOptOut,
} from "@/lib/actions/naplan";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  NAPLAN_DOMAIN_CONFIG,
  NAPLAN_DOMAINS,
  NAPLAN_YEAR_LEVEL_LABELS,
} from "@/lib/constants/naplan";
import type {
  NaplanCohortEntryWithStudent,
  NaplanDomain,
  NaplanDomainResult,
  NaplanWindowStatus,
  NaplanYearLevel,
} from "@/types/domain";

interface NaplanCohortClientProps {
  windowId: string;
  windowStatus: NaplanWindowStatus;
  canManage: boolean;
}

export function NaplanCohortClient({
  windowId,
  windowStatus,
  canManage,
}: NaplanCohortClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [cohort, setCohort] = useState<NaplanCohortEntryWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<NaplanYearLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [optedOutOnly, setOptedOutOnly] = useState(false);
  const [optOutEntryId, setOptOutEntryId] = useState<string | null>(null);
  const [optOutReason, setOptOutReason] = useState("");

  async function loadCohort() {
    setLoading(true);
    const result = await getWindowCohort({
      window_id: windowId,
      year_level: yearFilter !== "all" ? yearFilter : undefined,
      opted_out_only: optedOutOnly || undefined,
      search: search || undefined,
    });
    if (!result.error && result.data) setCohort(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadCohort();
  }, [yearFilter, optedOutOnly, search]);

  function handleGenerate() {
    if (
      !confirm(
        "Generate cohort from active enrolments? Students already in the cohort will be skipped.",
      )
    )
      return;

    startTransition(async () => {
      const result = await generateCohort({ window_id: windowId });
      if (!result.error && result.data) {
        haptics.success();
        router.refresh();
        await loadCohort();
        alert(
          `Added ${result.data.inserted} students (${result.data.skipped} already in cohort).`,
        );
      } else {
        haptics.error();
        alert(result.error?.message ?? "Failed to generate cohort");
      }
    });
  }

  function handleOptOut(entryId: string) {
    setOptOutEntryId(entryId);
    setOptOutReason("");
  }

  function handleOptOutSubmit(entryId: string) {
    startTransition(async () => {
      const result = await recordOptOut({
        cohort_entry_id: entryId,
        opt_out_reason: optOutReason || null,
      });
      if (!result.error) {
        haptics.medium();
        setOptOutEntryId(null);
        await loadCohort();
      } else {
        haptics.error();
        alert(result.error.message);
      }
    });
  }

  function handleRemoveOptOut(entryId: string) {
    startTransition(async () => {
      const result = await removeOptOut({ cohort_entry_id: entryId });
      if (!result.error) {
        haptics.medium();
        await loadCohort();
      } else {
        haptics.error();
        alert(result.error.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Year filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1" style={{ background: "var(--card)" }}>
            {(["all", 3, 5, 7, 9] as const).map((yl) => (
              <button
                key={yl}
                onClick={() => {
                  haptics.selection();
                  setYearFilter(yl);
                }}
                className="touch-target rounded-md px-3 py-1 text-xs font-medium transition-colors"
                style={
                  yearFilter === yl
                    ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {yl === "all" ? "All Years" : `Year ${yl}`}
              </button>
            ))}
          </div>

          {/* Opted-out toggle */}
          <button
            onClick={() => {
              haptics.selection();
              setOptedOutOnly((v) => !v);
            }}
            className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors"
            style={
              optedOutOnly
                ? { background: "var(--naplan-developing-bg)", color: "var(--naplan-developing)", borderColor: "var(--naplan-developing)" }
                : { background: "var(--card)", color: "var(--muted-foreground)" }
            }
          >
            Opted Out Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="search"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />

          {/* Generate cohort */}
          {canManage && windowStatus !== "closed" && (
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--card)", color: "var(--foreground)" }}
            >
              Generate Cohort
            </button>
          )}
        </div>
      </div>

      {/* Opt-out reason modal */}
      {optOutEntryId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOptOutEntryId(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border p-6 shadow-xl"
            style={{ background: "var(--card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Record Opt-Out</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              The parent/carer has requested the student not participate in NAPLAN.
            </p>
            <textarea
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="mt-4 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setOptOutEntryId(null)}
                className="touch-target active-push rounded-lg px-4 py-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleOptOutSubmit(optOutEntryId)}
                disabled={isPending}
                className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{
                  background: "var(--destructive)",
                  color: "var(--destructive-foreground)",
                }}
              >
                Record Opt-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div
          className="rounded-xl border border-border p-8 text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Loading cohort…
        </div>
      ) : cohort.length === 0 ? (
        <div
          className="rounded-xl border border-border p-8 text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          No students match the current filters.
          {canManage && windowStatus !== "closed" && (
            <> Use <strong>Generate Cohort</strong> to auto-populate from active enrolments.</>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border" style={{ background: "var(--card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b border-border text-left text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--muted-foreground)" }}
              >
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Year</th>
                <th className="hidden px-4 py-3 sm:table-cell">Results</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {cohort.map((entry) => {
                const resultsByDomain = entry.results.reduce(
                  (acc, r) => {
                    acc[r.domain] = r;
                    return acc;
                  },
                  {} as Partial<Record<NaplanDomain, NaplanDomainResult>>,
                );

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {entry.student.photo_url ? (
                          <img
                            src={entry.student.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                            style={{
                              background: "var(--muted)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {entry.student.first_name[0]}
                            {entry.student.last_name[0]}
                          </div>
                        )}
                        <span className="font-medium">
                          {entry.student.first_name} {entry.student.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      Year {entry.year_level}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {entry.is_opted_out ? (
                        <span className="text-xs italic" style={{ color: "var(--muted-foreground)" }}>
                          Opted out
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {NAPLAN_DOMAINS.map((d) => (
                            <span key={d} title={NAPLAN_DOMAIN_CONFIG[d].label}>
                              <NaplanProficiencyDot
                                level={resultsByDomain[d]?.proficiency_level ?? null}
                              />
                            </span>
                          ))}
                          <span
                            className="ml-1.5 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {entry.results_count}/{NAPLAN_DOMAINS.length}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.is_opted_out ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "var(--naplan-developing-bg)",
                            color: "var(--naplan-developing)",
                          }}
                        >
                          Opted Out
                        </span>
                      ) : entry.results_count === NAPLAN_DOMAINS.length ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "var(--naplan-strong-bg)",
                            color: "var(--naplan-strong)",
                          }}
                        >
                          Complete
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "var(--naplan-window-draft-bg)",
                            color: "var(--naplan-window-draft-fg)",
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {windowStatus !== "draft" && !entry.is_opted_out && (
                            <Link
                              href={`/admin/naplan/${windowId}/results/${entry.id}`}
                              className="touch-target active-push rounded-md px-3 py-1 text-xs font-medium border border-border"
                              style={{ color: "var(--foreground)" }}
                            >
                              Results
                            </Link>
                          )}
                          {windowStatus !== "closed" && !entry.is_opted_out && (
                            <button
                              onClick={() => handleOptOut(entry.id)}
                              className="touch-target active-push rounded-md px-3 py-1 text-xs font-medium"
                              style={{ color: "var(--destructive)" }}
                            >
                              Opt Out
                            </button>
                          )}
                          {windowStatus !== "closed" && entry.is_opted_out && (
                            <button
                              onClick={() => handleRemoveOptOut(entry.id)}
                              disabled={isPending}
                              className="touch-target active-push rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
                              style={{
                                background: "var(--naplan-strong-bg)",
                                color: "var(--naplan-strong)",
                              }}
                            >
                              Re-include
                            </button>
                          )}
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
