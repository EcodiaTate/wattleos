"use client";

// src/components/domain/three-year-cycle/class-cycle-heatmap.tsx
//
// Class-wide longitudinal heatmap - each student = one row,
// each Montessori area = one cell coloured by mastery level.

import Link from "next/link";
import { useState } from "react";
import type {
  ClassCycleReport,
  CycleAreaMastery,
  MontessoriArea,
} from "@/types/domain";

const AREAS: MontessoriArea[] = [
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
];

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREA_EMOJIS: Record<MontessoriArea, string> = {
  practical_life: "🧹",
  sensorial: "👁️",
  language: "🔤",
  mathematics: "🔢",
  cultural: "🌍",
};

// Generates a CSS background for a given mastery pct using a
// gradient from muted → primary
function masteryBg(level: CycleAreaMastery): string {
  const map: Record<CycleAreaMastery, string> = {
    not_started: "var(--muted)",
    beginning: "color-mix(in srgb, var(--primary) 12%, var(--muted))",
    developing: "color-mix(in srgb, var(--primary) 30%, var(--muted))",
    consolidating: "color-mix(in srgb, var(--primary) 60%, var(--muted))",
    advanced: "var(--primary)",
  };
  return map[level];
}

function masteryFg(level: CycleAreaMastery): string {
  if (level === "advanced") return "var(--primary-foreground)";
  return "var(--foreground)";
}

const AGE_BAND_LABELS: Record<string, string> = {
  "0_3": "0–3 yrs",
  "3_6": "3–6 yrs",
  "6_9": "6–9 yrs",
  "9_12": "9–12 yrs",
};

interface ClassCycleHeatmapProps {
  report: ClassCycleReport;
  classes: Array<{ id: string; name: string }>;
  selectedClassId: string | null;
}

export function ClassCycleHeatmap({
  report,
  classes,
  selectedClassId,
}: ClassCycleHeatmapProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "mastery">("name");

  const filtered = report.students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (s.preferred_name ?? s.student_name).toLowerCase();
    return name.includes(q) || s.student_name.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "mastery")
      return b.overall_mastery_pct - a.overall_mastery_pct;
    return a.student_name.localeCompare(b.student_name);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Three-Year Cycle Progress
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Longitudinal mastery across the Montessori curriculum band
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Class filter */}
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={selectedClassId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            const url = val
              ? `/pedagogy/three-year-cycle?class=${val}`
              : "/pedagogy/three-year-cycle";
            window.location.href = url;
          }}
          style={{ color: "var(--foreground)" }}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          type="search"
          placeholder="Search student…"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm flex-1 min-w-48"
          style={{ color: "var(--foreground)" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Sort */}
        <select
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as "name" | "mastery")}
          style={{ color: "var(--foreground)" }}
        >
          <option value="name">Sort: A → Z</option>
          <option value="mastery">Sort: Most advanced</option>
        </select>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-xs"
        style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}
      >
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          Mastery:
        </span>
        {(
          [
            "not_started",
            "beginning",
            "developing",
            "consolidating",
            "advanced",
          ] as CycleAreaMastery[]
        ).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: 3,
                background: masteryBg(level),
                border: "1px solid var(--border)",
              }}
            />
            <span className="capitalize">{level.replace("_", " ")}</span>
          </span>
        ))}
      </div>

      {/* Heatmap table */}
      {sorted.length === 0 ? (
        <div
          className="rounded-lg border border-border p-12 text-center"
          style={{ color: "var(--muted-foreground)" }}
        >
          {search ? "No students match your search." : "No students enrolled."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th
                  className="px-4 py-2.5 text-left font-medium"
                  style={{ color: "var(--muted-foreground)", minWidth: 180 }}
                >
                  Student
                </th>
                <th
                  className="px-3 py-2.5 text-center font-medium"
                  style={{ color: "var(--muted-foreground)", minWidth: 64 }}
                >
                  Band
                </th>
                {AREAS.map((area) => (
                  <th
                    key={area}
                    className="px-3 py-2.5 text-center font-medium"
                    style={{
                      color: "var(--muted-foreground)",
                      minWidth: 110,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {AREA_EMOJIS[area]} {AREA_LABELS[area]}
                  </th>
                ))}
                <th
                  className="px-3 py-2.5 text-center font-medium"
                  style={{ color: "var(--muted-foreground)", minWidth: 90 }}
                >
                  Overall
                </th>
                <th className="px-3 py-2.5" style={{ minWidth: 48 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.student_id}
                  style={{
                    borderBottom:
                      i < sorted.length - 1
                        ? "1px solid var(--border)"
                        : undefined,
                    background:
                      i % 2 === 0 ? "var(--background)" : "var(--muted)",
                  }}
                >
                  {/* Student name */}
                  <td className="px-4 py-2.5">
                    <div
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {row.preferred_name
                        ? `${row.student_name.split(" ")[0]} "${row.preferred_name}" ${row.student_name.split(" ").slice(1).join(" ")}`
                        : row.student_name}
                    </div>
                  </td>

                  {/* Age band */}
                  <td
                    className="px-3 py-2.5 text-center"
                    style={{ color: "var(--muted-foreground)", fontSize: 11 }}
                  >
                    {AGE_BAND_LABELS[row.age_band] ?? row.age_band}
                  </td>

                  {/* Area cells */}
                  {AREAS.map((area) => {
                    const summary = row.area_summaries.find(
                      (s) => s.area === area,
                    );
                    if (!summary) {
                      return (
                        <td
                          key={area}
                          className="px-3 py-2.5 text-center"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={area} className="px-2 py-1.5">
                        <div
                          style={{
                            borderRadius: 6,
                            padding: "4px 8px",
                            textAlign: "center",
                            background: masteryBg(summary.mastery_level),
                            color: masteryFg(summary.mastery_level),
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {summary.mastery_pct}%
                          <div style={{ fontSize: 10, opacity: 0.75 }}>
                            {summary.mastered}/{summary.total_materials}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Overall */}
                  <td className="px-3 py-2.5 text-center">
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color:
                          row.overall_mastery_pct >= 75
                            ? "var(--primary)"
                            : row.overall_mastery_pct >= 25
                              ? "var(--foreground)"
                              : "var(--muted-foreground)",
                      }}
                    >
                      {row.overall_mastery_pct}%
                    </div>
                  </td>

                  {/* Detail link */}
                  <td className="px-3 py-2.5 text-center">
                    <Link
                      href={`/pedagogy/three-year-cycle/${row.student_id}`}
                      className="touch-target active-push"
                      style={{
                        fontSize: 12,
                        color: "var(--primary)",
                        textDecoration: "none",
                        padding: "4px 8px",
                        borderRadius: 6,
                        display: "inline-block",
                      }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer summary */}
      {sorted.length > 0 && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {sorted.length} student{sorted.length !== 1 ? "s" : ""} · generated{" "}
          {new Date(report.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
