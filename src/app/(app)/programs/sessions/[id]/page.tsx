// src/app/(app)/programs/sessions/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Session Detail Page
// ============================================================
// Server Component. Shows all bookings for a specific session
// with check-in/out status, waitlist, and admin actions.
//
// WHY server component: Most data is display-only. The
// interactive check-in/cancel buttons are small client
// islands embedded within the server-rendered table.
// ============================================================

import { BookingActionButtons } from "@/components/domain/programs/booking-action-buttons";
import { ProgramTypeBadge } from "@/components/domain/programs/program-type-badge";
import { SessionActionButtons } from "@/components/domain/programs/session-action-buttons";
import { getSession } from "@/lib/actions/programs/programs";
import { getSessionBookings } from "@/lib/actions/programs/session-bookings";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  BOOKING_STATUS_CONFIG,
  formatTime,
  SESSION_STATUS_CONFIG,
  type ProgramTypeValue,
} from "@/lib/constants/programs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_PROGRAMS)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const [sessionResult, bookingsResult] = await Promise.all([
    getSession(id),
    getSessionBookings(id),
  ]);

  if (sessionResult.error || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const bookings = bookingsResult.data ?? [];

  const statusConfig =
    SESSION_STATUS_CONFIG[session.status] ?? SESSION_STATUS_CONFIG.scheduled;
  const capacity = session.max_capacity ?? session.program.max_capacity;

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const waitlistedBookings = bookings.filter((b) => b.status === "waitlisted");
  const cancelledBookings = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "no_show",
  );

  const dateDisplay = new Date(session.date + "T00:00:00").toLocaleDateString(
    "en-AU",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/programs" className="hover:text-amber-600">
          Programs
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={`/programs/${session.program.id}`}
          className="hover:text-amber-600"
        >
          {session.program.name}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{dateDisplay}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              {session.program.name}
            </h1>
            <ProgramTypeBadge
              type={session.program.program_type as ProgramTypeValue}
            />
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {dateDisplay} · {formatTime(session.start_time)} –{" "}
            {formatTime(session.end_time)}
            {session.location && ` · ${session.location}`}
          </p>
        </div>

        <SessionActionButtons
          sessionId={id}
          status={session.status}
          programId={session.program.id}
        />
      </div>

      {/* Capacity Bar */}
      {capacity != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Capacity</span>
            <span className="font-medium text-gray-900">
              {session.confirmed_count} / {capacity}
              {session.waitlisted_count > 0 && (
                <span className="ml-2 text-amber-600">
                  +{session.waitlisted_count} waitlisted
                </span>
              )}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all ${
                session.confirmed_count >= capacity
                  ? "bg-red-500"
                  : session.confirmed_count >= capacity * 0.8
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(100, (session.confirmed_count / capacity) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Confirmed Bookings */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Confirmed ({confirmedBookings.length})
        </h2>

        {confirmedBookings.length === 0 ? (
          <p className="text-sm text-gray-400">No confirmed bookings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Booked By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Check-in
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Check-out
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {confirmedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {booking.student.photo_url ? (
                          <img
                            src={booking.student.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
                            {booking.student.first_name[0]}
                            {booking.student.last_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.student.first_name}{" "}
                            {booking.student.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {booking.booked_by_user.first_name}{" "}
                      {booking.booked_by_user.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {booking.booking_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {booking.checked_in_at ? (
                        <span className="text-green-700">
                          {new Date(booking.checked_in_at).toLocaleTimeString(
                            "en-AU",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {booking.checked_out_at ? (
                        <span className="text-blue-700">
                          {new Date(booking.checked_out_at).toLocaleTimeString(
                            "en-AU",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BookingActionButtons
                        bookingId={booking.id}
                        status={booking.status}
                        checkedIn={!!booking.checked_in_at}
                        checkedOut={!!booking.checked_out_at}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waitlist */}
      {waitlistedBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider">
            Waitlisted ({waitlistedBookings.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50">
            <ul className="divide-y divide-amber-100">
              {waitlistedBookings
                .sort(
                  (a, b) =>
                    (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0),
                )
                .map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                        {booking.waitlist_position ?? "?"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {booking.student.first_name} {booking.student.last_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {booking.booking_type}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* Cancelled / No-shows */}
      {cancelledBookings.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Cancelled & No-shows ({cancelledBookings.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {cancelledBookings.map((booking) => {
              const bsConfig =
                BOOKING_STATUS_CONFIG[booking.status] ??
                BOOKING_STATUS_CONFIG.cancelled;
              return (
                <li
                  key={booking.id}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-500">
                    {booking.student.first_name} {booking.student.last_name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${bsConfig.badgeBg} ${bsConfig.badgeText}`}
                  >
                    {bsConfig.label}
                    {booking.late_cancellation && " (late)"}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
