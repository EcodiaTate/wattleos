"use client";

// src/components/domain/sensitive-periods/active-periods-dashboard.tsx
// ============================================================
// Class-wide grid: all students with their active sensitive
// periods, linked material counts, and tagged observation count.
// Used by guides to plan work cycles.
// ============================================================

import Link from "next/link";
import { useState } from "react";
import type {
  MontessoriSensitivePeriod,
  SensitivePeriodIntensity,
  StudentSensitivePeriodFull,
} from "@/types/domain";

// ── Types ────────────────────────────────────────────────────

interface StudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  ageLabel: string | null;
  activePeriods: StudentSensitivePeriodFull[];
}

interface ActivePeriodsDashboardProps {
  rows: StudentRow[];
}

// ── Constants ────────────────────────────────────────────────

const PERIOD_EMOJI: Record<MontessoriSensitivePeriod, string> = {
  language: "🗣️",
  order: "📐",
  movement: "🏃",
  small_objects: "🔍",
  music: "🎵",
  social_behavior: "🤝",
  reading: "📖",
  writing: "✏️",
  mathematics: "🔢",
  refinement_of_senses: "👁️",
};

const PERIOD_LABELS: Record<MontessoriSensitivePeriod, string> = {
  language: "Language",
  order: "Order",
  movement: "Movement",
  small_objects: "Small Objects",
  music: "Music",
  social_behavior: "Social Behaviour",
  reading: "Reading",
  writing: "Writing",
  mathematics: "Mathematics",
  refinement_of_senses: "Refinement of Senses",
};

const INTENSITY_DOT: Record<SensitivePeriodIntensity, string> = {
  emerging: "🔵",
  active: "🟢",
  peak: "⭐",
  waning: "🟡",
};

// ── Component ────────────────────────────────────────────────

export function ActivePeriodsDashboard({ rows }: ActivePeriodsDashboardProps) {
  const [search, setSearch] = useState("");
  const [intensityFilter, setIntensityFilter] = useState<
    SensitivePeriodIntensity | "all"
  >("all");

  const filtered = rows.filter((row) => {
    const nameMatch =
      search.trim() === "" ||
      `${row.firstName} ${row.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const intensityMatch =
      intensityFilter === "all" ||
      row.activePeriods.some((p) => p.intensity === intensityFilter);

    return nameMatch && intensityMatch;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
          className="w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="flex gap-2 flex-wrap">
          {(["all", "peak", "active", "emerging", "waning"] as const).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setIntensityFilter(f)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background:
                    intensityFilter === f ? "var(--primary)" : "var(--muted)",
                  color:
                    intensityFilter === f
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="py-12 text-center"
          style={{ color: "var(--muted-foreground)" }}
        >
          <div className="text-3xl">🌿</div>
          <p className="mt-2 text-sm">No students match the current filter.</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--muted)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Student
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Active periods
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Materials
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Obs.
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const totalMaterials = row.activePeriods.reduce(
                  (sum, p) => sum + p.linked_materials.length,
                  0,
                );
                const totalObs = row.activePeriods.reduce(
                  (sum, p) => sum + p.recent_observation_count,
                  0,
                );

                return (
                  <tr
                    key={row.studentId}
                    className="border-t border-border"
                    style={{ background: "var(--card)" }}
                  >
                    {/* Student */}
                    <td className="px-4 py-3">
                      <span
                        className="font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {row.firstName} {row.lastName}
                      </span>
                      {row.ageLabel && (
                        <span
                          className="ml-2 text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {row.ageLabel}
                        </span>
                      )}
                    </td>

                    {/* Active periods */}
                    <td className="px-4 py-3">
                      {row.activePeriods.length === 0 ? (
                        <span
                          className="text-xs italic"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          None
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.activePeriods.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                              style={{
                                background: "var(--muted)",
                                color: "var(--foreground)",
                              }}
                              title={`${PERIOD_LABELS[p.sensitive_period]} - ${p.intensity}`}
                            >
                              {INTENSITY_DOT[p.intensity]}
                              {PERIOD_EMOJI[p.sensitive_period]}
                              <span className="hidden sm:inline">
                                {PERIOD_LABELS[p.sensitive_period]}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Material count */}
                    <td className="px-4 py-3 text-center">
                      <span
                        style={{
                          color:
                            totalMaterials > 0
                              ? "var(--foreground)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {totalMaterials}
                      </span>
                    </td>

                    {/* Obs count */}
                    <td className="px-4 py-3 text-center">
                      <span
                        style={{
                          color:
                            totalObs > 0
                              ? "var(--foreground)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {totalObs}
                      </span>
                    </td>

                    {/* Link */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/pedagogy/sensitive-periods/${row.studentId}`}
                        className="text-xs font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div
        className="flex flex-wrap gap-3 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>⭐ Peak</span>
        <span>🟢 Active</span>
        <span>🔵 Emerging</span>
        <span>🟡 Waning</span>
      </div>
    </div>
  );
}
