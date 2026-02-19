// src/components/domain/programs/booking-action-buttons.tsx
//
// ============================================================
// WattleOS V2 - Booking Action Buttons
// ============================================================
// Client component for per-booking row actions on the session
// detail page. Actions depend on booking state:
// - Not checked in: Check In, Cancel, No-Show
// - Checked in: Check Out, Undo Check-in
// - Checked out: (no actions)
//
// WHY per-row client component: Each booking row needs its
// own loading state. A single client wrapper for the whole
// table would be overkill.
// ============================================================

"use client";

import {
  cancelBooking,
  checkIn,
  checkOut,
  markNoShow,
  undoCheckIn,
} from "@/lib/actions/programs/session-bookings";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookingActionButtonsProps {
  bookingId: string;
  status: string;
  checkedIn: boolean;
  checkedOut: boolean;
}

export function BookingActionButtons({
  bookingId,
  status,
  checkedIn,
  checkedOut,
}: BookingActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(
    action: () => Promise<{ error: { message: string } | null }>,
  ) {
    setLoading(true);
    setError(null);

    const result = await action();

    if (result.error) {
      setError(result.error.message);
    } else {
      router.refresh();
    }

    setLoading(false);
  }

  if (status !== "confirmed") return null;
  if (checkedOut) {
    return <span className="text-xs text-gray-400">Complete</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {error && (
        <span className="mr-1 text-xs text-red-500" title={error}>
          !
        </span>
      )}

      {!checkedIn ? (
        <>
          <button
            onClick={() => handleAction(() => checkIn(bookingId))}
            disabled={loading}
            className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "In"}
          </button>
          <button
            onClick={() =>
              handleAction(() => cancelBooking({ booking_id: bookingId }))
            }
            disabled={loading}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction(() => markNoShow(bookingId))}
            disabled={loading}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Mark as no-show"
          >
            NS
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => handleAction(() => checkOut(bookingId))}
            disabled={loading}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Out"}
          </button>
          <button
            onClick={() => handleAction(() => undoCheckIn(bookingId))}
            disabled={loading}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Undo check-in"
          >
            Undo
          </button>
        </>
      )}
    </div>
  );
}
