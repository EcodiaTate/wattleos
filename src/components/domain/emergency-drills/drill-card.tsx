"use client";

import Link from "next/link";
import type { EmergencyDrill } from "@/types/domain";
import { DrillStatusBadge } from "./drill-status-badge";

const DRILL_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

const DRILL_TYPE_EMOJI: Record<string, string> = {
  fire_evacuation: "\u{1F525}",
  lockdown: "\u{1F512}",
  shelter_in_place: "\u{1F3E0}",
  medical_emergency: "\u{1FA7A}",
  other: "\u{1F514}",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface DrillCardProps {
  drill: EmergencyDrill;
}

export function DrillCard({ drill }: DrillCardProps) {
  const typeLabel =
    drill.drill_type === "other" && drill.drill_type_other
      ? drill.drill_type_other
      : DRILL_TYPE_LABELS[drill.drill_type] ?? drill.drill_type;

  return (
    <Link
      href={`/admin/emergency-drills/${drill.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {DRILL_TYPE_EMOJI[drill.drill_type] ?? "\u{1F514}"}
          </span>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {typeLabel}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {formatDate(drill.scheduled_date)}
              {drill.scheduled_time ? ` at ${drill.scheduled_time}` : ""}
            </p>
          </div>
        </div>
        <DrillStatusBadge status={drill.status} />
      </div>

      {(drill.assembly_point || drill.evacuation_time_seconds != null) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {drill.assembly_point && (
            <span>Assembly: {drill.assembly_point}</span>
          )}
          {drill.evacuation_time_seconds != null && (
            <span>
              Evacuation: {formatSeconds(drill.evacuation_time_seconds)}
            </span>
          )}
        </div>
      )}

      {drill.effectiveness_rating && (
        <div className="mt-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            style={{
              background:
                drill.effectiveness_rating === "excellent" ||
                drill.effectiveness_rating === "good"
                  ? "var(--drill-compliant-bg)"
                  : drill.effectiveness_rating === "fair"
                    ? "var(--drill-at-risk-bg)"
                    : "var(--drill-overdue-bg)",
              color:
                drill.effectiveness_rating === "excellent" ||
                drill.effectiveness_rating === "good"
                  ? "var(--drill-compliant)"
                  : drill.effectiveness_rating === "fair"
                    ? "var(--drill-at-risk)"
                    : "var(--drill-overdue)",
            }}
          >
            {drill.effectiveness_rating}
          </span>
        </div>
      )}
    </Link>
  );
}
