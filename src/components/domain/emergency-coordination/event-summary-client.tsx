"use client";

import type { EmergencyCoordinationLiveData } from "@/types/domain";
import { EmergencyStatusBadge } from "./emergency-status-badge";
import { SeverityBadge } from "./severity-badge";
import { HeadcountSummary } from "./headcount-summary";
import { EventTimeline } from "./event-timeline";
import { ZoneStatusBadge } from "./zone-status-badge";

const EVENT_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return "-";
  const diff = Math.floor(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000,
  );
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventSummaryClient({
  data,
}: {
  data: EmergencyCoordinationLiveData;
}) {
  const { event, zones, student_accountability, staff_accountability, timeline, summary } = data;

  const allClearTime = event.all_clear_at
    ? formatDuration(event.activated_at, event.all_clear_at)
    : null;

  const totalDuration =
    event.resolved_at ?? event.cancelled_at ?? event.all_clear_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EmergencyStatusBadge status={event.status} size="lg" />
          <SeverityBadge severity={event.severity} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
          {event.event_type_other && `: ${event.event_type_other}`}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          {formatDateTime(event.activated_at)}
          {event.activated_by_user &&
            ` · Activated by ${event.activated_by_user.first_name} ${event.activated_by_user.last_name}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Duration",
            value: totalDuration
              ? formatDuration(event.activated_at, totalDuration)
              : "-",
          },
          { label: "Time to All Clear", value: allClearTime ?? "-" },
          {
            label: "Students Accounted",
            value: `${summary.students_accounted}/${summary.students_total}`,
          },
          {
            label: "Staff Accounted",
            value: `${summary.staff_accounted}/${summary.staff_total}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-lg)] border border-border p-3"
            style={{ backgroundColor: "var(--card)" }}
          >
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {stat.label}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Accountability */}
      <div
        className="rounded-[var(--radius-lg)] border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
          Final Accountability
        </h2>
        <HeadcountSummary summary={summary} />
      </div>

      {/* Zones */}
      {zones.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
            Zone Status
          </h2>
          <div className="space-y-2">
            {zones.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2"
              >
                <span className="text-sm" style={{ color: "var(--foreground)" }}>
                  {z.zone.name}
                </span>
                <ZoneStatusBadge status={z.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div
        className="rounded-[var(--radius-lg)] border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
          Event Timeline ({timeline.length} entries)
        </h2>
        <EventTimeline entries={timeline} />
      </div>
    </div>
  );
}
