"use client";

// src/components/domain/naplan/naplan-results-grid-client.tsx
//
// Results grid - all non-opted-out students with domain completion status.
// Clicking a student opens the per-student results entry page.

import Link from "next/link";
import { useState } from "react";

import { NaplanProficiencyBadge } from "./naplan-proficiency-badge";
import { NAPLAN_DOMAIN_CONFIG, NAPLAN_DOMAINS } from "@/lib/constants/naplan";
import type {
  NaplanCohortEntryWithStudent,
  NaplanDomain,
  NaplanDomainResult,
  NaplanWindowStatus,
  NaplanYearLevel,
} from "@/types/domain";

interface NaplanResultsGridClientProps {
  windowId: string;
  windowStatus: NaplanWindowStatus;
  cohort: NaplanCohortEntryWithStudent[];
  canManage: boolean;
}

export function NaplanResultsGridClient({
  windowId,
  windowStatus,
  cohort,
  canManage,
}: NaplanResultsGridClientProps) {
  const [yearFilter, setYearFilter] = useState<NaplanYearLevel | "all">("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [search, setSearch] = useState("");

  const activeStudents = cohort.filter((e) => !e.is_opted_out);

  const filtered = activeStudents.filter((e) => {
    if (yearFilter !== "all" && e.year_level !== yearFilter) return false;
    if (pendingOnly && e.results_count >= NAPLAN_DOMAINS.length) return false;
    if (search) {
      const q = search.toLowerCase();
      const fullName =
        `${e.student.first_name} ${e.student.last_name}`.toLowerCase();
      if (!fullName.includes(q)) return false;
    }
    return true;
  });

  if (activeStudents.length === 0) {
    return (
      <div
        className="rounded-xl border border-border p-8 text-center text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        No active students in the cohort. Go to the cohort tab to generate the
        cohort first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border border-border p-1"
            style={{ background: "var(--card)" }}
          >
            {(["all", 3, 5, 7, 9] as const).map((yl) => (
              <button
                key={yl}
                onClick={() => setYearFilter(yl)}
                className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                style={
                  yearFilter === yl
                    ? {
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {yl === "all" ? "All" : `Yr ${yl}`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPendingOnly((v) => !v)}
            className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
            style={
              pendingOnly
                ? {
                    background: "var(--naplan-developing-bg)",
                    color: "var(--naplan-developing)",
                    borderColor: "var(--naplan-developing)",
                  }
                : {
                    background: "var(--card)",
                    color: "var(--muted-foreground)",
                  }
            }
          >
            Pending Only
          </button>
        </div>

        <input
          type="search"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-44 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto rounded-xl border border-border"
        style={{ background: "var(--card)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b border-border text-left text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              <th className="px-4 py-3 whitespace-nowrap">Student</th>
              <th className="px-4 py-3 whitespace-nowrap">Yr</th>
              {NAPLAN_DOMAINS.map((d) => (
                <th key={d} className="px-3 py-3 whitespace-nowrap text-center">
                  {NAPLAN_DOMAIN_CONFIG[d].shortLabel}
                </th>
              ))}
              <th className="px-4 py-3 whitespace-nowrap text-right">Done</th>
              {canManage && windowStatus !== "closed" && (
                <th className="px-4 py-3" />
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No students match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const resultsByDomain = entry.results.reduce(
                  (acc, r) => {
                    acc[r.domain] = r;
                    return acc;
                  },
                  {} as Partial<Record<NaplanDomain, NaplanDomainResult>>,
                );

                const isComplete = entry.results_count >= NAPLAN_DOMAINS.length;

                return (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {entry.student.first_name} {entry.student.last_name}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {entry.year_level}
                    </td>
                    {NAPLAN_DOMAINS.map((d) => {
                      const result = resultsByDomain[d];
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          {result ? (
                            <NaplanProficiencyBadge
                              level={result.proficiency_level}
                              size="sm"
                              showShort
                            />
                          ) : (
                            <span
                              className="inline-block h-4 w-4 rounded-full"
                              style={{ background: "var(--border)" }}
                              title="Not entered"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: isComplete
                            ? "var(--naplan-strong)"
                            : "var(--muted-foreground)",
                        }}
                      >
                        {entry.results_count}/{NAPLAN_DOMAINS.length}
                      </span>
                    </td>
                    {canManage && windowStatus !== "closed" && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/naplan/${windowId}/results/${entry.id}`}
                          className="touch-target active-push rounded-md px-3 py-1 text-xs font-medium border border-border"
                          style={{ color: "var(--foreground)" }}
                        >
                          Enter
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
