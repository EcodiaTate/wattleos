// src/components/domain/materials/student-introductions-list.tsx
"use client";

import type { MaterialStudentIntroduction } from "@/types/domain";

const STAGE_LABELS: Record<string, string> = {
  introduction: "Introduced",
  practice:     "Practising",
  mastery:      "Mastered",
};

const STAGE_COLORS: Record<string, string> = {
  introduction: "var(--mastery-presented-fg)",
  practice:     "var(--mastery-practicing-fg)",
  mastery:      "var(--mastery-mastered-fg)",
};

interface StudentIntroductionsListProps {
  introductions: MaterialStudentIntroduction[];
}

export function StudentIntroductionsList({ introductions }: StudentIntroductionsListProps) {
  if (introductions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p style={{ color: "var(--empty-state-icon)" }} className="text-2xl mb-1">📋</p>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No lesson records found for this material.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {introductions.map((intro) => (
        <div key={intro.student_id} className="py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {intro.student_first_name} {intro.student_last_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              First introduced {new Date(intro.first_introduced_date).toLocaleDateString("en-AU")}
              {" · "}{intro.total_lesson_count} lesson{intro.total_lesson_count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ color: STAGE_COLORS[intro.latest_stage] ?? "var(--text-secondary)" }}
            >
              {STAGE_LABELS[intro.latest_stage] ?? intro.latest_stage}
            </span>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {new Date(intro.latest_stage_date).toLocaleDateString("en-AU")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
