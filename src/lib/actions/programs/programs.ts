// src/lib/actions/programs/programs.ts
//
// ============================================================
// WattleOS V2 - Module 11: Program & Session Server Actions
// ============================================================
// Manages the full lifecycle of extended-day, OSHC, and
// extracurricular programs. Programs define the template
// (schedule, pricing, capacity); sessions are concrete
// bookable instances generated from those patterns.
//
// WHY programs own sessions: A program is the config, a
// session is a specific date. Sessions are pre-generated
// so parents can browse availability weeks in advance and
// staff can override individual dates (e.g., cancel for a
// public holiday).
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ActionResponse,
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type { User } from "@/types/domain";

// ============================================================
// Types
// ============================================================

export type ProgramType =
  | "before_school_care"
  | "after_school_care"
  | "vacation_care"
  | "extracurricular"
  | "extended_day"
  | "adolescent_program"
  | "senior_elective"
  | "other";

export type BillingType = "per_session" | "per_term" | "per_year" | "included";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Program {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  program_type: ProgramType;
  description: string | null;
  min_age_months: number | null;
  max_age_months: number | null;
  eligible_class_ids: string[] | null;
  default_start_time: string | null;
  default_end_time: string | null;
  default_days: DayOfWeek[];
  max_capacity: number | null;
  session_fee_cents: number;
  casual_fee_cents: number | null;
  billing_type: BillingType;
  cancellation_notice_hours: number;
  late_cancel_fee_cents: number;
  ccs_eligible: boolean;
  ccs_activity_type: string | null;
  ccs_service_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgramWithStats extends Program {
  upcoming_session_count: number;
  total_bookings_this_week: number;
}

export interface ProgramSession {
  id: string;
  tenant_id: string;
  program_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  status: SessionStatus;
  location: string | null;
  staff_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgramSessionWithDetails extends ProgramSession {
  program: Pick<
    Program,
    "id" | "name" | "code" | "program_type" | "max_capacity"
  >;
  staff: Pick<User, "id" | "first_name" | "last_name"> | null;
  confirmed_count: number;
  waitlisted_count: number;
  checked_in_count: number;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateProgramInput {
  name: string;
  code?: string | null;
  program_type: ProgramType;
  description?: string | null;
  min_age_months?: number | null;
  max_age_months?: number | null;
  eligible_class_ids?: string[] | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
  default_days?: DayOfWeek[];
  max_capacity?: number | null;
  session_fee_cents?: number;
  casual_fee_cents?: number | null;
  billing_type?: BillingType;
  cancellation_notice_hours?: number;
  late_cancel_fee_cents?: number;
  ccs_eligible?: boolean;
  ccs_activity_type?: string | null;
  ccs_service_id?: string | null;
}

export interface UpdateProgramInput {
  name?: string;
  code?: string | null;
  program_type?: ProgramType;
  description?: string | null;
  min_age_months?: number | null;
  max_age_months?: number | null;
  eligible_class_ids?: string[] | null;
  default_start_time?: string | null;
  default_end_time?: string | null;
  default_days?: DayOfWeek[];
  max_capacity?: number | null;
  session_fee_cents?: number;
  casual_fee_cents?: number | null;
  billing_type?: BillingType;
  cancellation_notice_hours?: number;
  late_cancel_fee_cents?: number;
  ccs_eligible?: boolean;
  ccs_activity_type?: string | null;
  ccs_service_id?: string | null;
  is_active?: boolean;
}

export interface CreateSessionInput {
  program_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity?: number | null;
  location?: string | null;
  staff_id?: string | null;
  notes?: string | null;
}

export interface UpdateSessionInput {
  start_time?: string;
  end_time?: string;
  max_capacity?: number | null;
  status?: SessionStatus;
  location?: string | null;
  staff_id?: string | null;
  notes?: string | null;
}

export interface ListProgramsParams {
  program_type?: ProgramType;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface ListSessionsParams {
  program_id?: string;
  from_date?: string;
  to_date?: string;
  status?: SessionStatus;
  staff_id?: string;
  page?: number;
  per_page?: number;
}

// ============================================================
// CREATE PROGRAM
// ============================================================
// Permission: MANAGE_PROGRAMS
// ============================================================

export async function createProgram(
  input: CreateProgramInput,
): Promise<ActionResponse<Program>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    if (!input.name.trim()) {
      return failure("Program name is required", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("programs")
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        code: input.code?.trim() ?? null,
        program_type: input.program_type,
        description: input.description?.trim() ?? null,
        min_age_months: input.min_age_months ?? null,
        max_age_months: input.max_age_months ?? null,
        eligible_class_ids: input.eligible_class_ids ?? null,
        default_start_time: input.default_start_time ?? null,
        default_end_time: input.default_end_time ?? null,
        default_days: input.default_days ?? [],
        max_capacity: input.max_capacity ?? null,
        session_fee_cents: input.session_fee_cents ?? 0,
        casual_fee_cents: input.casual_fee_cents ?? null,
        billing_type: input.billing_type ?? "per_session",
        cancellation_notice_hours: input.cancellation_notice_hours ?? 24,
        late_cancel_fee_cents: input.late_cancel_fee_cents ?? 0,
        ccs_eligible: input.ccs_eligible ?? false,
        ccs_activity_type: input.ccs_activity_type ?? null,
        ccs_service_id: input.ccs_service_id ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as Program);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create program";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE PROGRAM
// ============================================================

export async function updateProgram(
  programId: string,
  input: UpdateProgramInput,
): Promise<ActionResponse<Program>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.code !== undefined) updateData.code = input.code?.trim() ?? null;
    if (input.program_type !== undefined)
      updateData.program_type = input.program_type;
    if (input.description !== undefined)
      updateData.description = input.description?.trim() ?? null;
    if (input.min_age_months !== undefined)
      updateData.min_age_months = input.min_age_months;
    if (input.max_age_months !== undefined)
      updateData.max_age_months = input.max_age_months;
    if (input.eligible_class_ids !== undefined)
      updateData.eligible_class_ids = input.eligible_class_ids;
    if (input.default_start_time !== undefined)
      updateData.default_start_time = input.default_start_time;
    if (input.default_end_time !== undefined)
      updateData.default_end_time = input.default_end_time;
    if (input.default_days !== undefined)
      updateData.default_days = input.default_days;
    if (input.max_capacity !== undefined)
      updateData.max_capacity = input.max_capacity;
    if (input.session_fee_cents !== undefined)
      updateData.session_fee_cents = input.session_fee_cents;
    if (input.casual_fee_cents !== undefined)
      updateData.casual_fee_cents = input.casual_fee_cents;
    if (input.billing_type !== undefined)
      updateData.billing_type = input.billing_type;
    if (input.cancellation_notice_hours !== undefined)
      updateData.cancellation_notice_hours = input.cancellation_notice_hours;
    if (input.late_cancel_fee_cents !== undefined)
      updateData.late_cancel_fee_cents = input.late_cancel_fee_cents;
    if (input.ccs_eligible !== undefined)
      updateData.ccs_eligible = input.ccs_eligible;
    if (input.ccs_activity_type !== undefined)
      updateData.ccs_activity_type = input.ccs_activity_type;
    if (input.ccs_service_id !== undefined)
      updateData.ccs_service_id = input.ccs_service_id;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("programs")
      .update(updateData)
      .eq("id", programId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as Program);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update program";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE PROGRAM (soft delete)
// ============================================================

export async function deleteProgram(
  programId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("programs")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", programId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete program";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST PROGRAMS (Staff view - paginated)
// ============================================================
// Permission: MANAGE_PROGRAMS
// ============================================================

export async function listPrograms(
  params: ListProgramsParams = {},
): Promise<PaginatedResponse<ProgramWithStats>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Count
    let countQuery = supabase
      .from("programs")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (params.program_type)
      countQuery = countQuery.eq("program_type", params.program_type);
    if (params.is_active !== undefined)
      countQuery = countQuery.eq("is_active", params.is_active);

    const { count, error: countError } = await countQuery;

    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;
    if (total === 0) {
      return paginated([], 0, page, perPage);
    }

    // Data
    let query = supabase
      .from("programs")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params.program_type)
      query = query.eq("program_type", params.program_type);
    if (params.is_active !== undefined)
      query = query.eq("is_active", params.is_active);

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Enrich with stats
    const today = new Date().toISOString().split("T")[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const programs: ProgramWithStats[] = [];

    for (const row of (data ?? []) as Program[]) {
      // Upcoming session count
      const { count: sessionCount } = await supabase
        .from("program_sessions")
        .select("id", { count: "exact", head: true })
        .eq("program_id", row.id)
        .gte("date", today)
        .neq("status", "cancelled")
        .is("deleted_at", null);

      // Bookings this week
      const { data: weekSessions } = await supabase
        .from("program_sessions")
        .select("id")
        .eq("program_id", row.id)
        .gte("date", today)
        .lte("date", weekEnd)
        .is("deleted_at", null);

      let weekBookings = 0;
      if (weekSessions && weekSessions.length > 0) {
        const sessionIds = (weekSessions as Array<{ id: string }>).map(
          (s) => s.id,
        );
        const { count: bookingCount } = await supabase
          .from("session_bookings")
          .select("id", { count: "exact", head: true })
          .in("session_id", sessionIds)
          .eq("status", "confirmed")
          .is("deleted_at", null);

        weekBookings = bookingCount ?? 0;
      }

      programs.push({
        ...row,
        upcoming_session_count: sessionCount ?? 0,
        total_bookings_this_week: weekBookings,
      });
    }

    return paginated(programs, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list programs";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE PROGRAM
// ============================================================

export async function getProgram(
  programId: string,
): Promise<ActionResponse<Program>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Program not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as Program);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get program";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST ACTIVE PROGRAMS (Parent view)
// ============================================================
// No special permission - any authenticated tenant member
// can browse active programs.
// ============================================================

export async function listActivePrograms(): Promise<ActionResponse<Program[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("program_type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as Program[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list programs";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

// ============================================================
// CREATE SESSION (manual)
// ============================================================
// Permission: MANAGE_PROGRAMS
// Creates a single session for a specific date. Used for
// one-off sessions or overriding generated patterns.
// ============================================================

export async function createSession(
  input: CreateSessionInput,
): Promise<ActionResponse<ProgramSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    if (!input.date) {
      return failure("Session date is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.start_time || !input.end_time) {
      return failure(
        "Start and end times are required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("program_sessions")
      .insert({
        tenant_id: context.tenant.id,
        program_id: input.program_id,
        date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        max_capacity: input.max_capacity ?? null,
        status: "scheduled" as SessionStatus,
        location: input.location?.trim() ?? null,
        staff_id: input.staff_id ?? null,
        notes: input.notes?.trim() ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "A session already exists for this program on this date",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as ProgramSession);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create session";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GENERATE SESSIONS (bulk)
// ============================================================
// Permission: MANAGE_PROGRAMS
// Generates sessions for a program based on its default_days
// pattern for the next N weeks. Skips dates where a session
// already exists.
//
// WHY server action not cron: This gives admins explicit
// control. A cron job can call this same function on a
// schedule via an Edge Function wrapper.
// ============================================================

export async function generateSessions(
  programId: string,
  weeksAhead: number = 4,
): Promise<ActionResponse<{ created: number; skipped: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    // Fetch program
    const { data: program, error: pgError } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .is("deleted_at", null)
      .single();

    if (pgError || !program) {
      return failure("Program not found", ErrorCodes.NOT_FOUND);
    }

    const pg = program as Program;

    if (!pg.default_start_time || !pg.default_end_time) {
      return failure(
        "Program must have default start/end times to generate sessions",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (pg.default_days.length === 0) {
      return failure(
        "Program must have at least one default day to generate sessions",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const dayMap: Record<DayOfWeek, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const targetDayNumbers = pg.default_days.map((d) => dayMap[d]);

    // Get existing session dates to avoid duplicates
    const startDate = new Date();
    const endDate = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000);

    const { data: existingSessions } = await supabase
      .from("program_sessions")
      .select("date")
      .eq("program_id", programId)
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .is("deleted_at", null);

    const existingDates = new Set(
      (existingSessions ?? []).map((s) => (s as { date: string }).date),
    );

    // Generate date list
    const sessionsToCreate: Array<{
      tenant_id: string;
      program_id: string;
      date: string;
      start_time: string;
      end_time: string;
      status: SessionStatus;
    }> = [];

    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      if (targetDayNumbers.includes(cursor.getDay())) {
        const dateStr = cursor.toISOString().split("T")[0];
        if (!existingDates.has(dateStr)) {
          sessionsToCreate.push({
            tenant_id: context.tenant.id,
            program_id: programId,
            date: dateStr,
            start_time: pg.default_start_time!,
            end_time: pg.default_end_time!,
            status: "scheduled",
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    let created = 0;
    if (sessionsToCreate.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("program_sessions")
        .insert(sessionsToCreate)
        .select("id");

      if (insertError) {
        return failure(insertError.message, ErrorCodes.CREATE_FAILED);
      }

      created = inserted?.length ?? 0;
    }

    return success({
      created,
      skipped: existingDates.size,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate sessions";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE SESSION
// ============================================================

export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput,
): Promise<ActionResponse<ProgramSession>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.start_time !== undefined)
      updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.max_capacity !== undefined)
      updateData.max_capacity = input.max_capacity;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.location !== undefined)
      updateData.location = input.location?.trim() ?? null;
    if (input.staff_id !== undefined) updateData.staff_id = input.staff_id;
    if (input.notes !== undefined)
      updateData.notes = input.notes?.trim() ?? null;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("program_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ProgramSession);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update session";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CANCEL SESSION
// ============================================================
// Cancels a session and all confirmed bookings within it.
// Cancelled bookings are marked as 'cancelled' with a system
// reason. Waitlisted bookings are also cancelled.
// ============================================================

export async function cancelSession(
  sessionId: string,
  reason?: string,
): Promise<ActionResponse<{ cancelled_bookings: number }>> {
  try {
    await requirePermission(Permissions.MANAGE_PROGRAMS);
    const supabase = await createSupabaseServerClient();

    // Cancel the session
    const { error: sessionError } = await supabase
      .from("program_sessions")
      .update({ status: "cancelled" as SessionStatus })
      .eq("id", sessionId)
      .is("deleted_at", null);

    if (sessionError) {
      return failure(sessionError.message, ErrorCodes.UPDATE_FAILED);
    }

    // Cancel all non-cancelled bookings for this session
    const { data: affectedBookings, error: bookingError } = await supabase
      .from("session_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason?.trim() ?? "Session cancelled by staff",
      })
      .eq("session_id", sessionId)
      .in("status", ["confirmed", "waitlisted"])
      .is("deleted_at", null)
      .select("id");

    if (bookingError) {
      return failure(bookingError.message, ErrorCodes.UPDATE_FAILED);
    }

    return success({ cancelled_bookings: affectedBookings?.length ?? 0 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel session";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST SESSIONS (Staff calendar view - paginated)
// ============================================================
// Permission: MANAGE_PROGRAMS or CHECKIN_CHECKOUT
// Returns sessions with booking counts for calendar display.
// ============================================================

export async function listSessions(
  params: ListSessionsParams = {},
): Promise<PaginatedResponse<ProgramSessionWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 50;
    const offset = (page - 1) * perPage;

    // Count
    let countQuery = supabase
      .from("program_sessions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (params.program_id)
      countQuery = countQuery.eq("program_id", params.program_id);
    if (params.from_date) countQuery = countQuery.gte("date", params.from_date);
    if (params.to_date) countQuery = countQuery.lte("date", params.to_date);
    if (params.status) countQuery = countQuery.eq("status", params.status);
    if (params.staff_id)
      countQuery = countQuery.eq("staff_id", params.staff_id);

    const { count, error: countError } = await countQuery;

    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;
    if (total === 0) {
      return paginated([], 0, page, perPage);
    }

    // Data
    let query = supabase
      .from("program_sessions")
      .select(
        `
        *,
        program:programs!program_sessions_program_id_fkey(id, name, code, program_type, max_capacity),
        staff:users!program_sessions_staff_id_fkey(id, first_name, last_name),
        session_bookings(id, status, checked_in_at)
      `,
      )
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params.program_id) query = query.eq("program_id", params.program_id);
    if (params.from_date) query = query.gte("date", params.from_date);
    if (params.to_date) query = query.lte("date", params.to_date);
    if (params.status) query = query.eq("status", params.status);
    if (params.staff_id) query = query.eq("staff_id", params.staff_id);

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const sessions: ProgramSessionWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const bookings = (row.session_bookings ?? []) as Array<{
        id: string;
        status: string;
        checked_in_at: string | null;
      }>;

      const activeBookings = bookings.filter(
        (b) => b.status !== "cancelled" && b.status !== "no_show",
      );

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        program_id: row.program_id as string,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        max_capacity: row.max_capacity as number | null,
        status: row.status as SessionStatus,
        location: row.location as string | null,
        staff_id: row.staff_id as string | null,
        notes: row.notes as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        program: row.program as Pick<
          Program,
          "id" | "name" | "code" | "program_type" | "max_capacity"
        >,
        staff: row.staff as Pick<
          User,
          "id" | "first_name" | "last_name"
        > | null,
        confirmed_count: activeBookings.filter((b) => b.status === "confirmed")
          .length,
        waitlisted_count: activeBookings.filter(
          (b) => b.status === "waitlisted",
        ).length,
        checked_in_count: activeBookings.filter((b) => b.checked_in_at !== null)
          .length,
      };
    });

    return paginated(sessions, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list sessions";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SESSION DETAIL
// ============================================================

export async function getSession(
  sessionId: string,
): Promise<ActionResponse<ProgramSessionWithDetails>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("program_sessions")
      .select(
        `
        *,
        program:programs!program_sessions_program_id_fkey(id, name, code, program_type, max_capacity),
        staff:users!program_sessions_staff_id_fkey(id, first_name, last_name),
        session_bookings(id, status, checked_in_at)
      `,
      )
      .eq("id", sessionId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Session not found", ErrorCodes.NOT_FOUND);
    }

    const row = data as Record<string, unknown>;
    const bookings = (row.session_bookings ?? []) as Array<{
      id: string;
      status: string;
      checked_in_at: string | null;
    }>;

    const activeBookings = bookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "no_show",
    );

    const session: ProgramSessionWithDetails = {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      program_id: row.program_id as string,
      date: row.date as string,
      start_time: row.start_time as string,
      end_time: row.end_time as string,
      max_capacity: row.max_capacity as number | null,
      status: row.status as SessionStatus,
      location: row.location as string | null,
      staff_id: row.staff_id as string | null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      program: row.program as Pick<
        Program,
        "id" | "name" | "code" | "program_type" | "max_capacity"
      >,
      staff: row.staff as Pick<User, "id" | "first_name" | "last_name"> | null,
      confirmed_count: activeBookings.filter((b) => b.status === "confirmed")
        .length,
      waitlisted_count: activeBookings.filter((b) => b.status === "waitlisted")
        .length,
      checked_in_count: activeBookings.filter((b) => b.checked_in_at !== null)
        .length,
    };

    return success(session);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get session";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET PROGRAM UTILIZATION REPORT
// ============================================================
// Permission: VIEW_PROGRAM_REPORTS
// Returns capacity vs. actual attendance for a date range.
// ============================================================

export interface UtilizationReportRow {
  program_id: string;
  program_name: string;
  program_type: ProgramType;
  total_sessions: number;
  total_capacity: number;
  total_bookings: number;
  total_checked_in: number;
  utilization_pct: number;
  attendance_pct: number;
}

export async function getProgramUtilization(
  fromDate: string,
  toDate: string,
): Promise<ActionResponse<UtilizationReportRow[]>> {
  try {
    await requirePermission(Permissions.VIEW_PROGRAM_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Get all programs
    const { data: programs } = await supabase
      .from("programs")
      .select("id, name, program_type, max_capacity")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (!programs || programs.length === 0) {
      return success([]);
    }

    const report: UtilizationReportRow[] = [];

    for (const pg of programs as Array<{
      id: string;
      name: string;
      program_type: ProgramType;
      max_capacity: number | null;
    }>) {
      // Sessions in range
      const { data: sessions } = await supabase
        .from("program_sessions")
        .select("id, max_capacity")
        .eq("program_id", pg.id)
        .gte("date", fromDate)
        .lte("date", toDate)
        .neq("status", "cancelled")
        .is("deleted_at", null);

      if (!sessions || sessions.length === 0) continue;

      const sessionIds = (sessions as Array<{ id: string }>).map((s) => s.id);
      const totalCapacity = (
        sessions as Array<{ id: string; max_capacity: number | null }>
      ).reduce((sum, s) => sum + (s.max_capacity ?? pg.max_capacity ?? 0), 0);

      // Bookings for those sessions
      const { data: bookings } = await supabase
        .from("session_bookings")
        .select("id, status, checked_in_at")
        .in("session_id", sessionIds)
        .is("deleted_at", null);

      const confirmed = (bookings ?? []).filter(
        (b) => (b as { status: string }).status === "confirmed",
      ).length;
      const checkedIn = (bookings ?? []).filter(
        (b) => (b as { checked_in_at: string | null }).checked_in_at !== null,
      ).length;

      report.push({
        program_id: pg.id,
        program_name: pg.name,
        program_type: pg.program_type,
        total_sessions: sessions.length,
        total_capacity: totalCapacity,
        total_bookings: confirmed,
        total_checked_in: checkedIn,
        utilization_pct:
          totalCapacity > 0 ? Math.round((confirmed / totalCapacity) * 100) : 0,
        attendance_pct:
          confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0,
      });
    }

    return success(report);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get utilization report";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
