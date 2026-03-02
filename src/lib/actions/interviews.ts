"use server";

// src/lib/actions/interviews.ts
//
// ============================================================
// WattleOS - Parent-Teacher Interview Scheduling (Module X)
// ============================================================
// Covers the full lifecycle:
//   Admin  → create/open/close sessions, generate slots
//   Staff  → view schedule, block own slots, record outcomes
//   Parent → browse available slots, book, cancel
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  InterviewSession,
  InterviewSlot,
  InterviewSessionWithCounts,
  InterviewSlotWithBooking,
  InterviewSessionDashboard,
  StaffInterviewSchedule,
  FamilyInterviewView,
  AvailableSlotForBooking,
  InterviewBooking,
} from "@/types/domain";
import {
  createInterviewSessionSchema,
  type CreateInterviewSessionInput,
  updateInterviewSessionSchema,
  type UpdateInterviewSessionInput,
  generateSlotsSchema,
  type GenerateSlotsInput,
  blockSlotSchema,
  type BlockSlotInput,
  createBookingSchema,
  type CreateBookingInput,
  cancelBookingSchema,
  type CancelBookingInput,
  recordOutcomeSchema,
  type RecordOutcomeInput,
  type ListSessionsFilter,
  listSlotsFilterSchema,
  type ListSlotsFilter,
} from "@/lib/validations/interviews";

// ============================================================
// Raw join row shapes for Supabase selects
// ============================================================

type RawStaffUser = { id: string; first_name: string; last_name: string };
type RawStudentBasic = { id: string; first_name: string; last_name: string };
type RawStudentWithDob = RawStudentBasic & { dob: string };

/** interview_slots row with users!staff_user_id join */
type RawSlotWithStaff = InterviewSlot & {
  users: RawStaffUser | null;
};

/** interview_bookings row with students!student_id join */
type RawBookingWithStudent = InterviewBooking & {
  students: RawStudentWithDob | null;
};

/** interview_bookings row with students + slot + outcome_recorded_by joins */
type RawBookingFull = InterviewBooking & {
  students: RawStudentWithDob | null;
  interview_slots: {
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    staff_user_id: string;
  } | null;
  users: RawStaffUser | null;
};

/** interview_bookings row with session + slot cancellation info */
type RawBookingWithSessionSlot = {
  id: string;
  status: string;
  slot_id: string;
  session_id: string;
  booked_by: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  interview_sessions: {
    allow_cancellation: boolean;
    cancellation_cutoff_hours: number;
  } | null;
  interview_slots: { slot_date: string; start_time: string } | null;
};

/** student_guardians row with students join */
type RawGuardianLink = {
  student_id: string;
  students: RawStudentBasic | null;
};

// ============================================================
// Session Management (admin)
// ============================================================

export async function createInterviewSession(
  input: CreateInterviewSessionInput,
): Promise<ActionResponse<InterviewSession>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = createInterviewSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;
    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({
        tenant_id: context.tenant.id,
        title: v.title,
        description: v.description || null,
        session_start_date: v.sessionStartDate,
        session_end_date: v.sessionEndDate,
        booking_open_at: v.bookingOpenAt || null,
        booking_close_at: v.bookingCloseAt || null,
        slot_duration_mins: v.slotDurationMins,
        allow_cancellation: v.allowCancellation,
        cancellation_cutoff_hours: v.cancellationCutoffHours,
        notes: v.notes || null,
        status: "draft",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create session",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_SESSION_CREATED,
      entityType: "interview_session",
      entityId: data.id,
      metadata: { title: v.title },
    });

    return success(data as InterviewSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateInterviewSession(
  sessionId: string,
  input: UpdateInterviewSessionInput,
): Promise<ActionResponse<InterviewSession>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = updateInterviewSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;
    const updates: Record<string, unknown> = {};
    if (v.title !== undefined) updates.title = v.title;
    if (v.description !== undefined)
      updates.description = v.description || null;
    if (v.sessionStartDate !== undefined)
      updates.session_start_date = v.sessionStartDate;
    if (v.sessionEndDate !== undefined)
      updates.session_end_date = v.sessionEndDate;
    if (v.bookingOpenAt !== undefined)
      updates.booking_open_at = v.bookingOpenAt;
    if (v.bookingCloseAt !== undefined)
      updates.booking_close_at = v.bookingCloseAt;
    if (v.slotDurationMins !== undefined)
      updates.slot_duration_mins = v.slotDurationMins;
    if (v.allowCancellation !== undefined)
      updates.allow_cancellation = v.allowCancellation;
    if (v.cancellationCutoffHours !== undefined)
      updates.cancellation_cutoff_hours = v.cancellationCutoffHours;
    if (v.notes !== undefined) updates.notes = v.notes || null;

    const { data, error } = await supabase
      .from("interview_sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Session not found",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_SESSION_UPDATED,
      entityType: "interview_session",
      entityId: sessionId,
      metadata: { fields: Object.keys(updates) },
    });

    return success(data as InterviewSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function setInterviewSessionStatus(
  sessionId: string,
  newStatus: "open" | "closed" | "archived",
): Promise<ActionResponse<InterviewSession>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("interview_sessions")
      .update({ status: newStatus })
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Session not found",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    const actionMap = {
      open: AuditActions.INTERVIEW_SESSION_OPENED,
      closed: AuditActions.INTERVIEW_SESSION_CLOSED,
      archived: AuditActions.INTERVIEW_SESSION_ARCHIVED,
    } as const;

    await logAudit({
      context,
      action: actionMap[newStatus],
      entityType: "interview_session",
      entityId: sessionId,
    });

    return success(data as InterviewSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteInterviewSession(
  sessionId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    // Only allow deleting draft sessions with no bookings
    const { count } = await supabase
      .from("interview_bookings")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "confirmed")
      .is("deleted_at", null);

    if ((count ?? 0) > 0) {
      return failure(
        "Cannot delete a session that has confirmed bookings. Close or archive it instead.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { error } = await supabase
      .from("interview_sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_SESSION_DELETED,
      entityType: "interview_session",
      entityId: sessionId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Session Queries
// ============================================================

export async function listInterviewSessions(
  filter?: ListSessionsFilter,
): Promise<ActionResponse<InterviewSessionWithCounts[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_INTERVIEW_SCHEDULE,
    );
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("interview_sessions")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("session_start_date", { ascending: false });

    if (filter?.status) {
      query = query.eq("status", filter.status);
    } else if (!filter?.includeArchived) {
      query = query.neq("status", "archived");
    }

    const { data: sessions, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // For each session, fetch slot + booking counts
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length === 0) return success([]);

    const { data: slotCounts } = await supabase
      .from("interview_slots")
      .select("session_id, is_blocked")
      .in("session_id", sessionIds);

    const { data: bookingCounts } = await supabase
      .from("interview_bookings")
      .select("session_id, status")
      .in("session_id", sessionIds)
      .is("deleted_at", null);

    const result: InterviewSessionWithCounts[] = (sessions ?? []).map(
      (session) => {
        const slots = (slotCounts ?? []).filter(
          (s) => s.session_id === session.id,
        );
        const bookings = (bookingCounts ?? []).filter(
          (b) => b.session_id === session.id,
        );

        const totalSlots = slots.filter((s) => !s.is_blocked).length;
        const bookedSlots = bookings.filter(
          (b) => b.status !== "cancelled",
        ).length;

        return {
          ...(session as InterviewSession),
          total_slots: totalSlots,
          booked_slots: bookedSlots,
          available_slots: Math.max(0, totalSlots - bookedSlots),
          confirmed_bookings: bookings.filter((b) => b.status === "confirmed")
            .length,
          completed_bookings: bookings.filter((b) => b.status === "completed")
            .length,
        };
      },
    );

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getInterviewSessionDashboard(
  sessionId: string,
): Promise<ActionResponse<InterviewSessionDashboard>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_INTERVIEW_SCHEDULE,
    );
    const supabase = await createSupabaseServerClient();

    const { data: session, error: sessionErr } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (sessionErr || !session) {
      return failure("Session not found", ErrorCodes.NOT_FOUND);
    }

    // Slots with staff info
    const { data: slots, error: slotsErr } = await supabase
      .from("interview_slots")
      .select("*, users!staff_user_id(id, first_name, last_name)")
      .eq("session_id", sessionId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (slotsErr) return failure(slotsErr.message, ErrorCodes.DATABASE_ERROR);

    // Active bookings with student + slot info
    const { data: bookings, error: bookingsErr } = await supabase
      .from("interview_bookings")
      .select(
        "*, students!student_id(id, first_name, last_name), interview_slots!slot_id(id, slot_date, start_time, end_time, staff_user_id, location)",
      )
      .eq("session_id", sessionId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (bookingsErr)
      return failure(bookingsErr.message, ErrorCodes.DATABASE_ERROR);

    // Build by-staff breakdown
    const staffMap = new Map<
      string,
      {
        staff: { id: string; first_name: string; last_name: string };
        total_slots: number;
        booked: number;
        available: number;
        blocked: number;
      }
    >();

    for (const slot of (slots ?? []) as RawSlotWithStaff[]) {
      const staff = slot.users;
      if (!staff) continue;
      if (!staffMap.has(staff.id)) {
        staffMap.set(staff.id, {
          staff,
          total_slots: 0,
          booked: 0,
          available: 0,
          blocked: 0,
        });
      }
      const entry = staffMap.get(staff.id)!;
      if (slot.is_blocked) {
        entry.blocked++;
      } else {
        entry.total_slots++;
        const isBooked = (bookings ?? []).some(
          (b) => b.slot_id === slot.id && b.status !== "cancelled",
        );
        if (isBooked) entry.booked++;
        else entry.available++;
      }
    }

    const totalSlots = ((slots ?? []) as RawSlotWithStaff[]).filter(
      (s) => !s.is_blocked,
    ).length;
    const bookedSlots = (bookings ?? []).filter(
      (b) => b.status !== "cancelled",
    ).length;

    const sessionWithCounts: InterviewSessionWithCounts = {
      ...(session as InterviewSession),
      total_slots: totalSlots,
      booked_slots: bookedSlots,
      available_slots: Math.max(0, totalSlots - bookedSlots),
      confirmed_bookings: (bookings ?? []).filter(
        (b) => b.status === "confirmed",
      ).length,
      completed_bookings: (bookings ?? []).filter(
        (b) => b.status === "completed",
      ).length,
    };

    const typedSlots = (slots ?? []) as RawSlotWithStaff[];
    return success({
      session: sessionWithCounts,
      by_staff: Array.from(staffMap.values()),
      bookings: ((bookings ?? []) as RawBookingFull[]).map((b) => ({
        ...b,
        student: b.students,
        slot: b.interview_slots,
        staff: typedSlots.find((s) => s.id === b.slot_id)?.users ?? {
          id: "",
          first_name: "Unknown",
          last_name: "",
        },
      })),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Slot Management
// ============================================================

export async function generateInterviewSlots(
  input: GenerateSlotsInput,
): Promise<ActionResponse<{ created: number; skipped: number }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = generateSlotsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    // Verify session belongs to tenant
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, slot_duration_mins")
      .eq("id", v.sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!session) return failure("Session not found", ErrorCodes.NOT_FOUND);

    const durationMins = session.slot_duration_mins;

    // Build all slots across all dates
    const slotsToInsert: Array<{
      tenant_id: string;
      session_id: string;
      staff_user_id: string;
      slot_date: string;
      start_time: string;
      end_time: string;
      location: string | null;
    }> = [];

    for (const date of v.dates) {
      const [startH, startM] = v.startTime.split(":").map(Number);
      const [endH, endM] = v.endTime.split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      let current = startTotal;
      while (current + durationMins <= endTotal) {
        const slotStart = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
        const slotEndTotal = current + durationMins;
        const slotEnd = `${String(Math.floor(slotEndTotal / 60)).padStart(2, "0")}:${String(slotEndTotal % 60).padStart(2, "0")}`;
        slotsToInsert.push({
          tenant_id: context.tenant.id,
          session_id: v.sessionId,
          staff_user_id: v.staffUserId,
          slot_date: date,
          start_time: slotStart,
          end_time: slotEnd,
          location: v.location || null,
        });
        current += durationMins;
      }
    }

    // Upsert - skip duplicates (same staff + date + start_time already exist)
    const { data: inserted, error } = await supabase
      .from("interview_slots")
      .upsert(slotsToInsert, {
        onConflict: "staff_user_id,slot_date,start_time",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const created = inserted?.length ?? 0;
    const skipped = slotsToInsert.length - created;

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_SLOTS_GENERATED,
      entityType: "interview_session",
      entityId: v.sessionId,
      metadata: {
        staff_user_id: v.staffUserId,
        dates: v.dates,
        created,
        skipped,
      },
    });

    return success({ created, skipped });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function setSlotBlocked(
  input: BlockSlotInput,
  blocked: boolean,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = blockSlotSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Ensure the slot has no active booking before blocking
    if (blocked) {
      const { count } = await supabase
        .from("interview_bookings")
        .select("id", { count: "exact", head: true })
        .eq("slot_id", input.slotId)
        .eq("status", "confirmed")
        .is("deleted_at", null);

      if ((count ?? 0) > 0) {
        return failure(
          "Cannot block a slot that has a confirmed booking. Cancel the booking first.",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
    }

    const { error } = await supabase
      .from("interview_slots")
      .update({
        is_blocked: blocked,
        block_reason: blocked ? input.reason || null : null,
      })
      .eq("id", input.slotId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: blocked
        ? AuditActions.INTERVIEW_SLOT_BLOCKED
        : AuditActions.INTERVIEW_SLOT_UNBLOCKED,
      entityType: "interview_slot",
      entityId: input.slotId,
      metadata: { reason: input.reason },
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listSlotsForSession(
  filter: ListSlotsFilter,
): Promise<ActionResponse<InterviewSlotWithBooking[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_INTERVIEW_SCHEDULE,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = listSlotsFilterSchema.safeParse(filter);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    let query = supabase
      .from("interview_slots")
      .select("*, users!staff_user_id(id, first_name, last_name)")
      .eq("session_id", v.sessionId)
      .eq("tenant_id", context.tenant.id)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (v.staffUserId) query = query.eq("staff_user_id", v.staffUserId);
    if (v.date) query = query.eq("slot_date", v.date);
    if (v.availableOnly) query = query.eq("is_blocked", false);

    const { data: slots, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    if (!slots || slots.length === 0) return success([]);

    // Fetch active bookings for these slots
    const slotIds = slots.map((s) => s.id);
    const { data: bookings } = await supabase
      .from("interview_bookings")
      .select("*, students!student_id(id, first_name, last_name)")
      .in("slot_id", slotIds)
      .is("deleted_at", null)
      .neq("status", "cancelled");

    const bookingMap = new Map((bookings ?? []).map((b) => [b.slot_id, b]));

    const typedSlots = slots as RawSlotWithStaff[];
    const typedBookingMap = new Map(
      ((bookings ?? []) as RawBookingWithStudent[]).map((b) => [b.slot_id, b]),
    );

    const result: InterviewSlotWithBooking[] = typedSlots.map((slot) => {
      const booking = typedBookingMap.get(slot.id);
      return {
        id: slot.id,
        tenant_id: slot.tenant_id,
        session_id: slot.session_id,
        staff_user_id: slot.staff_user_id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: slot.location,
        is_blocked: slot.is_blocked,
        block_reason: slot.block_reason,
        created_at: slot.created_at,
        updated_at: slot.updated_at,
        staff: slot.users ?? { id: "", first_name: "Unknown", last_name: "" },
        booking: booking ? { ...booking, student: booking.students } : null,
      };
    });

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Staff Schedule View
// ============================================================

export async function getMyInterviewSchedule(
  sessionId: string,
): Promise<ActionResponse<StaffInterviewSchedule>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_INTERVIEW_SCHEDULE,
    );
    const supabase = await createSupabaseServerClient();

    const { data: session } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!session) return failure("Session not found", ErrorCodes.NOT_FOUND);

    const { data: slots, error: slotsErr } = await supabase
      .from("interview_slots")
      .select("*, users!staff_user_id(id, first_name, last_name)")
      .eq("session_id", sessionId)
      .eq("staff_user_id", context.user.id)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (slotsErr) return failure(slotsErr.message, ErrorCodes.DATABASE_ERROR);

    const slotIds = (slots ?? []).map((s) => s.id);
    const { data: bookings } = await supabase
      .from("interview_bookings")
      .select("*, students!student_id(id, first_name, last_name)")
      .in(
        "slot_id",
        slotIds.length > 0 ? slotIds : ["00000000-0000-0000-0000-000000000000"],
      )
      .is("deleted_at", null)
      .neq("status", "cancelled");

    const scheduleSlots = (slots ?? []) as RawSlotWithStaff[];
    const scheduleBookings = (bookings ?? []) as RawBookingWithStudent[];
    const bookingMap = new Map(scheduleBookings.map((b) => [b.slot_id, b]));

    // Group by date
    const dayMap = new Map<string, InterviewSlotWithBooking[]>();
    for (const slot of scheduleSlots) {
      if (!dayMap.has(slot.slot_date)) dayMap.set(slot.slot_date, []);
      const booking = bookingMap.get(slot.id);
      dayMap.get(slot.slot_date)!.push({
        id: slot.id,
        tenant_id: slot.tenant_id,
        session_id: slot.session_id,
        staff_user_id: slot.staff_user_id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        location: slot.location,
        is_blocked: slot.is_blocked,
        block_reason: slot.block_reason,
        created_at: slot.created_at,
        updated_at: slot.updated_at,
        staff: slot.users ?? { id: "", first_name: "Unknown", last_name: "" },
        booking: booking ? { ...booking, student: booking.students } : null,
      });
    }

    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({ date, slots }));

    const totalBookings = (bookings ?? []).length;
    const outcomesPending = (bookings ?? []).filter(
      (b) => b.status === "confirmed" && !b.outcome_notes,
    ).length;

    return success({
      session: session as InterviewSession,
      days,
      total_bookings: totalBookings,
      outcomes_pending: outcomesPending,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Booking (parent or staff can book)
// ============================================================

export async function createInterviewBooking(
  input: CreateBookingInput,
): Promise<ActionResponse<InterviewBooking>> {
  try {
    const context = await requirePermission(Permissions.BOOK_INTERVIEW);
    const supabase = await createSupabaseServerClient();

    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    // Verify session is open for booking
    const { data: session } = await supabase
      .from("interview_sessions")
      .select("id, status, booking_open_at, booking_close_at")
      .eq("id", v.sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!session) return failure("Session not found", ErrorCodes.NOT_FOUND);
    if (session.status !== "open") {
      return failure(
        "This session is not open for bookings",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date();
    if (session.booking_open_at && new Date(session.booking_open_at) > now) {
      return failure(
        "Booking window has not opened yet",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (session.booking_close_at && new Date(session.booking_close_at) < now) {
      return failure("Booking window has closed", ErrorCodes.VALIDATION_ERROR);
    }

    // Verify slot is available and not blocked
    const { data: slot } = await supabase
      .from("interview_slots")
      .select("id, is_blocked")
      .eq("id", v.slotId)
      .eq("session_id", v.sessionId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!slot) return failure("Slot not found", ErrorCodes.NOT_FOUND);
    if (slot.is_blocked)
      return failure("This slot is not available", ErrorCodes.VALIDATION_ERROR);

    // Check slot not already booked
    const { count: existingCount } = await supabase
      .from("interview_bookings")
      .select("id", { count: "exact", head: true })
      .eq("slot_id", v.slotId)
      .neq("status", "cancelled")
      .is("deleted_at", null);

    if ((existingCount ?? 0) > 0) {
      return failure(
        "This slot has already been booked",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    // Check student doesn't already have a booking in this session
    const { count: studentCount } = await supabase
      .from("interview_bookings")
      .select("id", { count: "exact", head: true })
      .eq("session_id", v.sessionId)
      .eq("student_id", v.studentId)
      .neq("status", "cancelled")
      .is("deleted_at", null);

    if ((studentCount ?? 0) > 0) {
      return failure(
        "This student already has a booking in this session. Cancel the existing booking first.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    const { data, error } = await supabase
      .from("interview_bookings")
      .insert({
        tenant_id: context.tenant.id,
        session_id: v.sessionId,
        slot_id: v.slotId,
        student_id: v.studentId,
        booked_by: context.user.id,
        guardian_name: v.guardianName,
        guardian_email: v.guardianEmail || null,
        guardian_phone: v.guardianPhone || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create booking",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_BOOKED,
      entityType: "interview_booking",
      entityId: data.id,
      metadata: {
        session_id: v.sessionId,
        slot_id: v.slotId,
        student_id: v.studentId,
        guardian_name: v.guardianName,
      },
    });

    return success(data as InterviewBooking);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function cancelInterviewBooking(
  input: CancelBookingInput,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.BOOK_INTERVIEW);
    const supabase = await createSupabaseServerClient();

    const parsed = cancelBookingSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data: booking } = await supabase
      .from("interview_bookings")
      .select(
        "id, status, slot_id, session_id, booked_by, interview_sessions!session_id(allow_cancellation, cancellation_cutoff_hours), interview_slots!slot_id(slot_date, start_time)",
      )
      .eq("id", input.bookingId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!booking) return failure("Booking not found", ErrorCodes.NOT_FOUND);
    const typedCancelBooking = booking as RawBookingWithSessionSlot;
    if (typedCancelBooking.status !== "confirmed") {
      return failure(
        "Only confirmed bookings can be cancelled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const session = typedCancelBooking.interview_sessions;
    const slot = typedCancelBooking.interview_slots;

    // Cancellation policy: non-admins can only cancel if within the cutoff and session allows it
    const isAdmin = context.permissions.includes(
      Permissions.MANAGE_INTERVIEW_SESSIONS,
    );
    if (!isAdmin) {
      if (!session?.allow_cancellation) {
        return failure(
          "Cancellation is not permitted for this session",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      if (slot) {
        const slotDateTime = new Date(`${slot.slot_date}T${slot.start_time}`);
        const cutoffMs =
          (session.cancellation_cutoff_hours ?? 24) * 60 * 60 * 1000;
        if (Date.now() + cutoffMs > slotDateTime.getTime()) {
          return failure(
            `Cancellations must be made at least ${session.cancellation_cutoff_hours} hours before the interview`,
            ErrorCodes.VALIDATION_ERROR,
          );
        }
      }
    }

    const { error } = await supabase
      .from("interview_bookings")
      .update({
        status: "cancelled",
        cancellation_reason: input.reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: context.user.id,
      })
      .eq("id", input.bookingId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_CANCELLED,
      entityType: "interview_booking",
      entityId: input.bookingId,
      metadata: { reason: input.reason },
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Outcome Recording (staff only)
// ============================================================

export async function recordInterviewOutcome(
  input: RecordOutcomeInput,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_INTERVIEW_SCHEDULE,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = recordOutcomeSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { error } = await supabase
      .from("interview_bookings")
      .update({
        outcome_notes: input.outcomeNotes,
        outcome_recorded_at: new Date().toISOString(),
        outcome_recorded_by: context.user.id,
        status: input.status,
      })
      .eq("id", input.bookingId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.INTERVIEW_OUTCOME_RECORDED,
      entityType: "interview_booking",
      entityId: input.bookingId,
      metadata: { status: input.status },
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Family / Parent View
// ============================================================

export async function getFamilyInterviewView(
  sessionId: string,
): Promise<ActionResponse<FamilyInterviewView>> {
  try {
    const context = await requirePermission(Permissions.BOOK_INTERVIEW);
    const supabase = await createSupabaseServerClient();

    const { data: session } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!session) return failure("Session not found", ErrorCodes.NOT_FOUND);

    // Find students linked to the current user
    const { data: guardianLinks } = await supabase
      .from("student_guardians")
      .select("student_id, students!student_id(id, first_name, last_name)")
      .eq("user_id", context.user.id)
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true);

    const students = ((guardianLinks ?? []) as RawGuardianLink[])
      .map((link) => link.students)
      .filter((s): s is RawStudentBasic => s !== null);

    // Get any existing bookings for these students in this session
    const studentIds = students.map((s) => s.id);
    const { data: bookings } = await supabase
      .from("interview_bookings")
      .select(
        "*, interview_slots!slot_id(id, slot_date, start_time, end_time, location, staff_user_id), users!outcome_recorded_by(id, first_name, last_name)",
      )
      .eq("session_id", sessionId)
      .in(
        "student_id",
        studentIds.length > 0
          ? studentIds
          : ["00000000-0000-0000-0000-000000000000"],
      )
      .is("deleted_at", null)
      .neq("status", "cancelled");

    // Fetch slot staff
    const slotStaffIds = ((bookings ?? []) as RawBookingFull[])
      .map((b) => b.interview_slots?.staff_user_id)
      .filter((id): id is string => id != null);
    const { data: staffUsers } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in(
        "id",
        slotStaffIds.length > 0
          ? slotStaffIds
          : ["00000000-0000-0000-0000-000000000000"],
      );

    const staffMap = new Map((staffUsers ?? []).map((u) => [u.id, u]));
    const bookingMap = new Map((bookings ?? []).map((b) => [b.student_id, b]));

    return success({
      session: session as InterviewSession,
      students: students.map((student) => {
        const booking = bookingMap.get(student.id);
        if (!booking) return { student, existing_booking: null };

        const slotRaw = (booking as RawBookingFull).interview_slots;
        const staff = slotRaw
          ? (staffMap.get(slotRaw.staff_user_id) ?? {
              id: slotRaw.staff_user_id,
              first_name: "Staff",
              last_name: "",
            })
          : { id: "", first_name: "Staff", last_name: "" };

        const slot = (slotRaw ?? {
          id: booking.slot_id,
          tenant_id: booking.tenant_id,
          session_id: booking.session_id,
          staff_user_id: "",
          slot_date: "",
          start_time: "",
          end_time: "",
          location: null,
          is_blocked: false,
          block_reason: null,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        }) as unknown as InterviewSlot;

        return {
          student,
          existing_booking: {
            ...(booking as InterviewBooking),
            slot,
            staff,
          },
        };
      }),
    } as FamilyInterviewView);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getAvailableSlotsForBooking(
  sessionId: string,
  date?: string,
): Promise<ActionResponse<AvailableSlotForBooking[]>> {
  try {
    const context = await requirePermission(Permissions.BOOK_INTERVIEW);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("interview_slots")
      .select("*, users!staff_user_id(id, first_name, last_name)")
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .eq("is_blocked", false)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (date) query = query.eq("slot_date", date);

    const { data: slots, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const slotIds = (slots ?? []).map((s) => s.id);
    const { data: bookedSlots } = await supabase
      .from("interview_bookings")
      .select("slot_id")
      .in(
        "slot_id",
        slotIds.length > 0 ? slotIds : ["00000000-0000-0000-0000-000000000000"],
      )
      .is("deleted_at", null)
      .neq("status", "cancelled");

    const bookedSet = new Set((bookedSlots ?? []).map((b) => b.slot_id));

    return success(
      ((slots ?? []) as RawSlotWithStaff[]).map((slot) => ({
        slot: {
          id: slot.id,
          tenant_id: slot.tenant_id,
          session_id: slot.session_id,
          staff_user_id: slot.staff_user_id,
          slot_date: slot.slot_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          location: slot.location,
          is_blocked: slot.is_blocked,
          block_reason: slot.block_reason,
          created_at: slot.created_at,
          updated_at: slot.updated_at,
        },
        staff: slot.users ?? { id: "", first_name: "Unknown", last_name: "" },
        is_available: !bookedSet.has(slot.id),
      })),
    );
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
