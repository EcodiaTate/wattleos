"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudentNormalizationCard } from "./student-normalization-card";
import { IndicatorBar } from "./indicator-bar";
import { ALL_INDICATORS, WORK_CYCLE_ENGAGEMENT_CONFIG } from "@/lib/constants/normalization";
import type { NormalizationDashboardData, WorkCycleEngagement } from "@/types/domain";

interface NormalizationDashboardClientProps {
  initialData: NormalizationDashboardData;
  classes: Array<{ id: string; name: string }>;
  selectedClassId: string | null;
  canManage: boolean;
}

export function NormalizationDashboardClient({
  initialData,
  classes,
  selectedClassId,
  canManage,
}: NormalizationDashboardClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const data = initialData;

  const filteredStudents = data.students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.student_first_name.toLowerCase().includes(q) ||
      s.student_last_name.toLowerCase().includes(q) ||
      (s.student_preferred_name?.toLowerCase().includes(q) ?? false)
    );
  });

  // Sort: students without observations first (need attention), then by avg rating ascending
  const sorted = [...filteredStudents].sort((a, b) => {
    if (!a.latest_observation && b.latest_observation) return -1;
    if (a.latest_observation && !b.latest_observation) return 1;
    return (a.avg_rating ?? 0) - (b.avg_rating ?? 0);
  });

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Normalization Indicators
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Track concentration, independence, order, coordination, and social harmony
          </p>
        </div>
        {canManage && (
          <Link
            href="/pedagogy/normalization/observe"
            className="active-push touch-target inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Record Observation
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {classes.length > 1 && (
          <select
            value={selectedClassId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              startTransition(() => {
                router.push(val ? `/pedagogy/normalization?class=${val}` : "/pedagogy/normalization");
              });
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm flex-1"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-3" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Observations (90d)
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {data.total_observations_this_term}
          </p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Observed
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {data.students_with_observations}
            <span className="text-sm font-normal" style={{ color: "var(--muted-foreground)" }}>
              /{data.students_with_observations + data.students_without_observations}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Joyful Engagement
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {data.total_observations_this_term > 0
              ? Math.round((data.joyful_count / data.total_observations_this_term) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="rounded-xl border border-border p-3" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
            Engagement
          </p>
          <div className="flex gap-1">
            {(["deep", "moderate", "surface", "disengaged"] as WorkCycleEngagement[]).map((eng) => {
              const count = data.engagement_distribution[eng] ?? 0;
              const total = data.total_observations_this_term || 1;
              return (
                <div
                  key={eng}
                  className="flex-1 rounded text-center py-0.5"
                  style={{
                    backgroundColor: `var(${WORK_CYCLE_ENGAGEMENT_CONFIG[eng].cssVar}-bg)`,
                    color: `var(${WORK_CYCLE_ENGAGEMENT_CONFIG[eng].cssVar}-fg)`,
                  }}
                  title={`${WORK_CYCLE_ENGAGEMENT_CONFIG[eng].label}: ${count} (${Math.round((count / total) * 100)}%)`}
                >
                  <span className="text-xs font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class indicator averages */}
      {data.total_observations_this_term > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Class Averages
          </p>
          <div className="space-y-2">
            {ALL_INDICATORS.map((ind) => (
              <IndicatorBar key={ind} indicator={ind} rating={data.class_averages[ind]} />
            ))}
          </div>
        </div>
      )}

      {/* Student grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-2" style={{ color: "var(--empty-state-icon)" }}>🧘</div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            No students found
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {search ? "Try adjusting your search" : "Enroll students to begin tracking normalization"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((s) => (
            <StudentNormalizationCard key={s.student_id} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
}
