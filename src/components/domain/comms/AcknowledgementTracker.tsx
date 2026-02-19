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
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Acknowledgements
          </h3>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            {stats.total_acknowledged} confirmed
          </span>
        </div>
      </div>

      {stats.acknowledgers.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-gray-500">
          No acknowledgements yet. Parents will appear here once they confirm
          they&apos;ve read this announcement.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {stats.acknowledgers.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between px-6 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                  {person.first_name?.[0]}
                  {person.last_name?.[0]}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {person.first_name} {person.last_name}
                </span>
              </div>
              <time className="text-xs text-gray-500">
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
