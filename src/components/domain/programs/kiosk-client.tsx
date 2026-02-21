// src/components/domain/programs/kiosk-client.tsx
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
    if (loadingBookingId) return;
    setLoadingBookingId(booking.booking_id);

    try {
      if (!booking.checked_in_at) {
        await checkIn(booking.booking_id);
      } else if (!booking.checked_out_at) {
        await checkOut(booking.booking_id);
      }
      await refresh();
    } catch {
      // Silently fail for kiosk stability
    } finally {
      setLoadingBookingId(null);
    }
  }

  function getBookingStatus(booking: KioskBookingRow) {
    if (booking.checked_out_at) {
      return {
        label: "Checked Out",
        bgColor: "bg-info/10",
        textColor: "text-info",
        borderColor: "border-info/30",
        dotColor: "bg-info"
      };
    }
    if (booking.checked_in_at) {
      return {
        label: "Checked In",
        bgColor: "bg-success/10",
        textColor: "text-success",
        borderColor: "border-success/30",
        dotColor: "bg-success"
      };
    }
    return {
      label: "Expected",
      bgColor: "bg-card",
      textColor: "text-foreground",
      borderColor: "border-border",
      dotColor: "bg-muted-foreground/30"
    };
  }

  const now = new Date();
  const timeDisplay = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  const dateDisplay = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  const totalExpected = sessions.reduce((sum, s) => sum + s.bookings.length, 0);
  const totalCheckedIn = sessions.reduce((sum, s) => sum + s.bookings.filter((b) => b.checked_in_at && !b.checked_out_at).length, 0);
  const totalCheckedOut = sessions.reduce((sum, s) => sum + s.bookings.filter((b) => b.checked_out_at).length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Kiosk Header */}
      <div className="sticky top-0 z-10 bg-primary px-6 py-6 text-primary-foreground shadow-lg border-b border-primary-600">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">OSHC Kiosk</h1>
            <p className="text-primary-foreground/80 font-medium">{dateDisplay}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums">{timeDisplay}</p>
            <div className="mt-2 flex items-center gap-4 text-sm font-bold uppercase tracking-wider">
              <span className="bg-primary-foreground/10 px-2 py-1 rounded">{totalExpected} expected</span>
              <span className="bg-success-foreground/20 text-success-foreground px-2 py-1 rounded">{totalCheckedIn} in</span>
              <span className="bg-info-foreground/20 text-info-foreground px-2 py-1 rounded">{totalCheckedOut} out</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 p-6">
        {sessions.length === 0 ? (
          <div className="rounded-2xl bg-card p-16 text-center shadow-sm border border-border">
            <p className="text-xl text-muted-foreground font-medium">No sessions scheduled for today.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.session_id} className="rounded-2xl bg-card shadow-md border border-border overflow-hidden">
              <div className="flex items-center justify-between bg-muted/50 px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {session.program_name}
                    {session.program_code && <span className="ml-2 text-sm font-normal text-muted-foreground">({session.program_code})</span>}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {formatTime(session.start_time)} – {formatTime(session.end_time)}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <div className="bg-foreground/5 rounded-full px-4 py-1 text-sm font-bold text-foreground">
                  {session.bookings.length} children
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                {session.bookings.map((booking) => {
                  const status = getBookingStatus(booking);
                  const isLoading = loadingBookingId === booking.booking_id;
                  const isComplete = !!booking.checked_out_at;

                  return (
                    <button
                      key={booking.booking_id}
                      onClick={() => !isComplete && handleTap(booking)}
                      disabled={isLoading || isComplete}
                      className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all touch-target-lg ${status.bgColor} ${status.borderColor} ${
                        isComplete ? "opacity-60 grayscale-[0.5]" : "card-interactive shadow-sm"
                      } disabled:cursor-default`}
                      style={{ minHeight: "84px" }}
                    >
                      {/* Avatar */}
                      {booking.student_photo_url ? (
                        <img src={booking.student_photo_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-background shadow-sm" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-black text-primary-700 shadow-inner">
                          {booking.student_first_name[0]}{booking.student_last_name[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-xl font-bold truncate ${status.textColor}`}>
                          {booking.student_first_name} {booking.student_last_name}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground">
                          {isLoading ? "Processing..." : isComplete 
                            ? `Out at ${new Date(booking.checked_out_at!).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}`
                            : booking.checked_in_at 
                              ? `In at ${new Date(booking.checked_in_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}` 
                              : "Tap to check in"}
                        </p>
                      </div>

                      {booking.has_medical_conditions && (
                        <div className="flex-shrink-0 animate-pulse-soft">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--medical-life-threatening)] shadow-danger text-2xl" title={booking.medical_summary ?? "Medical alert"}>
                            🏥
                          </span>
                        </div>
                      )}

                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${status.borderColor} ${status.dotColor} text-white font-bold text-xl`}>
                          {(booking.checked_in_at || isComplete) ? "✓" : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="flex items-center justify-between py-8 border-t border-border mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
             <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
             Last updated: {lastRefresh.toLocaleTimeString("en-AU")}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={refresh} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm">
              Refresh
            </button>
            <a href="/programs" className="text-sm font-bold text-primary hover:underline">Exit Kiosk</a>
          </div>
        </div>
      </div>
    </div>
  );
}