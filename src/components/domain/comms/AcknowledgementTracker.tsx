// src/components/domain/comms/AcknowledgementTracker.tsx
//
// WHY server component: This is purely display - shows a list
// of who acknowledged and when. No interactivity needed.

import type { AcknowledgementStats } from "@/lib/actions/comms/announcements";

interface AcknowledgementTrackerProps {
  stats: AcknowledgementStats;
}

export function AcknowledgementTracker({ stats }: AcknowledgementTrackerProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Acknowledgements
          </h3>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--badge-success-bg)", color: "var(--badge-success-fg)" }}>
            {stats.total_acknowledged} confirmed
          </span>
        </div>
      </div>

      {stats.acknowledgers.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No acknowledgements yet. Parents will appear here once they confirm
          they&apos;ve read this announcement.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {stats.acknowledgers.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between px-6 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium" style={{ backgroundColor: "var(--badge-success-bg)", color: "var(--badge-success-fg)" }}>
                  {person.first_name?.[0]}
                  {person.last_name?.[0]}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {person.first_name} {person.last_name}
                </span>
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(person.acknowledged_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
