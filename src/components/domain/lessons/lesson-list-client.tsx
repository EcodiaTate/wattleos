"use client";

import { useState } from "react";
import type { LessonRecord, LessonStage, MontessoriMaterial } from "@/types/domain";
import { LessonCard } from "./lesson-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface LessonListClientProps {
  records: LessonRecord[];
  materialMap: Record<string, string>;
  studentMap: Record<string, string>;
}

const STAGE_TABS: { label: string; value: LessonStage | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Introduction", value: "introduction" },
  { label: "Practice", value: "practice" },
  { label: "Mastery", value: "mastery" },
];

export function LessonListClient({
  records,
  materialMap,
  studentMap,
}: LessonListClientProps) {
  const [stageFilter, setStageFilter] = useState<LessonStage | "all">("all");
  const haptics = useHaptics();

  const filtered =
    stageFilter === "all"
      ? records
      : records.filter((r) => r.stage === stageFilter);

  return (
    <div className="space-y-4">
      {/* Stage filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
        {STAGE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              haptics.light();
              setStageFilter(tab.value);
            }}
            className="active-push flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: stageFilter === tab.value ? "var(--primary)" : "var(--muted)",
              color: stageFilter === tab.value ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Record list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No lesson records found.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((record) => (
            <LessonCard
              key={record.id}
              record={record}
              materialName={materialMap[record.material_id]}
              studentName={studentMap[record.student_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
