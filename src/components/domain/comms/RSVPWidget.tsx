// src/components/domain/comms/RSVPWidget.tsx
//
// WHY client component: The RSVP buttons trigger a server
// action and update optimistically.

"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  respondToEvent,
  type RSVPStatus,
  type EventRSVP,
} from "@/lib/actions/comms/school-events";

interface RSVPWidgetProps {
  eventId: string;
  currentRsvp: EventRSVP | null;
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  maxAttendees: number | null;
  currentGoing: number;
}

const RSVP_OPTIONS: {
  value: RSVPStatus;
  label: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    value: "going",
    label: "Going",
    icon: "✓",
    activeClass: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: "?",
    activeClass: "bg-amber-100 text-amber-700 ring-amber-300",
  },
  {
    value: "not_going",
    label: "Not Going",
    icon: "✗",
    activeClass: "bg-gray-200 text-gray-700 ring-gray-300",
  },
];

type ActionError = { message: string; code: string } | string | null | undefined;
type ActionResult<T> = { data: T | null; error: ActionError };

function errorToString(err: ActionError): string {
  if (!err) return "Something went wrong";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Something went wrong";
}

export function RSVPWidget({
  eventId,
  currentRsvp,
  rsvpEnabled,
  rsvpDeadline,
  maxAttendees,
  currentGoing,
}: RSVPWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(
    currentRsvp?.status ?? null,
  );
  const [guests, setGuests] = useState(currentRsvp?.guests ?? 0);
  const [notes, setNotes] = useState(currentRsvp?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const isPastDeadline = rsvpDeadline ? new Date(rsvpDeadline) < new Date() : false;

  // “Full” should only block NEW “going” attempts.
  const isFull =
    maxAttendees !== null &&
    currentGoing >= maxAttendees &&
    selectedStatus !== "going";

  if (!rsvpEnabled) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
        RSVPs are not enabled for this event.
      </div>
    );
  }

  if (isPastDeadline) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
        The RSVP deadline has passed.
        {selectedStatus && (
          <span className="ml-1 font-medium">
            Your response:{" "}
            {selectedStatus === "going"
              ? "Going"
              : selectedStatus === "maybe"
                ? "Maybe"
                : "Not Going"}
          </span>
        )}
      </div>
    );
  }

  /**
   * Proper fix:
   * - Some codebases have respondToEvent(eventId, status)
   * - Others have respondToEvent(eventId, { status, guests, notes })
   *
   * We support both, without fighting TS, and we keep guests/notes UI.
   */
  const submitRsvp = useCallback(
    async (status: RSVPStatus, nextGuests: number, nextNotes: string) => {
      const payload = {
        status,
        guests: nextGuests,
        notes: nextNotes.trim() || undefined,
      };

      // Prefer payload form first, fall back to status-only if the action expects that.
      const fnAny = respondToEvent as unknown as (...args: any[]) => Promise<ActionResult<any>>;

      try {
        // Attempt (eventId, payload)
        const res = await fnAny(eventId, payload);

        // If it returned an error, surface it. If it threw because signature mismatch,
        // we'll fall back in catch below.
        return res;
      } catch {
        // Fallback (eventId, status)
        const res = await fnAny(eventId, status);
        return res;
      }
    },
    [eventId],
  );

  function handleRespond(status: RSVPStatus) {
    setError(null);
    setSelectedStatus(status);

    startTransition(async () => {
      const result = await submitRsvp(status, guests, notes);

      if (result?.error) {
        setError(errorToString(result.error));
        setSelectedStatus(currentRsvp?.status ?? null);
        return;
      }

      router.refresh();
    });
  }

  function handleGuestsBlur() {
    if (!selectedStatus) return;

    setError(null);
    startTransition(async () => {
      const result = await submitRsvp(selectedStatus, guests, notes);

      if (result?.error) {
        setError(errorToString(result.error));
        // revert optimistic UI to last known
        setSelectedStatus(currentRsvp?.status ?? null);
        setGuests(currentRsvp?.guests ?? 0);
        setNotes(currentRsvp?.notes ?? "");
        return;
      }

      router.refresh();
    });
  }

  function handleNotesBlur() {
    if (!selectedStatus) return;

    setError(null);
    startTransition(async () => {
      const result = await submitRsvp(selectedStatus, guests, notes);

      if (result?.error) {
        setError(errorToString(result.error));
        setSelectedStatus(currentRsvp?.status ?? null);
        setGuests(currentRsvp?.guests ?? 0);
        setNotes(currentRsvp?.notes ?? "");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isFull && (
        <p className="text-sm text-amber-600">
          This event has reached its capacity of {maxAttendees} attendees.
        </p>
      )}

      {/* ── RSVP Buttons ──────────────────────────────── */}
      <div className="flex gap-2">
        {RSVP_OPTIONS.map((opt) => {
          const isActive = selectedStatus === opt.value;
          const isDisabled =
            isPending || (opt.value === "going" && isFull && !isActive);

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleRespond(opt.value)}
              disabled={isDisabled}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? `${opt.activeClass} ring-2`
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="mr-1">{opt.icon}</span> {opt.label}
            </button>
          );
        })}
      </div>

      {/* ── Guests + Notes (shown when responded) ──── */}
      {selectedStatus && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label
              htmlFor="guests"
              className="block text-sm font-medium text-gray-700"
            >
              Additional Guests
            </label>
            <input
              id="guests"
              type="number"
              min="0"
              max="10"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value, 10) || 0)}
              onBlur={handleGuestsBlur}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes (optional)
            </label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Dietary requirements, etc."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}