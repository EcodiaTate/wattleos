import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { getEventsForParent } from "@/lib/actions/comms/school-events";
import type { SchoolEventWithDetails } from "@/lib/actions/comms/school-events";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Events - WattleOS" };

const EVENT_TYPE_LABELS: Record<string, string> = {
  general: "General",
  excursion: "Excursion",
  parent_meeting: "Parent Meeting",
  performance: "Performance",
  sports_day: "Sports Day",
  fundraiser: "Fundraiser",
  professional_development: "PD Day",
  public_holiday: "Public Holiday",
  pupil_free_day: "Pupil Free Day",
  term_start: "Term Start",
  term_end: "Term End",
};

function RSVPBadge({ rsvp }: { rsvp: SchoolEventWithDetails["my_rsvp"] }) {
  if (!rsvp) return null;
  const config = {
    going: { label: "Going", bg: "color-mix(in srgb, var(--success) 12%, transparent)", fg: "var(--success)" },
    not_going: { label: "Not Going", bg: "color-mix(in srgb, var(--destructive) 12%, transparent)", fg: "var(--destructive)" },
    maybe: { label: "Maybe", bg: "color-mix(in srgb, var(--warning) 12%, transparent)", fg: "var(--warning)" },
  }[rsvp.status];

  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  );
}

export default async function ParentEventsPage() {
  const context = await getTenantContext();

  const result = await getEventsForParent({ per_page: 50 });

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error.message ?? "Failed to load events."}
        </p>
      </div>
    );
  }

  const events = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Upcoming Events
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          School and class events relevant to your children
        </p>
      </div>

      {events.length === 0 ? (
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
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            No upcoming events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const startDate = new Date(event.start_at);

            return (
              <Link
                key={event.id}
                href={`/parent/events/${event.id}`}
                className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
                style={{ background: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {event.title}
                    </h3>
                    <div
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span>{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
                      <span>
                        {startDate.toLocaleDateString("en-AU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>
                        {startDate.toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {event.location && <span>{event.location}</span>}
                    </div>
                    {event.description && (
                      <p
                        className="text-xs line-clamp-1"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {event.rsvp_enabled && <RSVPBadge rsvp={event.my_rsvp} />}
                    {event.rsvp_enabled && !event.my_rsvp && (
                      <span
                        className="rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                      >
                        RSVP
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
