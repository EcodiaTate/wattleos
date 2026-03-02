"use client";

// src/components/domain/lessons/three-period-dashboard-client.tsx
// ============================================================
// Dashboard overview for the Three-Period Lesson tracker.
// Shows stats and links to per-student views.
// ============================================================

import Link from "next/link";
import { useState } from "react";

import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  MontessoriArea,
  Student,
  ThreePeriodDashboardData,
} from "@/types/domain";

const AREA_EMOJI: Record<MontessoriArea, string> = {
  practical_life: "🧹",
  sensorial: "✨",
  language: "🔤",
  mathematics: "🔢",
  cultural: "🌍",
};

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREAS: MontessoriArea[] = [
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
];

interface ThreePeriodDashboardClientProps {
  dashboard: ThreePeriodDashboardData;
  students: Pick<Student, "id" | "first_name" | "last_name">[];
}

// ── Stat tile ────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-2xl font-bold" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--foreground)" }}>
        {label}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function ThreePeriodDashboardClient({
  dashboard,
  students,
}: ThreePeriodDashboardClientProps) {
  const haptics = useHaptics();
  const [studentSearch, setStudentSearch] = useState("");

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      !q ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Students with lessons"
          value={dashboard.total_students_with_lessons}
        />
        <StatTile
          label="Total lessons"
          value={dashboard.total_lessons}
          sub={`${dashboard.lessons_this_week} this week`}
        />
        <StatTile
          label="Materials in progress"
          value={dashboard.materials_in_progress}
          color="var(--primary)"
        />
        <StatTile
          label="Materials complete"
          value={dashboard.materials_complete}
          color="var(--3pl-completed)"
        />
      </div>

      {/* Active sensitive periods banner */}
      {dashboard.active_sensitive_periods > 0 && (
        <Link
          href="/pedagogy/sensitive-periods"
          className="card-interactive flex items-center justify-between rounded-xl border border-border p-4"
          onClick={() => haptics.light()}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                {dashboard.active_sensitive_periods} active sensitive period
                {dashboard.active_sensitive_periods !== 1 ? "s" : ""}
              </p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Tap to view and manage
              </p>
            </div>
          </div>
          <span style={{ color: "var(--muted-foreground)" }}>→</span>
        </Link>
      )}

      {/* Per-area breakdown */}
      <div>
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          By area
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {AREAS.map((area) => {
            const aData = dashboard.by_area[area];
            return (
              <div
                key={area}
                className="rounded-xl border border-border p-3 text-center"
              >
                <div className="text-xl">{AREA_EMOJI[area]}</div>
                <div
                  className="mt-1 text-xs font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {AREA_LABELS[area]}
                </div>
                <div className="mt-2 space-y-0.5">
                  <div
                    className="text-xs"
                    style={{ color: "var(--3pl-completed)" }}
                  >
                    {aData.complete} complete
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--primary)" }}
                  >
                    {aData.in_progress} in progress
                  </div>
                  {aData.needs_repeat > 0 && (
                    <div
                      className="text-xs"
                      style={{ color: "var(--3pl-needs-repeat)" }}
                    >
                      {aData.needs_repeat} need repeat
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student list */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Students
          </h2>
          <Link
            href="/pedagogy/three-period-lessons/record"
            className="active-push touch-target rounded-xl px-4 py-2 text-xs font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={() => haptics.medium()}
          >
            + Record lesson
          </Link>
        </div>

        <input
          type="search"
          placeholder="Search students…"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="mb-3 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm"
          style={{ color: "var(--foreground)" }}
        />

        {filteredStudents.length === 0 ? (
          <div className="py-10 text-center" style={{ color: "var(--empty-state-icon)" }}>
            <div className="text-3xl">🔢</div>
            <p className="mt-2 text-sm">
              {studentSearch ? "No students match your search" : "No students yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((s) => (
              <Link
                key={s.id}
                href={`/pedagogy/three-period-lessons/${s.id}`}
                className="card-interactive flex items-center justify-between rounded-xl border border-border p-4"
                onClick={() => haptics.light()}
              >
                <div
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {s.first_name} {s.last_name}
                </div>
                <span style={{ color: "var(--muted-foreground)" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
