// src/components/domain/programs/kiosk-client.tsx
//
// ============================================================
// WattleOS V2 - Kiosk Check-in/Check-out Client
// ============================================================
// Full-screen interactive kiosk for OSHC check-in/check-out.
// Designed for iPad at the care desk.
//
// Design principles:
// - Large tap targets (minimum 64px height)
// - Medical alerts visible at all times
// - Status colour-coded: gray=expected, green=in, blue=out
// - Auto-refreshes every 30 seconds
// - One-tap check-in, one-tap check-out
//
// WHY client component: Every interaction (tap to check in)
// needs immediate UI feedback, loading states, and auto-refresh.
// ============================================================

"use client";

import {
  checkIn,
  checkOut,
  getKioskData,
  type KioskBookingRow,
  type KioskSessionData,
} from "@/lib/actions/programs/session-bookings";
import { formatTime } from "@/lib/constants/programs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface KioskClientProps {
  initialSessions: KioskSessionData[];
}

export function KioskClient({ initialSessions }: KioskClientProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<KioskSessionData[]>(initialSessions);
  const [loadingBookingId, setLoadingBookingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30 seconds
  const refresh = useCallback(async () => {
    const result = await getKioskData();
    if (result.data) {
      setSessions(result.data);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleTap(booking: KioskBookingRow) {
    if (loadingBookingId) return; // Prevent double-tap
    setLoadingBookingId(booking.booking_id);

    try {
      if (!booking.checked_in_at) {
        // Check in
        await checkIn(booking.booking_id);
      } else if (!booking.checked_out_at) {
        // Check out
        await checkOut(booking.booking_id);
      }
      // Refresh after action
      await refresh();
    } catch {
      // Silently fail - kiosk should stay functional
    } finally {
      setLoadingBookingId(null);
    }
  }

  function getBookingStatus(booking: KioskBookingRow): {
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  } {
    if (booking.checked_out_at) {
      return {
        label: "Checked Out",
        bgColor: "bg-blue-50",
        textColor: "text-blue-800",
        borderColor: "border-blue-200",
      };
    }
    if (booking.checked_in_at) {
      return {
        label: "Checked In",
        bgColor: "bg-green-50",
        textColor: "text-green-800",
        borderColor: "border-green-300",
      };
    }
    return {
      label: "Expected",
      bgColor: "bg-white",
      textColor: "text-gray-700",
      borderColor: "border-gray-200",
    };
  }

  const now = new Date();
  const timeDisplay = now.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateDisplay = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const totalExpected = sessions.reduce((sum, s) => sum + s.bookings.length, 0);
  const totalCheckedIn = sessions.reduce(
    (sum, s) =>
      sum +
      s.bookings.filter((b) => b.checked_in_at && !b.checked_out_at).length,
    0,
  );
  const totalCheckedOut = sessions.reduce(
    (sum, s) => sum + s.bookings.filter((b) => b.checked_out_at).length,
    0,
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Kiosk Header - sticky */}
      <div className="sticky top-0 z-10 bg-amber-700 px-6 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">OSHC Check-in</h1>
            <p className="text-amber-200">{dateDisplay}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">{timeDisplay}</p>
            <div className="mt-1 flex items-center gap-3 text-sm text-amber-200">
              <span>{totalExpected} expected</span>
              <span className="text-green-300">{totalCheckedIn} in</span>
              <span className="text-blue-300">{totalCheckedOut} out</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {sessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-xl text-gray-400">
              No sessions scheduled for today.
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className="rounded-2xl bg-white shadow-sm"
            >
              {/* Session header */}
              <div className="flex items-center justify-between rounded-t-2xl bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {session.program_name}
                    {session.program_code && (
                      <span className="ml-2 text-sm font-normal text-gray-400">
                        ({session.program_code})
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {formatTime(session.start_time)} –{" "}
                    {formatTime(session.end_time)}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {session.bookings.length} children
                </div>
              </div>

              {/* Booking cards - grid for iPad */}
              {session.bookings.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No bookings for this session.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  {session.bookings.map((booking) => {
                    const status = getBookingStatus(booking);
                    const isLoading = loadingBookingId === booking.booking_id;
                    const isComplete = !!booking.checked_out_at;

                    return (
                      <button
                        key={booking.booking_id}
                        onClick={() => !isComplete && handleTap(booking)}
                        disabled={isLoading || isComplete}
                        className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${status.bgColor} ${status.borderColor} ${
                          isComplete
                            ? "opacity-60 cursor-default"
                            : "hover:shadow-md active:scale-[0.98] cursor-pointer"
                        } disabled:cursor-default`}
                        style={{ minHeight: "72px" }}
                      >
                        {/* Avatar */}
                        {booking.student_photo_url ? (
                          <img
                            src={booking.student_photo_url}
                            alt=""
                            className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700 flex-shrink-0">
                            {booking.student_first_name[0]}
                            {booking.student_last_name[0]}
                          </div>
                        )}

                        {/* Name + Status */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-lg font-semibold truncate ${status.textColor}`}
                          >
                            {booking.student_first_name}{" "}
                            {booking.student_last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {isLoading
                              ? "Processing..."
                              : !booking.checked_in_at
                                ? "Tap to check in"
                                : !booking.checked_out_at
                                  ? `In at ${new Date(booking.checked_in_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} · Tap to check out`
                                  : `Out at ${new Date(booking.checked_out_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </div>

                        {/* Medical badge */}
                        {booking.has_medical_conditions && (
                          <div
                            className="flex-shrink-0"
                            title={
                              booking.medical_summary ?? "Medical conditions"
                            }
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-lg">
                              🏥
                            </span>
                          </div>
                        )}

                        {/* Status indicator */}
                        <div className="flex-shrink-0">
                          {booking.checked_out_at ? (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl">
                              ✓
                            </span>
                          ) : booking.checked_in_at ? (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 text-xl">
                              ✓
                            </span>
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xl">
                              ○
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}

        {/* Footer */}
        <div className="flex items-center justify-between py-4 text-xs text-gray-400">
          <span>
            Last updated:{" "}
            {lastRefresh.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <button
            onClick={refresh}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-white transition-colors"
          >
            Refresh Now
          </button>
          <a
            href="/programs"
            className="text-sm text-amber-600 hover:text-amber-700"
          >
            Exit Kiosk
          </a>
        </div>
      </div>
    </div>
  );
}
