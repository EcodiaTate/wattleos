// src/app/(app)/programs/sessions/[id]/page.tsx

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
    <div className="content-narrow animate-fade-in space-y-[var(--density-section-gap)]">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-[var(--breadcrumb-fg)] gap-2">
        <Link href="/programs" className="hover:text-[var(--primary)] transition-colors">
          Programs
        </Link>
        <span className="text-[var(--breadcrumb-separator)]">/</span>
        <Link
          href={`/programs/${session.program.id}`}
          className="hover:text-[var(--primary)] transition-colors"
        >
          {session.program.name}
        </Link>
        <span className="text-[var(--breadcrumb-separator)]">/</span>
        <span className="text-[var(--breadcrumb-active-fg)] font-medium">{dateDisplay}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              {session.program.name}
            </h1>
            <ProgramTypeBadge
              type={session.program.program_type as ProgramTypeValue}
            />
            <span
              className={`status-badge-plain inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeBg} ${statusConfig.badgeText}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] font-medium">
            {dateDisplay} · <span className="tabular-nums">{formatTime(session.start_time)} – {formatTime(session.end_time)}</span>
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
        <div className="space-y-2 bg-[var(--card)] p-[var(--density-card-padding)] rounded-[var(--radius)] border border-[var(--border)] shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)] font-medium">Session Capacity</span>
            <span className="font-bold text-[var(--foreground)] tabular-nums">
              {session.confirmed_count} / {capacity}
              {session.waitlisted_count > 0 && (
                <span className="ml-2 text-[var(--primary)]">
                  (+{session.waitlisted_count} waitlisted)
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                session.confirmed_count >= capacity
                  ? "bg-[var(--destructive)]"
                  : session.confirmed_count >= capacity * 0.8
                    ? "bg-[var(--warning)]"
                    : "bg-[var(--success)]"
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
        <h2 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest">
          Confirmed ({confirmedBookings.length})
        </h2>

        {confirmedBookings.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-8 text-center bg-[var(--background)]">
            <p className="text-sm text-[var(--empty-state-fg)]">No confirmed bookings yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--table-border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
            <table className="min-w-full">
              <thead className="bg-[var(--table-header-bg)] border-b border-[var(--table-border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Booked By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Check-in
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Check-out
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[var(--table-header-fg)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--table-border)]">
                {confirmedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[var(--table-row-hover)] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {booking.student.photo_url ? (
                          <img
                            src={booking.student.photo_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover border border-[var(--border-strong)]"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-100)] text-[10px] font-bold text-[var(--primary-800)] uppercase">
                            {booking.student.first_name[0]}
                            {booking.student.last_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {booking.student.first_name}{" "}
                            {booking.student.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      {booking.booked_by_user.first_name}{" "}
                      {booking.booked_by_user.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--badge-neutral-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--badge-neutral-fg)] uppercase">
                        {booking.booking_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums font-medium">
                      {booking.checked_in_at ? (
                        <span className="text-[var(--success)]">
                          {new Date(booking.checked_in_at).toLocaleTimeString(
                            "en-AU",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--empty-state-icon)]"> - </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm tabular-nums font-medium">
                      {booking.checked_out_at ? (
                        <span className="text-[var(--info)]">
                          {new Date(booking.checked_out_at).toLocaleTimeString(
                            "en-AU",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--empty-state-icon)]"> - </span>
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
          <h2 className="text-xs font-bold text-[var(--primary-700)] uppercase tracking-widest">
            Waitlisted ({waitlistedBookings.length})
          </h2>
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--primary-200)] bg-[var(--primary-50)] shadow-[var(--shadow-xs)]">
            <ul className="divide-y divide-[var(--primary-100)]">
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
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary-200)] text-xs font-bold text-[var(--primary-900)] tabular-nums">
                        {booking.waitlist_position ?? "?"}
                      </span>
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {booking.student.first_name} {booking.student.last_name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--primary-600)] uppercase">
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
        <details className="group space-y-3">
          <summary className="cursor-pointer text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-widest hover:text-[var(--foreground)] transition-colors outline-none">
            Cancelled & No-shows ({cancelledBookings.length})
          </summary>
          <ul className="mt-2 space-y-2 animate-slide-down">
            {cancelledBookings.map((booking) => {
              const bsConfig =
                BOOKING_STATUS_CONFIG[booking.status] ??
                BOOKING_STATUS_CONFIG.cancelled;
              return (
                <li
                  key={booking.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--muted)] px-3 py-2 border border-[var(--border)]"
                >
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">
                    {booking.student.first_name} {booking.student.last_name}
                  </span>
                  <span
                    className={`status-badge-plain rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${bsConfig.badgeBg} ${bsConfig.badgeText}`}
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