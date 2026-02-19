// src/lib/actions/programs/recurring-patterns.ts
//
// ============================================================
// WattleOS V2 - Module 11: Recurring Booking Pattern Actions
// ============================================================
// Manages recurring booking patterns - the "every Tuesday and
// Thursday OSHC" rule that parents set up. When sessions are
// generated (via generateSessions), these patterns are applied
// to auto-create bookings.
//
// WHY patterns separate from bookings: A pattern is the rule
// ("every Tuesday"); a booking is the instance ("Tuesday 25th
// Feb"). Separating them lets parents pause/cancel the pattern
// without touching individual bookings, and lets the session
// generator apply patterns idempotently.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { Student, User } from "@/types/domain";
import type { DayOfWeek, Program } from "./programs";

// ============================================================
// Types
// ============================================================

export type RecurringPatternStatus = "active" | "paused" | "cancelled";

export interface RecurringBookingPattern {
  id: string;
  tenant_id: string;
  program_id: string;
  student_id: string;
  booked_by: string;
  days_of_week: DayOfWeek[];
  effective_from: string;
  effective_until: string | null;
  status: RecurringPatternStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RecurringPatternWithDetails extends RecurringBookingPattern {
  program: Pick<
    Program,
    "id" | "name" | "code" | "program_type" | "session_fee_cents"
  >;
  student: Pick<Student, "id" | "first_name" | "last_name">;
  booked_by_user: Pick<User, "id" | "first_name" | "last_name">;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateRecurringPatternInput {
  program_id: string;
  student_id: string;
  days_of_week: DayOfWeek[];
  effective_from: string;
  effective_until?: string | null;
}

export interface UpdateRecurringPatternInput {
  days_of_week?: DayOfWeek[];
  effective_until?: string | null;
  status?: RecurringPatternStatus;
}

// ============================================================
// CREATE RECURRING PATTERN
// ============================================================
// Can be created by parent (RLS is_guardian_of) or staff
// (MANAGE_BOOKINGS). Validates that the requested days match
// the program's default_days.
// ============================================================

export async function createRecurringPattern(
  input: CreateRecurringPatternInput,
): Promise<ActionResponse<RecurringBookingPattern>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (input.days_of_week.length === 0) {
      return failure(
        "At least one day of the week is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (!input.effective_from) {
      return failure(
        "Effective from date is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Validate program exists and requested days are within program's schedule
    const { data: program, error: pgError } = await supabase
      .from("programs")
      .select("id, default_days, is_active")
      .eq("id", input.program_id)
      .is("deleted_at", null)
      .single();

    if (pgError || !program) {
      return failure("Program not found", ErrorCodes.NOT_FOUND);
    }

    const pg = program as {
      id: string;
      default_days: DayOfWeek[];
      is_active: boolean;
    };

    if (!pg.is_active) {
      return failure(
        "This program is not currently active",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check that requested days are within program's schedule
    const invalidDays = input.days_of_week.filter(
      (d) => !pg.default_days.includes(d),
    );
    if (invalidDays.length > 0) {
      return failure(
        `This program does not run on: ${invalidDays.join(", ")}. Available days: ${pg.default_days.join(", ")}`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check for existing active pattern for this student + program
    const { data: existing } = await supabase
      .from("recurring_booking_patterns")
      .select("id, status")
      .eq("program_id", input.program_id)
      .eq("student_id", input.student_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1);

    if (existing && existing.length > 0) {
      return failure(
        "An active recurring pattern already exists for this student and program. Update or cancel the existing pattern first.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    const { data, error } = await supabase
      .from("recurring_booking_patterns")
      .insert({
        tenant_id: context.tenant.id,
        program_id: input.program_id,
        student_id: input.student_id,
        booked_by: context.user.id,
        days_of_week: input.days_of_week,
        effective_from: input.effective_from,
        effective_until: input.effective_until ?? null,
        status: "active" as RecurringPatternStatus,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as RecurringBookingPattern);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create recurring pattern";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE RECURRING PATTERN
// ============================================================
// Updates days, end date, or status. Changing days only
// affects future session generation - existing bookings
// are not modified.
// ============================================================

export async function updateRecurringPattern(
  patternId: string,
  input: UpdateRecurringPatternInput,
): Promise<ActionResponse<RecurringBookingPattern>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.days_of_week !== undefined) {
      if (input.days_of_week.length === 0) {
        return failure(
          "At least one day is required",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      updateData.days_of_week = input.days_of_week;
    }
    if (input.effective_until !== undefined)
      updateData.effective_until = input.effective_until;
    if (input.status !== undefined) updateData.status = input.status;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("recurring_booking_patterns")
      .update(updateData)
      .eq("id", patternId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as RecurringBookingPattern);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update pattern";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PAUSE RECURRING PATTERN
// ============================================================
// Convenience action: sets status to 'paused'. Future
// session generation will skip this pattern. Existing
// bookings remain untouched.
// ============================================================

export async function pauseRecurringPattern(
  patternId: string,
): Promise<ActionResponse<RecurringBookingPattern>> {
  return updateRecurringPattern(patternId, { status: "paused" });
}

// ============================================================
// RESUME RECURRING PATTERN
// ============================================================

export async function resumeRecurringPattern(
  patternId: string,
): Promise<ActionResponse<RecurringBookingPattern>> {
  return updateRecurringPattern(patternId, { status: "active" });
}

// ============================================================
// CANCEL RECURRING PATTERN
// ============================================================
// Sets status to 'cancelled' and optionally sets effective_until
// to today. Does NOT cancel existing bookings - those remain
// as individual bookings that can be cancelled separately.
//
// WHY not cascade cancel: A parent might cancel the recurring
// pattern but still want to attend already-booked sessions.
// ============================================================

export async function cancelRecurringPattern(
  patternId: string,
  cancelFutureBookings: boolean = false,
): Promise<ActionResponse<RecurringBookingPattern>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("recurring_booking_patterns")
      .update({
        status: "cancelled" as RecurringPatternStatus,
        effective_until: today,
      })
      .eq("id", patternId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    const pattern = data as RecurringBookingPattern;

    // Optionally cancel future bookings tied to this pattern
    if (cancelFutureBookings) {
      // Find future sessions
      const { data: futureSessions } = await supabase
        .from("program_sessions")
        .select("id")
        .eq("program_id", pattern.program_id)
        .gt("date", today)
        .is("deleted_at", null);

      if (futureSessions && futureSessions.length > 0) {
        const sessionIds = (futureSessions as Array<{ id: string }>).map(
          (s) => s.id,
        );

        await supabase
          .from("session_bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_by: context.user.id,
            cancellation_reason: "Recurring pattern cancelled",
          })
          .eq("recurring_pattern_id", patternId)
          .eq("student_id", pattern.student_id)
          .in("session_id", sessionIds)
          .eq("status", "confirmed")
          .is("deleted_at", null);
      }
    }

    return success(pattern);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel pattern";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST PATTERNS FOR STUDENT
// ============================================================
// Returns all recurring patterns for a student with program
// details. Used in the parent portal "My Bookings" page.
// ============================================================

export async function getStudentPatterns(
  studentId: string,
): Promise<ActionResponse<RecurringPatternWithDetails[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_booking_patterns")
      .select(
        `
        *,
        program:programs!recurring_booking_patterns_program_id_fkey(id, name, code, program_type, session_fee_cents),
        student:students!recurring_booking_patterns_student_id_fkey(id, first_name, last_name),
        booked_by_user:users!recurring_booking_patterns_booked_by_fkey(id, first_name, last_name)
      `,
      )
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as RecurringPatternWithDetails[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get patterns";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST PATTERNS FOR PROGRAM (Staff view)
// ============================================================
// Permission: MANAGE_PROGRAMS
// Returns all active/paused recurring patterns for a program.
// Used in the program detail admin page.
// ============================================================

export async function getProgramPatterns(
  programId: string,
): Promise<ActionResponse<RecurringPatternWithDetails[]>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("recurring_booking_patterns")
      .select(
        `
        *,
        program:programs!recurring_booking_patterns_program_id_fkey(id, name, code, program_type, session_fee_cents),
        student:students!recurring_booking_patterns_student_id_fkey(id, first_name, last_name),
        booked_by_user:users!recurring_booking_patterns_booked_by_fkey(id, first_name, last_name)
      `,
      )
      .eq("program_id", programId)
      .in("status", ["active", "paused"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as RecurringPatternWithDetails[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get patterns";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// APPLY RECURRING PATTERNS TO SESSIONS
// ============================================================
// Permission: MANAGE_PROGRAMS
// For a given program, finds all upcoming sessions and creates
// bookings from active recurring patterns. Idempotent - skips
// sessions where the student already has a booking.
//
// WHY explicit action: This runs after generateSessions to
// fill new sessions with recurring bookings. Can also be
// triggered manually after a new pattern is created to
// back-fill already-generated sessions.
// ============================================================

export async function applyPatternsToSessions(
  programId: string,
): Promise<ActionResponse<{ bookings_created: number; skipped: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    // Get active patterns for this program
    const { data: patterns } = await supabase
      .from("recurring_booking_patterns")
      .select("*")
      .eq("program_id", programId)
      .eq("status", "active")
      .is("deleted_at", null);

    if (!patterns || patterns.length === 0) {
      return success({ bookings_created: 0, skipped: 0 });
    }

    // Get upcoming sessions
    const { data: sessions } = await supabase
      .from("program_sessions")
      .select("id, date, program_id")
      .eq("program_id", programId)
      .gte("date", today)
      .eq("status", "scheduled")
      .is("deleted_at", null);

    if (!sessions || sessions.length === 0) {
      return success({ bookings_created: 0, skipped: 0 });
    }

    // Get program for fee info
    const { data: program } = await supabase
      .from("programs")
      .select("session_fee_cents")
      .eq("id", programId)
      .single();

    const feeCents = program
      ? (program as { session_fee_cents: number }).session_fee_cents
      : 0;

    const dayMap: Record<string, DayOfWeek> = {
      "0": "sunday",
      "1": "monday",
      "2": "tuesday",
      "3": "wednesday",
      "4": "thursday",
      "5": "friday",
      "6": "saturday",
    };

    let created = 0;
    let skipped = 0;

    for (const pattern of patterns as RecurringBookingPattern[]) {
      for (const sess of sessions as Array<{
        id: string;
        date: string;
        program_id: string;
      }>) {
        // Check if session date is within pattern's effective range
        if (sess.date < pattern.effective_from) continue;
        if (pattern.effective_until && sess.date > pattern.effective_until)
          continue;

        // Check if session's day of week matches pattern
        const sessionDate = new Date(sess.date + "T00:00:00");
        const sessionDay = dayMap[String(sessionDate.getDay())];
        if (!pattern.days_of_week.includes(sessionDay)) continue;

        // Check if booking already exists
        const { data: existing } = await supabase
          .from("session_bookings")
          .select("id")
          .eq("session_id", sess.id)
          .eq("student_id", pattern.student_id)
          .is("deleted_at", null)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Create booking
        const { error: insertError } = await supabase
          .from("session_bookings")
          .insert({
            tenant_id: context.tenant.id,
            session_id: sess.id,
            student_id: pattern.student_id,
            booked_by: pattern.booked_by,
            booking_type: "recurring",
            recurring_pattern_id: pattern.id,
            status: "confirmed",
            fee_cents: feeCents,
            billing_status: "unbilled",
          });

        if (!insertError) {
          created++;
        } else {
          skipped++;
        }
      }
    }

    return success({ bookings_created: created, skipped });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to apply patterns";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
