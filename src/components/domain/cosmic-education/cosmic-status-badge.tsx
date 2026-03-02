"use client";

// src/components/domain/cosmic-education/cosmic-status-badge.tsx

import type { CosmicUnitStatus, CosmicStudyStatus, CosmicStudyArea, CosmicGreatLesson } from "@/types/domain";

// ── Unit Status Badge ─────────────────────────────────────────

const UNIT_STATUS_CONFIG: Record<CosmicUnitStatus, { label: string; var: string; fgVar: string; bgVar: string }> = {
  draft:     { label: "Draft",     var: "--cosmic-draft",     fgVar: "--cosmic-draft-fg",     bgVar: "--cosmic-draft-bg" },
  active:    { label: "Active",    var: "--cosmic-active",    fgVar: "--cosmic-active-fg",    bgVar: "--cosmic-active-bg" },
  completed: { label: "Completed", var: "--cosmic-completed", fgVar: "--cosmic-completed-fg", bgVar: "--cosmic-completed-bg" },
  archived:  { label: "Archived",  var: "--cosmic-archived",  fgVar: "--cosmic-archived-fg",  bgVar: "--cosmic-archived-bg" },
};

export function CosmicUnitStatusBadge({ status }: { status: CosmicUnitStatus }) {
  const cfg = UNIT_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: `var(${cfg.fgVar})`, background: `var(${cfg.bgVar})` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Study Record Status Badge ─────────────────────────────────

const STUDY_STATUS_CONFIG: Record<CosmicStudyStatus, { label: string; fgVar: string; bgVar: string }> = {
  introduced: { label: "Introduced", fgVar: "--cosmic-introduced-fg", bgVar: "--cosmic-introduced-bg" },
  exploring:  { label: "Exploring",  fgVar: "--cosmic-exploring-fg",  bgVar: "--cosmic-exploring-bg" },
  presenting: { label: "Presenting", fgVar: "--cosmic-presenting-fg", bgVar: "--cosmic-presenting-bg" },
  completed:  { label: "Completed",  fgVar: "--cosmic-record-completed-fg", bgVar: "--cosmic-record-completed-bg" },
};

export function CosmicStudyStatusBadge({ status }: { status: CosmicStudyStatus }) {
  const cfg = STUDY_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: `var(${cfg.fgVar})`, background: `var(${cfg.bgVar})` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Study Area Chip ───────────────────────────────────────────

const AREA_CONFIG: Record<CosmicStudyArea, { label: string; accentVar: string }> = {
  history:        { label: "History",        accentVar: "--cosmic-area-history" },
  geography:      { label: "Geography",      accentVar: "--cosmic-area-geography" },
  biology:        { label: "Biology",        accentVar: "--cosmic-area-biology" },
  physics:        { label: "Physics",        accentVar: "--cosmic-area-physics" },
  astronomy:      { label: "Astronomy",      accentVar: "--cosmic-area-astronomy" },
  mathematics:    { label: "Mathematics",    accentVar: "--cosmic-area-mathematics" },
  language_arts:  { label: "Language Arts",  accentVar: "--cosmic-area-language-arts" },
  art_music:      { label: "Art & Music",    accentVar: "--cosmic-area-art-music" },
  culture_society:{ label: "Culture",        accentVar: "--cosmic-area-culture" },
  economics:      { label: "Economics",      accentVar: "--cosmic-area-economics" },
  integrated:     { label: "Integrated",     accentVar: "--cosmic-area-integrated" },
};

export function CosmicStudyAreaChip({ area }: { area: CosmicStudyArea }) {
  const cfg = AREA_CONFIG[area];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        color: `var(${cfg.accentVar})`,
        borderColor: `var(${cfg.accentVar})`,
        background: "transparent",
      }}
    >
      {cfg.label}
    </span>
  );
}

export function getStudyAreaLabel(area: CosmicStudyArea): string {
  return AREA_CONFIG[area]?.label ?? area;
}

// ── Great Lesson Chip ─────────────────────────────────────────

const LESSON_CONFIG: Record<CosmicGreatLesson, { label: string; accentVar: string; emoji: string }> = {
  story_of_universe:       { label: "Universe",       accentVar: "--cosmic-lesson-universe",       emoji: "🌌" },
  story_of_life:           { label: "Life",            accentVar: "--cosmic-lesson-life",           emoji: "🦕" },
  story_of_humans:         { label: "Humans",          accentVar: "--cosmic-lesson-humans",         emoji: "🧑‍🤝‍🧑" },
  story_of_communication:  { label: "Communication",   accentVar: "--cosmic-lesson-communication",  emoji: "✍️" },
  story_of_numbers:        { label: "Numbers",         accentVar: "--cosmic-lesson-numbers",        emoji: "🔢" },
  custom:                  { label: "Custom",          accentVar: "--cosmic-lesson-custom",         emoji: "⭐" },
};

export function getLessonConfig(key: CosmicGreatLesson) {
  return LESSON_CONFIG[key] ?? LESSON_CONFIG.custom;
}

export function GreatLessonChip({ lessonKey }: { lessonKey: CosmicGreatLesson }) {
  const cfg = getLessonConfig(lessonKey);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
      style={{ color: `var(${cfg.accentVar})`, borderColor: `var(${cfg.accentVar})` }}
    >
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}

// ── Completion Progress Bar ───────────────────────────────────

export function CosmicCompletionBar({
  pct,
  label,
}: {
  pct: number;
  label?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 80
              ? "var(--cosmic-completed)"
              : pct >= 40
                ? "var(--cosmic-active)"
                : "var(--cosmic-draft)",
          }}
        />
      </div>
    </div>
  );
}
