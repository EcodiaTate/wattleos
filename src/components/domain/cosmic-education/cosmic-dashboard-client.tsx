"use client";

// src/components/domain/cosmic-education/cosmic-dashboard-client.tsx
//
// Main dashboard: active units by Great Lesson, summary stats,
// and quick-access to draft / completed units.

import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { CosmicEducationDashboardData, CosmicGreatLesson, CosmicUnitSummary } from "@/types/domain";
import {
  CosmicUnitStatusBadge,
  CosmicCompletionBar,
  GreatLessonChip,
  getLessonConfig,
} from "./cosmic-status-badge";

const LESSON_ORDER: CosmicGreatLesson[] = [
  'story_of_universe',
  'story_of_life',
  'story_of_humans',
  'story_of_communication',
  'story_of_numbers',
  'custom',
];

interface Props {
  data: CosmicEducationDashboardData;
  canManage: boolean;
}

function UnitCard({ unit }: { unit: CosmicUnitSummary }) {
  const haptics = useHaptics();
  const cfg = getLessonConfig(unit.lesson_key);

  return (
    <Link
      href={`/pedagogy/cosmic-education/units/${unit.id}`}
      onClick={() => haptics.impact("light")}
      className="card-interactive block p-4 rounded-xl border border-border space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
            {unit.title}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {cfg.emoji} {unit.great_lesson_title}
          </p>
        </div>
        <CosmicUnitStatusBadge status={unit.status} />
      </div>

      <CosmicCompletionBar pct={unit.completion_pct} />

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span>{unit.participant_count} students</span>
        <span>·</span>
        <span>{unit.study_count} studies</span>
        {unit.planned_start && (
          <>
            <span>·</span>
            <span>{unit.planned_start}</span>
          </>
        )}
      </div>
    </Link>
  );
}

export function CosmicEducationDashboardClient({ data, canManage }: Props) {
  const haptics = useHaptics();

  const hasAnyUnits = data.total_units > 0;

  return (
    <div className="space-y-8 p-4 md:p-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Cosmic Education
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Great Lessons and integrated cultural study units for 6–12 programmes
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/pedagogy/cosmic-education/units/new"
              onClick={() => haptics.impact("medium")}
              className="touch-target active-push inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              + New Unit
            </Link>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Units",    value: data.total_units },
          { label: "Active",         value: data.active_count },
          { label: "Completed",      value: data.completed_count },
          { label: "Draft",          value: data.draft_units.length },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl border border-border p-4 space-y-1"
            style={{ background: "var(--card)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {stat.value}
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Great Lesson coverage tiles */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Great Lessons Coverage
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {LESSON_ORDER.map(key => {
            const cfg = getLessonConfig(key);
            const count = data.units_by_lesson[key] ?? 0;
            return (
              <Link
                key={key}
                href={`/pedagogy/cosmic-education/units?lesson=${key}`}
                onClick={() => haptics.impact("light")}
                className="card-interactive flex flex-col items-center gap-1 p-3 rounded-xl border border-border text-center"
                style={{ background: count > 0 ? `color-mix(in srgb, var(${cfg.accentVar}) 8%, transparent)` : "var(--card)" } as React.CSSProperties & Record<string, string>}
              >
                <span className="text-2xl">{cfg.emoji}</span>
                <span className="text-xs font-medium" style={{ color: `var(${cfg.accentVar})` }}>
                  {cfg.label}
                </span>
                <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                  {count}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {count === 1 ? "unit" : "units"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Active units */}
      {data.active_units.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Active Units ({data.active_units.length})
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.active_units.map(unit => <UnitCard key={unit.id} unit={unit} />)}
          </div>
        </section>
      )}

      {/* Draft units */}
      {data.draft_units.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              In Planning ({data.draft_units.length})
            </h2>
            <Link
              href="/pedagogy/cosmic-education/units?status=draft"
              className="text-xs"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.draft_units.slice(0, 3).map(unit => <UnitCard key={unit.id} unit={unit} />)}
          </div>
        </section>
      )}

      {/* Completed units */}
      {data.completed_units.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Completed ({data.completed_units.length})
            </h2>
            <Link
              href="/pedagogy/cosmic-education/units?status=completed"
              className="text-xs"
              style={{ color: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.completed_units.slice(0, 3).map(unit => <UnitCard key={unit.id} unit={unit} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!hasAnyUnits && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl" style={{ color: "var(--empty-state-icon)" }}>🌌</span>
          <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            No units yet
          </h3>
          <p className="text-sm max-w-xs" style={{ color: "var(--muted-foreground)" }}>
            Create your first cosmic education unit plan, linked to one of the five Great Lessons.
          </p>
          {canManage && (
            <Link
              href="/pedagogy/cosmic-education/units/new"
              onClick={() => haptics.impact("medium")}
              className="touch-target active-push inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              + Create First Unit
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
