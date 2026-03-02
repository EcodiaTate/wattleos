"use client";

// src/components/domain/cosmic-education/cosmic-unit-list-client.tsx
//
// Filterable list of all cosmic units.

import { useState } from "react";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { CosmicUnitSummary, CosmicUnitStatus, CosmicGreatLesson } from "@/types/domain";
import {
  CosmicUnitStatusBadge,
  GreatLessonChip,
  CosmicCompletionBar,
  getLessonConfig,
} from "./cosmic-status-badge";

type StatusFilter = CosmicUnitStatus | 'all';

const LESSON_KEYS: CosmicGreatLesson[] = [
  'story_of_universe', 'story_of_life', 'story_of_humans',
  'story_of_communication', 'story_of_numbers', 'custom',
];

interface Props {
  units: CosmicUnitSummary[];
  canManage: boolean;
  defaultStatus?: StatusFilter;
  defaultLesson?: CosmicGreatLesson | null;
}

export function CosmicUnitListClient({ units, canManage, defaultStatus = 'all', defaultLesson = null }: Props) {
  const haptics = useHaptics();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultStatus);
  const [lessonFilter, setLessonFilter] = useState<CosmicGreatLesson | 'all'>(defaultLesson ?? 'all');
  const [search, setSearch] = useState("");

  const filtered = units.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (lessonFilter !== 'all' && u.lesson_key !== lessonFilter) return false;
    if (search && !u.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 p-4 md:p-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
          All Units ({units.length})
        </h1>
        {canManage && (
          <Link
            href="/pedagogy/cosmic-education/units/new"
            onClick={() => haptics.impact("medium")}
            className="touch-target active-push inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + New Unit
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm outline-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
          placeholder="Search units…"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-1.5 rounded-lg border border-border text-sm outline-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={lessonFilter}
          onChange={e => setLessonFilter(e.target.value as CosmicGreatLesson | 'all')}
          className="px-3 py-1.5 rounded-lg border border-border text-sm outline-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="all">All lessons</option>
          {LESSON_KEYS.map(k => {
            const cfg = getLessonConfig(k);
            return <option key={k} value={k}>{cfg.emoji} {cfg.label}</option>;
          })}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--muted-foreground)" }}>
          No units match your filters.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(unit => {
            const cfg = getLessonConfig(unit.lesson_key);
            return (
              <Link
                key={unit.id}
                href={`/pedagogy/cosmic-education/units/${unit.id}`}
                onClick={() => haptics.impact("light")}
                className="card-interactive flex items-center gap-4 p-4 rounded-xl border border-border"
                style={{ background: "var(--card)" }}
              >
                <span className="text-2xl shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {unit.title}
                    </p>
                    <CosmicUnitStatusBadge status={unit.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span>{unit.participant_count} students</span>
                    <span>·</span>
                    <span>{unit.study_count} studies</span>
                  </div>
                  {unit.participant_count > 0 && (
                    <CosmicCompletionBar pct={unit.completion_pct} />
                  )}
                </div>
                <GreatLessonChip lessonKey={unit.lesson_key} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
