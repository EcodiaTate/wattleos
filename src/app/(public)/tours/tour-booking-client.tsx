// src/app/(public)/tours/tour-booking-client.tsx
//
// ============================================================
// WattleOS V2 - Public Tour Availability (Module 13)
// ============================================================
// 'use client' - displays available tour slots grouped by
// date with remaining capacity.
//
// WHY no direct booking: bookTour() requires MANAGE_TOURS
// permission (staff action). The public flow is:
//   1. Parent sees available slots here
//   2. Parent submits inquiry at /inquiry (or already has one)
//   3. Admin books the tour for them from the pipeline
//
// A public self-service booking action can be added later
// without changing this UI - just swap the CTA button handler.
// ============================================================

"use client";

import type { AvailableTourSlot } from "@/lib/actions/admissions/tour-slots";

interface TourBookingClientProps {
  slots: AvailableTourSlot[];
  schoolName: string;
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

// ── Group slots by date ──────────────────────────────────────

function groupByDate(
  slots: AvailableTourSlot[],
): Map<string, AvailableTourSlot[]> {
  const grouped = new Map<string, AvailableTourSlot[]>();
  for (const slot of slots) {
    const existing = grouped.get(slot.date) ?? [];
    existing.push(slot);
    grouped.set(slot.date, existing);
  }
  return grouped;
}

export function TourBookingClient({
  slots,
  schoolName,
}: TourBookingClientProps) {
  const grouped = groupByDate(slots);

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          No Upcoming Tours
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {schoolName} doesn't have any upcoming tour slots available right now.
          Please submit an inquiry and we'll notify you when tours are
          scheduled.
        </p>
        <a
          href="/inquiry"
          className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Submit an Inquiry
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        To book a tour, please{" "}
        <a
          href="/inquiry"
          className="font-medium underline hover:text-amber-900"
        >
          submit an inquiry
        </a>{" "}
        first. Our admissions team will then confirm your tour booking and send
        you all the details.
      </div>

      {/* Tour slots by date */}
      {Array.from(grouped.entries()).map(([date, dateSlots]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {dateSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Time */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatTime(slot.start_time)} –{" "}
                      {formatTime(slot.end_time)}
                    </p>
                    {slot.location && (
                      <p className="text-xs text-gray-500">{slot.location}</p>
                    )}
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      slot.spots_remaining <= 2
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {slot.spots_remaining}{" "}
                    {slot.spots_remaining === 1 ? "spot" : "spots"} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">
          Interested in visiting?
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Submit an inquiry and we'll get in touch to arrange your tour.
        </p>
        <a
          href="/inquiry"
          className="mt-4 inline-block rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Submit an Inquiry
        </a>
      </div>
    </div>
  );
}
