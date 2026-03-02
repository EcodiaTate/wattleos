"use client";

// src/components/domain/lessons/sensitive-periods-overview-client.tsx
// ============================================================
// Shows all active sensitive periods across students.
// Grouped by student with intensity badges and material links.
// ============================================================

import Link from "next/link";
import { useState } from "react";

import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  MontessoriSensitivePeriod,
  SensitivePeriodIntensity,
  StudentSensitivePeriodWithDetails,
} from "@/types/domain";

import { SensitivePeriodBadge } from "./three-period-status-badge";

// ── Constants ────────────────────────────────────────────────

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

const INTENSITY_ORDER: SensitivePeriodIntensity[] = [
  "peak",
  "active",
  "emerging",
  "waning",
];

// ── Props ────────────────────────────────────────────────────

interface SensitivePeriodsOverviewClientProps {
  activePeriods: StudentSensitivePeriodWithDetails[];
}

// ── Component ────────────────────────────────────────────────

export function SensitivePeriodsOverviewClient({
  activePeriods,
}: SensitivePeriodsOverviewClientProps) {
  const haptics = useHaptics();
  const [intensityFilter, setIntensityFilter] = useState<SensitivePeriodIntensity | "all">("all");
  const [search, setSearch] = useState("");

  const intensities: (SensitivePeriodIntensity | "all")[] = [
    "all",
    "peak",
    "active",
    "emerging",
    "waning",
  ];

  const filtered = activePeriods
    .filter((p) => {
      if (intensityFilter !== "all" && p.intensity !== intensityFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${p.student.first_name} ${p.student.last_name}`.toLowerCase();
        const period = PERIOD_LABELS[p.sensitive_period].toLowerCase();
        return name.includes(q) || period.includes(q);
      }
      return true;
    })
    .sort(
      (a, b) =>
        INTENSITY_ORDER.indexOf(a.intensity) -
        INTENSITY_ORDER.indexOf(b.intensity),
    );

  // Group by student
  const byStudent = new Map<
    string,
    { student: StudentSensitivePeriodWithDetails["student"]; periods: StudentSensitivePeriodWithDetails[] }
  >();
  for (const p of filtered) {
    const sid = p.student_id;
    if (!byStudent.has(sid)) {
      byStudent.set(sid, { student: p.student, periods: [] });
    }
    byStudent.get(sid)!.periods.push(p);
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {intensities.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setIntensityFilter(i);
              haptics.light();
            }}
            className="active-push rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              intensityFilter === i
                ? {
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }
                : {
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }
            }
          >
            {i === "all" ? "All intensities" : i.charAt(0).toUpperCase() + i.slice(1)}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search by student or period…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm"
        style={{ color: "var(--foreground)" }}
      />

      {byStudent.size === 0 ? (
        <div
          className="py-16 text-center"
          style={{ color: "var(--empty-state-icon)" }}
        >
          <div className="text-4xl">🌿</div>
          <p className="mt-3 text-base font-medium" style={{ color: "var(--foreground)" }}>
            No active sensitive periods
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Record a sensitive period from a student's 3PL page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(byStudent.values()).map(({ student, periods }) => (
            <div
              key={student.id}
              className="rounded-xl border border-border p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Link
                  href={`/pedagogy/sensitive-periods/${student.id}`}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--foreground)" }}
                  onClick={() => haptics.light()}
                >
                  {student.first_name} {student.last_name}
                </Link>
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {periods.length} period{periods.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {periods.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pedagogy/sensitive-periods/${student.id}?edit=${p.id}`}
                    className="card-interactive flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                    onClick={() => haptics.light()}
                  >
                    <span>{PERIOD_EMOJI[p.sensitive_period]}</span>
                    <div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {PERIOD_LABELS[p.sensitive_period]}
                      </p>
                      <SensitivePeriodBadge
                        intensity={p.intensity}
                        size="sm"
                      />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Suggested materials preview */}
              {periods.some((p) => p.suggested_materials.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {periods
                    .flatMap((p) => p.suggested_materials)
                    .slice(0, 4)
                    .map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: "var(--muted)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {m.name}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
