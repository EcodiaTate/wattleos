// src/components/domain/comms/EventCard.tsx
//
// WHY server component: Event cards are read-only display.
// Clicking navigates to the detail page for RSVP actions.

import type { SchoolEventWithDetails } from "@/lib/actions/comms/school-events";
import { EVENT_TYPE_ICONS } from "@/lib/constants/communications";
import Link from "next/link";

interface EventCardProps {
  event: SchoolEventWithDetails;
}

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

export function EventCard({ event }: EventCardProps) {
  const startDate = new Date(event.start_at);
  const isPast = startDate < new Date();

  const day = startDate.getDate();
  const month = startDate.toLocaleDateString("en-AU", { month: "short" });
  const time = event.all_day
    ? "All Day"
    : startDate.toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
      });

  const totalRsvps =
    event.rsvp_summary.going +
    event.rsvp_summary.not_going +
    event.rsvp_summary.maybe;

  return (
    <Link
      href={`/comms/events/${event.id}`}
      className={`block rounded-lg border transition-shadow hover:shadow-md ${
        isPast
          ? "border-border bg-muted opacity-75"
          : "border-border bg-card"
      }`}
    >
      <div className="p-5">
        {/* ── Date block + Type ────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2 text-center">
            <span className="text-xs font-medium uppercase text-primary">
              {month}
            </span>
            <span className="text-2xl font-bold text-primary">{day}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">
                {EVENT_TYPE_ICONS[event.event_type] ?? "📋"}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
              </span>
            </div>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
              {event.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
          </div>
        </div>

        {/* ── Location ────────────────────────────────── */}
        {event.location && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* ── RSVP summary ────────────────────────────── */}
        {event.rsvp_enabled && totalRsvps > 0 && (
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-success">
              ✓ {event.rsvp_summary.going} going
            </span>
            {event.rsvp_summary.maybe > 0 && (
              <span className="text-primary">
                ? {event.rsvp_summary.maybe} maybe
              </span>
            )}
            {event.rsvp_summary.not_going > 0 && (
              <span className="text-muted-foreground">
                ✗ {event.rsvp_summary.not_going}
              </span>
            )}
          </div>
        )}

        {/* ── Scope badge ─────────────────────────────── */}
        <div className="mt-3">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {event.scope === "school"
              ? "School-wide"
              : event.scope === "class"
                ? `Class${event.target_class ? `: ${event.target_class.name}` : ""}`
                : event.scope === "staff"
                  ? "Staff Only"
                  : "Program"}
          </span>
          {event.max_attendees && (
            <span className="ml-2 text-xs text-muted-foreground">
              Max {event.max_attendees} attendees
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
