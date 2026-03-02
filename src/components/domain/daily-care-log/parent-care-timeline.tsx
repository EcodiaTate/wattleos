"use client";

import type { DailyCareEntryWithRecorder } from "@/types/domain";
import { CareTimeline } from "./care-timeline";

interface ParentCareTimelineProps {
  entries: DailyCareEntryWithRecorder[];
}

export function ParentCareTimeline({ entries }: ParentCareTimelineProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <p
        className="mb-4 text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Today&apos;s Timeline
      </p>
      <CareTimeline entries={entries} readOnly />
    </div>
  );
}
