// src/lib/actions/programs/session-bookings.ts
//
// ============================================================
// WattleOS V2 - Module 11: Session Booking Server Actions
// ============================================================
// Handles the full booking lifecycle: book → confirm/waitlist
// → check-in → check-out → complete. Includes cancellation
// with policy enforcement (late cancellation fees) and
// automatic waitlist promotion when a spot opens.
//
// WHY bookings track check-in/out: For CCS compliance,
// Australian schools must record exact attendance times for
// each funded session. The kiosk view calls checkIn/checkOut
// which timestamps directly on the booking row.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { Student, User } from "@/types/domain";
import type { Program, ProgramSession, SessionStatus } from "./programs";

// ============================================================
// Types
// ============================================================

export type BookingType = "recurring" | "casual" | "makeup";
export type BookingStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "no_show";
export type BillingStatus = "unbilled" | "billed" | "waived" | "refunded";

export interface SessionBooking {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  booked_by: string;
  booking_type: BookingType;
  recurring_pattern_id: string | null;
  status: BookingStatus;
  waitlist_position: number | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  fee_cents: number;
  billing_status: BillingStatus;
  invoice_line_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  late_cancellation: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SessionBookingWithDetails extends SessionBooking {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "dob" | "photo_url"
  >;
  booked_by_user: Pick<User, "id" | "first_name" | "last_name">;
  session: Pick<
    ProgramSession,
    "id" | "date" | "start_time" | "end_time" | "status"
  > & {
    program: Pick<Program, "id" | "name" | "code" | "program_type">;
  };
}

/** Compact view for kiosk - minimal data, big tap targets */
export interface KioskBookingRow {
  booking_id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_photo_url: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  has_medical_conditions: boolean;
  medical_summary: string | null;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateBookingInput {
  session_id: string;
  student_id: string;
  booking_type?: BookingType;
  recurring_pattern_id?: string | null;
}

export interface CancelBookingInput {
  booking_id: string;
  reason?: string;
}

// ============================================================
// CREATE BOOKING (Parent or Staff)
// ============================================================
// Parents book via RLS (is_guardian_of). Staff book via
// MANAGE_BOOKINGS permission. Automatically waitlists if
// session is at capacity.
//
// WHY fee calculated at booking time: The fee is locked in
// when the booking is created (casual vs recurring rate).
// Changing the program price later doesn't affect existing
// bookings - this matches how real-world OSHC billing works.
// ============================================================

export async function createBooking(
  input: CreateBookingInput,
): Promise<ActionResponse<SessionBooking>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch session + program to determine capacity and pricing
    const { data: session, error: sessError } = await supabase
      .from("program_sessions")
      .select(
        `
        *,
        program:programs!program_sessions_program_id_fkey(
          id, max_capacity, session_fee_cents, casual_fee_cents
        )
      `,
      )
      .eq("id", input.session_id)
      .is("deleted_at", null)
      .single();

    if (sessError || !session) {
      return failure("Session not found", ErrorCodes.NOT_FOUND);
    }

    const sess = session as ProgramSession & {
      program: Pick<
        Program,
        "id" | "max_capacity" | "session_fee_cents" | "casual_fee_cents"
      >;
    };

    if (sess.status === "cancelled") {
      return failure(
        "This session has been cancelled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (sess.status === "completed") {
      return failure(
        "This session has already completed",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check for duplicate booking
    const { data: existing } = await supabase
      .from("session_bookings")
      .select("id, status")
      .eq("session_id", input.session_id)
      .eq("student_id", input.student_id)
      .is("deleted_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      const existingStatus = (existing[0] as { status: string }).status;
      if (existingStatus !== "cancelled") {
        return failure(
          "This student already has a booking for this session",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
    }

    // Determine capacity
    const effectiveCapacity =
      sess.max_capacity ?? sess.program.max_capacity ?? null;

    // Count current confirmed bookings
    const { count: confirmedCount } = await supabase
      .from("session_bookings")
      .select("id", { count: "exact", head: true })
      .eq("session_id", input.session_id)
      .eq("status", "confirmed")
      .is("deleted_at", null);

    const isAtCapacity =
      effectiveCapacity !== null && (confirmedCount ?? 0) >= effectiveCapacity;

    // Determine status and waitlist position
    let bookingStatus: BookingStatus = "confirmed";
    let waitlistPosition: number | null = null;

    if (isAtCapacity) {
      bookingStatus = "waitlisted";

      // Get next waitlist position
      const { data: lastWaitlisted } = await supabase
        .from("session_bookings")
        .select("waitlist_position")
        .eq("session_id", input.session_id)
        .eq("status", "waitlisted")
        .is("deleted_at", null)
        .order("waitlist_position", { ascending: false })
        .limit(1);

      const lastPos =
        lastWaitlisted && lastWaitlisted.length > 0
          ? ((lastWaitlisted[0] as { waitlist_position: number | null })
              .waitlist_position ?? 0)
          : 0;

      waitlistPosition = lastPos + 1;
    }

    // Determine fee
    const bookingType = input.booking_type ?? "casual";
    const feeCents =
      bookingType === "casual"
        ? (sess.program.casual_fee_cents ?? sess.program.session_fee_cents)
        : sess.program.session_fee_cents;

    const { data, error } = await supabase
      .from("session_bookings")
      .insert({
        tenant_id: context.tenant.id,
        session_id: input.session_id,
        student_id: input.student_id,
        booked_by: context.user.id,
        booking_type: bookingType,
        recurring_pattern_id: input.recurring_pattern_id ?? null,
        status: bookingStatus,
        waitlist_position: waitlistPosition,
        fee_cents: feeCents,
        billing_status: "unbilled" as BillingStatus,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "This student already has a booking for this session",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create booking";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CANCEL BOOKING
// ============================================================
// Enforces cancellation policy: if within the notice period,
// marks as late_cancellation (fee may still apply). After
// cancelling, promotes the next waitlisted child.
// ============================================================

export async function cancelBooking(
  input: CancelBookingInput,
): Promise<ActionResponse<SessionBooking>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch booking + session + program for policy check
    const { data: booking, error: bkError } = await supabase
      .from("session_bookings")
      .select(
        `
        *,
        session:program_sessions!session_bookings_session_id_fkey(
          id, date, start_time, status,
          program:programs!program_sessions_program_id_fkey(
            cancellation_notice_hours, late_cancel_fee_cents
          )
        )
      `,
      )
      .eq("id", input.booking_id)
      .is("deleted_at", null)
      .single();

    if (bkError || !booking) {
      return failure("Booking not found", ErrorCodes.NOT_FOUND);
    }

    const bk = booking as SessionBooking & {
      session: {
        id: string;
        date: string;
        start_time: string;
        status: SessionStatus;
        program: {
          cancellation_notice_hours: number;
          late_cancel_fee_cents: number;
        };
      };
    };

    if (bk.status === "cancelled") {
      return failure(
        "Booking is already cancelled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check if this is a late cancellation
    const sessionStart = new Date(
      `${bk.session.date}T${bk.session.start_time}`,
    );
    const noticeHours = bk.session.program.cancellation_notice_hours;
    const cutoff = new Date(
      sessionStart.getTime() - noticeHours * 60 * 60 * 1000,
    );
    const isLate = new Date() > cutoff;

    const { data, error } = await supabase
      .from("session_bookings")
      .update({
        status: "cancelled" as BookingStatus,
        cancelled_at: new Date().toISOString(),
        cancelled_by: context.user.id,
        cancellation_reason: input.reason?.trim() ?? null,
        late_cancellation: isLate,
      })
      .eq("id", input.booking_id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    // If the cancelled booking was confirmed, promote next waitlisted
    if (bk.status === "confirmed") {
      await promoteNextWaitlisted(supabase, bk.session_id);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel booking";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PROMOTE NEXT WAITLISTED (internal helper)
// ============================================================
// Finds the waitlisted booking with the lowest position and
// promotes it to confirmed. Resets waitlist_position to null.
// ============================================================

async function promoteNextWaitlisted(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sessionId: string,
): Promise<void> {
  const { data: nextWaiting } = await supabase
    .from("session_bookings")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "waitlisted")
    .is("deleted_at", null)
    .order("waitlist_position", { ascending: true })
    .limit(1);

  if (nextWaiting && nextWaiting.length > 0) {
    const nextId = (nextWaiting[0] as { id: string }).id;
    await supabase
      .from("session_bookings")
      .update({
        status: "confirmed" as BookingStatus,
        waitlist_position: null,
      })
      .eq("id", nextId);

    // TODO: Send notification to parent that their child has been
    // promoted from waitlist (via Module 12 notification system)
  }
}

// ============================================================
// CHECK IN (Kiosk)
// ============================================================
// Permission: CHECKIN_CHECKOUT
// Records the check-in timestamp and who performed it.
// Designed for iPad kiosk tap - one call per child.
// ============================================================

export async function checkIn(
  bookingId: string,
): Promise<ActionResponse<SessionBooking>> {
  try {
    const context = await requirePermission(Permissions.CHECKIN_CHECKOUT);
    const supabase = await createSupabaseServerClient();

    // Verify booking exists and is confirmed
    const { data: existing, error: fetchError } = await supabase
      .from("session_bookings")
      .select("id, status, checked_in_at")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Booking not found", ErrorCodes.NOT_FOUND);
    }

    const bk = existing as {
      id: string;
      status: string;
      checked_in_at: string | null;
    };

    if (bk.status !== "confirmed") {
      return failure(
        `Cannot check in a ${bk.status} booking`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (bk.checked_in_at) {
      return failure(
        "Child is already checked in",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("session_bookings")
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: context.user.id,
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check in";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CHECK OUT (Kiosk)
// ============================================================
// Permission: CHECKIN_CHECKOUT
// Records the check-out timestamp. Must be after check-in.
// ============================================================

export async function checkOut(
  bookingId: string,
): Promise<ActionResponse<SessionBooking>> {
  try {
    const context = await requirePermission(Permissions.CHECKIN_CHECKOUT);
    const supabase = await createSupabaseServerClient();

    // Verify booking is checked in
    const { data: existing, error: fetchError } = await supabase
      .from("session_bookings")
      .select("id, checked_in_at, checked_out_at")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Booking not found", ErrorCodes.NOT_FOUND);
    }

    const bk = existing as {
      id: string;
      checked_in_at: string | null;
      checked_out_at: string | null;
    };

    if (!bk.checked_in_at) {
      return failure(
        "Child must be checked in before checking out",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (bk.checked_out_at) {
      return failure(
        "Child is already checked out",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("session_bookings")
      .update({
        checked_out_at: new Date().toISOString(),
        checked_out_by: context.user.id,
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check out";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UNDO CHECK-IN (Kiosk mistake correction)
// ============================================================
// Permission: CHECKIN_CHECKOUT
// Clears the check-in timestamp. Only works if not yet
// checked out.
// ============================================================

export async function undoCheckIn(
  bookingId: string,
): Promise<ActionResponse<SessionBooking>> {
  try {
    await requirePermission(Permissions.CHECKIN_CHECKOUT);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("session_bookings")
      .select("id, checked_in_at, checked_out_at")
      .eq("id", bookingId)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Booking not found", ErrorCodes.NOT_FOUND);
    }

    const bk = existing as {
      id: string;
      checked_in_at: string | null;
      checked_out_at: string | null;
    };

    if (!bk.checked_in_at) {
      return failure("Child is not checked in", ErrorCodes.VALIDATION_ERROR);
    }

    if (bk.checked_out_at) {
      return failure(
        "Cannot undo check-in after check-out",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("session_bookings")
      .update({
        checked_in_at: null,
        checked_in_by: null,
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to undo check-in";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MARK NO-SHOW
// ============================================================
// Permission: MANAGE_BOOKINGS
// Marks a confirmed booking as no_show. Child didn't attend
// but the fee may still apply depending on school policy.
// ============================================================

export async function markNoShow(
  bookingId: string,
): Promise<ActionResponse<SessionBooking>> {
  try {
    await requirePermission(Permissions.MANAGE_BOOKINGS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("session_bookings")
      .update({ status: "no_show" as BookingStatus })
      .eq("id", bookingId)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark no-show";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SESSION BOOKINGS (Staff view - for session detail page)
// ============================================================
// Returns all bookings for a session with student details.
// Used on the session detail page and kiosk view.
// ============================================================

export async function getSessionBookings(
  sessionId: string,
): Promise<ActionResponse<SessionBookingWithDetails[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("session_bookings")
      .select(
        `
        *,
        student:students!session_bookings_student_id_fkey(id, first_name, last_name, date_of_birth, photo_url),
        booked_by_user:users!session_bookings_booked_by_fkey(id, first_name, last_name),
        session:program_sessions!session_bookings_session_id_fkey(
          id, date, start_time, end_time, status,
          program:programs!program_sessions_program_id_fkey(id, name, code, program_type)
        )
      `,
      )
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as SessionBookingWithDetails[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get bookings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET KIOSK DATA (Today's sessions)
// ============================================================
// Permission: CHECKIN_CHECKOUT
// Returns today's sessions with booked children in a compact
// format optimised for the kiosk iPad view. Includes medical
// alert badges for safety.
// ============================================================

export interface KioskSessionData {
  session_id: string;
  program_name: string;
  program_code: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  bookings: KioskBookingRow[];
}

export async function getKioskData(): Promise<
  ActionResponse<KioskSessionData[]>
> {
  try {
    await requirePermission(Permissions.CHECKIN_CHECKOUT);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    // Get today's sessions
    const { data: sessions, error: sessError } = await supabase
      .from("program_sessions")
      .select(
        `
        id, start_time, end_time, location,
        program:programs!program_sessions_program_id_fkey(name, code)
      `,
      )
      .eq("date", today)
      .eq("status", "scheduled")
      .is("deleted_at", null)
      .order("start_time", { ascending: true });

    if (sessError) {
      return failure(sessError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!sessions || sessions.length === 0) {
      return success([]);
    }

    const kioskSessions: KioskSessionData[] = [];

    for (const sess of sessions as Array<Record<string, unknown>>) {
      const sessId = sess.id as string;
      const program = sess.program as { name: string; code: string | null };

      // Get confirmed bookings with student info
      const { data: bookings } = await supabase
        .from("session_bookings")
        .select(
          `
          id, checked_in_at, checked_out_at,
          student:students!session_bookings_student_id_fkey(
            id, first_name, last_name, photo_url
          )
        `,
        )
        .eq("session_id", sessId)
        .eq("status", "confirmed")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      // Get medical conditions for these students
      const studentIds = (
        (bookings ?? []) as Array<Record<string, unknown>>
      ).map((b) => (b.student as { id: string }).id);

      let medicalMap = new Map<
        string,
        { has_conditions: boolean; summary: string | null }
      >();

      if (studentIds.length > 0) {
        const { data: conditions } = await supabase
          .from("medical_conditions")
          .select("student_id, condition_name, severity")
          .in("student_id", studentIds)
          .is("deleted_at", null);

        // Group by student
        const conditionsByStudent = new Map<
          string,
          Array<{ condition_name: string; severity: string }>
        >();
        for (const c of (conditions ?? []) as Array<{
          student_id: string;
          condition_name: string;
          severity: string;
        }>) {
          if (!conditionsByStudent.has(c.student_id)) {
            conditionsByStudent.set(c.student_id, []);
          }
          conditionsByStudent.get(c.student_id)!.push(c);
        }

        for (const sid of studentIds) {
          const studentConditions = conditionsByStudent.get(sid) ?? [];
          medicalMap.set(sid, {
            has_conditions: studentConditions.length > 0,
            summary:
              studentConditions.length > 0
                ? studentConditions
                    .map((c) => `${c.condition_name} (${c.severity})`)
                    .join(", ")
                : null,
          });
        }
      }

      const kioskBookings: KioskBookingRow[] = (
        (bookings ?? []) as Array<Record<string, unknown>>
      ).map((b) => {
        const student = b.student as {
          id: string;
          first_name: string;
          last_name: string;
          photo_url: string | null;
        };
        const medical = medicalMap.get(student.id);

        return {
          booking_id: b.id as string,
          student_id: student.id,
          student_first_name: student.first_name,
          student_last_name: student.last_name,
          student_photo_url: student.photo_url,
          checked_in_at: b.checked_in_at as string | null,
          checked_out_at: b.checked_out_at as string | null,
          has_medical_conditions: medical?.has_conditions ?? false,
          medical_summary: medical?.summary ?? null,
        };
      });

      kioskSessions.push({
        session_id: sessId,
        program_name: program.name,
        program_code: program.code,
        start_time: sess.start_time as string,
        end_time: sess.end_time as string,
        location: sess.location as string | null,
        bookings: kioskBookings,
      });
    }

    return success(kioskSessions);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get kiosk data";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET STUDENT BOOKINGS (Parent view)
// ============================================================
// Returns upcoming bookings for a specific student.
// No special permission - RLS is_guardian_of handles access.
// ============================================================

export async function getStudentBookings(
  studentId: string,
  params: { from_date?: string; include_past?: boolean } = {},
): Promise<ActionResponse<SessionBookingWithDetails[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const fromDate = params.from_date ?? new Date().toISOString().split("T")[0];

    let query = supabase
      .from("session_bookings")
      .select(
        `
        *,
        student:students!session_bookings_student_id_fkey(id, first_name, last_name, date_of_birth, photo_url),
        booked_by_user:users!session_bookings_booked_by_fkey(id, first_name, last_name),
        session:program_sessions!session_bookings_session_id_fkey(
          id, date, start_time, end_time, status,
          program:programs!program_sessions_program_id_fkey(id, name, code, program_type)
        )
      `,
      )
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    // Note: filtering by session date requires a join filter.
    // We'll filter client-side for simplicity since bookings
    // per student are typically <100.

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    let bookings = (data ?? []) as SessionBookingWithDetails[];

    // Filter by date if not including past
    if (!params.include_past) {
      bookings = bookings.filter((b) => b.session.date >= fromDate);
    }

    return success(bookings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get student bookings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET PARENT'S CHILDREN BOOKINGS (aggregated)
// ============================================================
// Returns upcoming bookings across all children for the
// current parent. Powers the "My Bookings" portal page.
// ============================================================

export async function getMyChildrenBookings(
  params: { from_date?: string } = {},
): Promise<ActionResponse<SessionBookingWithDetails[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get parent's children
    const { data: guardianships } = await supabase
      .from("guardians")
      .select("student_id")
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    const studentIds = (guardianships ?? []).map(
      (g) => (g as { student_id: string }).student_id,
    );

    if (studentIds.length === 0) {
      return success([]);
    }

    const fromDate = params.from_date ?? new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("session_bookings")
      .select(
        `
        *,
        student:students!session_bookings_student_id_fkey(id, first_name, last_name, date_of_birth, photo_url),
        booked_by_user:users!session_bookings_booked_by_fkey(id, first_name, last_name),
        session:program_sessions!session_bookings_session_id_fkey(
          id, date, start_time, end_time, status,
          program:programs!program_sessions_program_id_fkey(id, name, code, program_type)
        )
      `,
      )
      .in("student_id", studentIds)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Filter to upcoming sessions
    const bookings = ((data ?? []) as SessionBookingWithDetails[]).filter(
      (b) => b.session.date >= fromDate,
    );

    return success(bookings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get bookings";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE BILLING STATUS
// ============================================================
// Permission: MANAGE_BOOKINGS
// Called by billing integration to mark bookings as billed,
// waived, or refunded.
// ============================================================

export async function updateBillingStatus(
  bookingId: string,
  billingStatus: BillingStatus,
  invoiceLineId?: string | null,
): Promise<ActionResponse<SessionBooking>> {
  try {
    await requirePermission(Permissions.MANAGE_BOOKINGS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {
      billing_status: billingStatus,
    };

    if (invoiceLineId !== undefined) {
      updateData.invoice_line_id = invoiceLineId;
    }

    const { data, error } = await supabase
      .from("session_bookings")
      .update(updateData)
      .eq("id", bookingId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SessionBooking);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update billing status";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
