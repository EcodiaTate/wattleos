// src/components/domain/programs/booking-action-buttons.tsx
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
    return <span className="text-xs text-muted-foreground italic">Complete</span>;
  }

  return (
    <div className="flex items-center gap-[var(--density-xs)]">
      {error && (
        <span className="mr-1 text-xs text-destructive font-bold" title={error}>
          !
        </span>
      )}

      {!checkedIn ? (
        <>
          <button
            onClick={() => handleAction(() => checkIn(bookingId))}
            disabled={loading}
            className="rounded-md bg-success px-2 py-1 text-xs font-semibold text-success-foreground hover:opacity-90 transition-[var(--transition-fast)] disabled:opacity-50"
          >
            {loading ? "..." : "In"}
          </button>
          <button
            onClick={() =>
              handleAction(() => cancelBooking({ booking_id: bookingId }))
            }
            disabled={loading}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-[var(--transition-fast)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAction(() => markNoShow(bookingId))}
            disabled={loading}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-[var(--transition-fast)] disabled:opacity-50"
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
            className="rounded-md bg-info px-2 py-1 text-xs font-semibold text-info-foreground hover:opacity-90 transition-[var(--transition-fast)] disabled:opacity-50"
          >
            {loading ? "..." : "Out"}
          </button>
          <button
            onClick={() => handleAction(() => undoCheckIn(bookingId))}
            disabled={loading}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-[var(--transition-fast)] disabled:opacity-50"
            title="Undo check-in"
          >
            Undo
          </button>
        </>
      )}
    </div>
  );
}