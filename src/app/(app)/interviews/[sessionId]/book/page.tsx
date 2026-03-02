// src/app/(app)/interviews/[sessionId]/book/page.tsx
// Family/parent: view existing booking + book a new slot

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getFamilyInterviewView,
  getAvailableSlotsForBooking,
} from "@/lib/actions/interviews";
import { BookingForm } from "@/components/domain/interviews/booking-form";
import { InterviewBookingStatusBadge } from "@/components/domain/interviews/interview-status-badge";

interface Props {
  params: Promise<{ sessionId: string }>;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m}${suffix}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function BookInterviewPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canBook = hasPermission(context, Permissions.BOOK_INTERVIEW);
  if (!canBook) redirect("/interviews");

  const [viewResult, slotsResult] = await Promise.all([
    getFamilyInterviewView(sessionId),
    getAvailableSlotsForBooking(sessionId),
  ]);

  if (viewResult.error || !viewResult.data) notFound();

  const { session, students } = viewResult.data;
  const availableSlots = slotsResult.error || !slotsResult.data ? [] : slotsResult.data;

  // Students that don't yet have an active booking
  const unbookedStudents = students
    .filter((s) => !s.existing_booking)
    .map((s) => s.student);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-tab-bar space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Book an Interview
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {session.title}
        </p>
        {session.description && (
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {session.description}
          </p>
        )}
      </div>

      {/* Existing bookings */}
      {students.some((s) => s.existing_booking) && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Current bookings
          </h2>
          <div className="space-y-2">
            {students
              .filter((s) => s.existing_booking)
              .map(({ student, existing_booking: b }) => (
                <div
                  key={student.id}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--interview-booking-confirmed-bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        {student.first_name} {student.last_name}
                      </p>
                      {b && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--interview-booking-confirmed-fg)" }}>
                          {formatDate(b.slot.slot_date)} at {formatTime(b.slot.start_time)}
                          {" · "}{b.staff.first_name} {b.staff.last_name}
                          {b.slot.location && ` · ${b.slot.location}`}
                        </p>
                      )}
                    </div>
                    {b && <InterviewBookingStatusBadge status={b.status} size="sm" />}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Booking form for students without a booking */}
      {unbookedStudents.length > 0 ? (
        <div>
          {students.some((s) => s.existing_booking) && (
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Book another child
            </h2>
          )}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <BookingForm
              sessionId={sessionId}
              slots={availableSlots}
              students={unbookedStudents}
            />
          </div>
        </div>
      ) : (
        students.length > 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-3xl mb-2" style={{ color: "var(--empty-state-icon)" }}>✅</p>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              All your children are booked in.
            </p>
          </div>
        )
      )}

      {students.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No enrolled children found linked to your account.
          </p>
        </div>
      )}
    </div>
  );
}
