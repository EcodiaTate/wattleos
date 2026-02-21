// src/app/(app)/comms/events/[id]/page.tsx
//
// WHY server component: Loads event + RSVP data on the server.
// Interactive RSVP widget is a client component embedded within.

import { EventActions } from "@/components/domain/comms/EventActions";
import { RSVPWidget } from "@/components/domain/comms/RSVPWidget";
import { getEvent, getEventRSVPs } from "@/lib/actions/comms/school-events";
import Link from "next/link";
import { notFound } from "next/navigation";

interface EventDetailPageProps {
  params: Promise<{ tenant: string; id: string }>;
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

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { tenant, id } = await params;

  const result = await getEvent(id);
  if (result.error || !result.data) {
    notFound();
  }
  const event = result.data;

  // Load full RSVP list for staff view
  let rsvps: Array<{
    id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
    status: string;
    guests: number;
    notes: string | null;
    responded_at: string;
  }> = [];
  if (event.rsvp_enabled) {
    const rsvpResult = await getEventRSVPs(id);
    if (rsvpResult.data) {
      rsvps = rsvpResult.data;
    }
  }

  const startDate = new Date(event.start_at);
  const endDate = event.end_at ? new Date(event.end_at) : null;
  const isPast = startDate < new Date();

  const formattedStart = event.all_day
    ? startDate.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : startDate.toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  const formattedEnd =
    endDate && !event.all_day
      ? endDate.toLocaleTimeString("en-AU", {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;

  // Group RSVPs by status
  const goingRsvps = rsvps.filter((r) => r.status === "going");
  const maybeRsvps = rsvps.filter((r) => r.status === "maybe");
  const notGoingRsvps = rsvps.filter((r) => r.status === "not_going");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href={`/comms/events`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Back to Events
      </Link>

      {/* ── Event Content ─────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-6 space-y-4">
          {/* Type + Scope badges */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {event.scope === "school"
                ? "School-wide"
                : event.scope === "class"
                  ? `Class: ${event.target_class?.name ?? "Unknown"}`
                  : event.scope === "staff"
                    ? "Staff Only"
                    : "Program"}
            </span>
            {isPast && (
              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                Past Event
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900">{event.title}</h2>

          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75"
              />
            </svg>
            <span>
              {formattedStart}
              {formattedEnd && <span> - {formattedEnd}</span>}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg
                className="h-5 w-5 text-gray-400"
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
              <span>{event.location}</span>
              {event.location_url && (
                <a
                  href={event.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline"
                >
                  View Map
                </a>
              )}
            </div>
          )}

          {/* Created by */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
              {event.creator.first_name?.[0]}
              {event.creator.last_name?.[0]}
            </div>
            Created by {event.creator.first_name} {event.creator.last_name}
          </div>

          {/* Description */}
          {event.description && (
            <div className="border-t border-gray-100 pt-4">
              <div className="prose prose-sm max-w-none text-gray-700">
                {event.description.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* RSVP Summary */}
          {event.rsvp_enabled && (
            <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {event.rsvp_summary.going}
                </p>
                <p className="text-xs text-gray-500">Going</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {event.rsvp_summary.maybe}
                </p>
                <p className="text-xs text-gray-500">Maybe</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">
                  {event.rsvp_summary.not_going}
                </p>
                <p className="text-xs text-gray-500">Not Going</p>
              </div>
              {event.rsvp_summary.total_guests > 0 && (
                <div className="text-center border-l border-gray-200 pl-4">
                  <p className="text-2xl font-bold text-gray-600">
                    +{event.rsvp_summary.total_guests}
                  </p>
                  <p className="text-xs text-gray-500">Guests</p>
                </div>
              )}
              {event.max_attendees && (
                <div className="ml-auto text-xs text-gray-500">
                  {event.rsvp_summary.going} / {event.max_attendees} capacity
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RSVP Widget ─────────────────────────────── */}
        {event.rsvp_enabled && (
          <div className="border-t border-gray-200 px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Your RSVP
            </h3>
            <RSVPWidget
              eventId={event.id}
              currentRsvp={event.my_rsvp}
              rsvpEnabled={event.rsvp_enabled}
              rsvpDeadline={event.rsvp_deadline}
              maxAttendees={event.max_attendees}
              currentGoing={event.rsvp_summary.going}
            />
          </div>
        )}

        {/* ── Staff Actions ───────────────────────────── */}
        <div className="border-t border-gray-200 px-6 py-4">
          <EventActions eventId={event.id} tenantSlug={tenant} />
        </div>
      </div>

      {/* ── RSVP Detail List (Staff view) ─────────────── */}
      {event.rsvp_enabled && rsvps.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              RSVP Responses ({rsvps.length})
            </h3>
          </div>

          {/* Going */}
          {goingRsvps.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="bg-emerald-50 px-6 py-2 text-xs font-medium text-emerald-700">
                Going ({goingRsvps.length})
              </div>
              <ul className="divide-y divide-gray-50">
                {goingRsvps.map((rsvp) => (
                  <li
                    key={rsvp.id}
                    className="flex items-center justify-between px-6 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                        {rsvp.user.first_name?.[0]}
                        {rsvp.user.last_name?.[0]}
                      </div>
                      <span className="text-sm text-gray-900">
                        {rsvp.user.first_name} {rsvp.user.last_name}
                      </span>
                      {rsvp.guests > 0 && (
                        <span className="text-xs text-gray-500">
                          +{rsvp.guests} guests
                        </span>
                      )}
                    </div>
                    {rsvp.notes && (
                      <span className="text-xs text-gray-400 truncate max-w-48">
                        {rsvp.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Maybe */}
          {maybeRsvps.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="bg-amber-50 px-6 py-2 text-xs font-medium text-amber-700">
                Maybe ({maybeRsvps.length})
              </div>
              <ul className="divide-y divide-gray-50">
                {maybeRsvps.map((rsvp) => (
                  <li
                    key={rsvp.id}
                    className="flex items-center justify-between px-6 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                        {rsvp.user.first_name?.[0]}
                        {rsvp.user.last_name?.[0]}
                      </div>
                      <span className="text-sm text-gray-900">
                        {rsvp.user.first_name} {rsvp.user.last_name}
                      </span>
                    </div>
                    {rsvp.notes && (
                      <span className="text-xs text-gray-400 truncate max-w-48">
                        {rsvp.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Not Going */}
          {notGoingRsvps.length > 0 && (
            <div>
              <div className="bg-gray-50 px-6 py-2 text-xs font-medium text-gray-500">
                Not Going ({notGoingRsvps.length})
              </div>
              <ul className="divide-y divide-gray-50">
                {notGoingRsvps.map((rsvp) => (
                  <li
                    key={rsvp.id}
                    className="flex items-center justify-between px-6 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                        {rsvp.user.first_name?.[0]}
                        {rsvp.user.last_name?.[0]}
                      </div>
                      <span className="text-sm text-gray-600">
                        {rsvp.user.first_name} {rsvp.user.last_name}
                      </span>
                    </div>
                    {rsvp.notes && (
                      <span className="text-xs text-gray-400 truncate max-w-48">
                        {rsvp.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
