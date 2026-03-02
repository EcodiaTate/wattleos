"use client";

// src/components/domain/sensitive-periods/observation-period-tagger.tsx
// ============================================================
// Shown during observation creation when students are tagged.
// Lists each selected student's active sensitive periods as
// optional checkboxes. Selected IDs are passed back to the
// parent form to be saved via tagObservationWithSensitivePeriods.
// ============================================================

import type { MontessoriSensitivePeriod, SensitivePeriodIntensity } from "@/types/domain";

// ── Types ────────────────────────────────────────────────────

export interface ActivePeriodOption {
  id: string;
  studentId: string;
  studentName: string;
  sensitivePeriod: MontessoriSensitivePeriod;
  intensity: SensitivePeriodIntensity;
}

interface ObservationPeriodTaggerProps {
  activePeriods: ActivePeriodOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

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

const INTENSITY_LABEL: Record<SensitivePeriodIntensity, string> = {
  emerging: "Emerging",
  active: "Active",
  peak: "Peak",
  waning: "Waning",
};

// ── Component ────────────────────────────────────────────────

export function ObservationPeriodTagger({
  activePeriods,
  selectedIds,
  onChange,
}: ObservationPeriodTaggerProps) {
  if (activePeriods.length === 0) return null;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  // Group by student for display
  const byStudent = new Map<string, { name: string; periods: ActivePeriodOption[] }>();
  for (const p of activePeriods) {
    if (!byStudent.has(p.studentId)) {
      byStudent.set(p.studentId, { name: p.studentName, periods: [] });
    }
    byStudent.get(p.studentId)!.periods.push(p);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
        Tag active sensitive periods
        <span className="ml-1 text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>
          (optional)
        </span>
      </p>

      {Array.from(byStudent.entries()).map(([studentId, { name, periods }]) => (
        <div key={studentId}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            {name}
          </p>
          <div className="space-y-1.5">
            {periods.map((p) => {
              const isChecked = selectedIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  style={{
                    background: isChecked ? "var(--primary)" : "var(--muted)",
                    opacity: 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-border accent-primary-foreground"
                  />
                  <span className="text-base">{PERIOD_EMOJI[p.sensitivePeriod]}</span>
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: isChecked ? "var(--primary-foreground)" : "var(--foreground)" }}
                  >
                    {PERIOD_LABELS[p.sensitivePeriod]}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: isChecked ? "var(--primary-foreground)" : "var(--muted-foreground)", opacity: isChecked ? 0.85 : 1 }}
                  >
                    {INTENSITY_LABEL[p.intensity]}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
