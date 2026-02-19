// src/lib/actions/admissions/tour-slots.ts
//
// ============================================================
// WattleOS V2 - Module 13: Tour Slot Server Actions
// ============================================================
// Tour slots are time windows where prospective families can
// visit the school. Admins create slots with capacity; public
// pages show available slots for self-service booking.
//
// Tours connect to the waitlist pipeline: when a family books
// a tour, their waitlist entry moves to 'tour_scheduled'.
// After attending, staff marks it 'tour_completed'.
//
// WHY separate from the waitlist entry: A tour slot is shared
// capacity (5 families per slot). The waitlist entry is per-
// child. Multiple waitlist entries can book the same tour slot.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
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
import type { WaitlistEntry, WaitlistStage } from "./waitlist-pipeline";

// ============================================================
// Types
// ============================================================

export interface TourSlot {
  id: string;
  tenant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_families: number;
  guide_id: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TourSlotWithDetails extends TourSlot {
  guide: Pick<User, "id" | "first_name" | "last_name"> | null;
  booked_count: number;
  attended_count: number;
  bookings: TourBooking[];
}

export interface TourBooking {
  entry_id: string;
  child_name: string;
  parent_name: string;
  parent_email: string;
  tour_attended: boolean | null;
}

/** Public-facing slot for the tours page */
export interface AvailableTourSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  spots_remaining: number;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateTourSlotInput {
  date: string;
  start_time: string;
  end_time: string;
  max_families?: number;
  guide_id?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface UpdateTourSlotInput {
  date?: string;
  start_time?: string;
  end_time?: string;
  max_families?: number;
  guide_id?: string | null;
  location?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ListTourSlotsParams {
  from_date?: string;
  to_date?: string;
  guide_id?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

// ============================================================
// CREATE TOUR SLOT
// ============================================================
// Permission: MANAGE_TOURS
// ============================================================

export async function createTourSlot(
  input: CreateTourSlotInput,
): Promise<ActionResponse<TourSlot>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    if (!input.date) {
      return failure("Tour date is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.start_time || !input.end_time) {
      return failure(
        "Start and end times are required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("tour_slots")
      .insert({
        tenant_id: context.tenant.id,
        date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        max_families: input.max_families ?? 5,
        guide_id: input.guide_id ?? null,
        location: input.location?.trim() ?? null,
        notes: input.notes?.trim() ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as TourSlot);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create tour slot";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// BULK CREATE TOUR SLOTS
// ============================================================
// Permission: MANAGE_TOURS
// Creates multiple slots at once (e.g., every Wednesday at
// 10am for the next term).
// ============================================================

export interface BulkCreateTourSlotsInput {
  dates: string[];
  start_time: string;
  end_time: string;
  max_families?: number;
  guide_id?: string | null;
  location?: string | null;
}

export async function bulkCreateTourSlots(
  input: BulkCreateTourSlotsInput,
): Promise<ActionResponse<{ created: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    if (input.dates.length === 0) {
      return failure(
        "At least one date is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const slots = input.dates.map((date) => ({
      tenant_id: context.tenant.id,
      date,
      start_time: input.start_time,
      end_time: input.end_time,
      max_families: input.max_families ?? 5,
      guide_id: input.guide_id ?? null,
      location: input.location?.trim() ?? null,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("tour_slots")
      .insert(slots)
      .select("id");

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success({ created: data?.length ?? 0 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create tour slots";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE TOUR SLOT
// ============================================================

export async function updateTourSlot(
  slotId: string,
  input: UpdateTourSlotInput,
): Promise<ActionResponse<TourSlot>> {
  try {
    await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.date !== undefined) updateData.date = input.date;
    if (input.start_time !== undefined)
      updateData.start_time = input.start_time;
    if (input.end_time !== undefined) updateData.end_time = input.end_time;
    if (input.max_families !== undefined)
      updateData.max_families = input.max_families;
    if (input.guide_id !== undefined) updateData.guide_id = input.guide_id;
    if (input.location !== undefined)
      updateData.location = input.location?.trim() ?? null;
    if (input.notes !== undefined)
      updateData.notes = input.notes?.trim() ?? null;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("tour_slots")
      .update(updateData)
      .eq("id", slotId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as TourSlot);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update tour slot";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE TOUR SLOT (soft delete)
// ============================================================

export async function deleteTourSlot(
  slotId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("tour_slots")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", slotId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete tour slot";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST TOUR SLOTS (Staff view - with bookings)
// ============================================================
// Permission: MANAGE_TOURS
// ============================================================

export async function listTourSlots(
  params: ListTourSlotsParams = {},
): Promise<PaginatedResponse<TourSlotWithDetails>> {
  try {
    await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Count
    let countQuery = supabase
      .from("tour_slots")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (params.from_date) countQuery = countQuery.gte("date", params.from_date);
    if (params.to_date) countQuery = countQuery.lte("date", params.to_date);
    if (params.guide_id)
      countQuery = countQuery.eq("guide_id", params.guide_id);
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
      .from("tour_slots")
      .select(
        `
        *,
        guide:users!tour_slots_guide_id_fkey(id, first_name, last_name)
      `,
      )
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params.from_date) query = query.gte("date", params.from_date);
    if (params.to_date) query = query.lte("date", params.to_date);
    if (params.guide_id) query = query.eq("guide_id", params.guide_id);
    if (params.is_active !== undefined)
      query = query.eq("is_active", params.is_active);

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Enrich with booking data from waitlist_entries
    const slots: TourSlotWithDetails[] = [];

    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const slotId = row.id as string;

      // Get waitlist entries booked for this tour slot
      // Tour bookings are linked via tour_date matching the slot's date+time
      const slotDatetime = `${row.date}T${row.start_time}`;

      const { data: bookedEntries } = await supabase
        .from("waitlist_entries")
        .select(
          "id, child_first_name, child_last_name, parent_first_name, parent_last_name, parent_email, tour_attended",
        )
        .eq("tour_date", slotDatetime)
        .in("stage", [
          "tour_scheduled",
          "tour_completed",
          "offered",
          "accepted",
          "enrolled",
        ])
        .is("deleted_at", null);

      const bookings: TourBooking[] = (
        (bookedEntries ?? []) as Array<{
          id: string;
          child_first_name: string;
          child_last_name: string;
          parent_first_name: string;
          parent_last_name: string;
          parent_email: string;
          tour_attended: boolean | null;
        }>
      ).map((e) => ({
        entry_id: e.id,
        child_name: `${e.child_first_name} ${e.child_last_name}`,
        parent_name: `${e.parent_first_name} ${e.parent_last_name}`,
        parent_email: e.parent_email,
        tour_attended: e.tour_attended,
      }));

      slots.push({
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        max_families: row.max_families as number,
        guide_id: row.guide_id as string | null,
        location: row.location as string | null,
        notes: row.notes as string | null,
        is_active: row.is_active as boolean,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        guide: row.guide as Pick<
          User,
          "id" | "first_name" | "last_name"
        > | null,
        booked_count: bookings.length,
        attended_count: bookings.filter((b) => b.tour_attended === true).length,
        bookings,
      });
    }

    return paginated(slots, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list tour slots";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET AVAILABLE TOUR SLOTS (Public - no auth)
// ============================================================
// Returns future active slots with remaining capacity.
// Used on the public {school}.wattleos.au/tours page.
// ============================================================

export async function getAvailableTourSlots(
  tenantId: string,
): Promise<ActionResponse<AvailableTourSlot[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    const { data: slots, error } = await supabase
      .from("tour_slots")
      .select("id, date, start_time, end_time, max_families, location")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .gte("date", today)
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const availableSlots: AvailableTourSlot[] = [];

    for (const slot of (slots ?? []) as Array<{
      id: string;
      date: string;
      start_time: string;
      end_time: string;
      max_families: number;
      location: string | null;
    }>) {
      // Count current bookings for this slot
      const slotDatetime = `${slot.date}T${slot.start_time}`;

      const { count: bookedCount } = await supabase
        .from("waitlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("tour_date", slotDatetime)
        .in("stage", [
          "tour_scheduled",
          "tour_completed",
          "offered",
          "accepted",
          "enrolled",
        ])
        .is("deleted_at", null);

      const spotsRemaining = slot.max_families - (bookedCount ?? 0);

      if (spotsRemaining > 0) {
        availableSlots.push({
          id: slot.id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          location: slot.location,
          spots_remaining: spotsRemaining,
        });
      }
    }

    return success(availableSlots);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get available tours";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// BOOK TOUR (Links waitlist entry to a tour slot)
// ============================================================
// Permission: MANAGE_TOURS (admin books on behalf) or
// MANAGE_WAITLIST. Also called from public tour booking
// flow after selecting a slot.
//
// WHY link via tour_date: Tour slots are date+time windows.
// The waitlist entry stores the tour_date as a TIMESTAMPTZ
// matching the slot's date+start_time. This lets us count
// bookings per slot without a junction table.
// ============================================================

export async function bookTour(
  entryId: string,
  tourSlotId: string,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    // Get the tour slot
    const { data: slot, error: slotError } = await supabase
      .from("tour_slots")
      .select("id, date, start_time, max_families, tenant_id")
      .eq("id", tourSlotId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    if (slotError || !slot) {
      return failure("Tour slot not found or inactive", ErrorCodes.NOT_FOUND);
    }

    const tourSlot = slot as {
      id: string;
      date: string;
      start_time: string;
      max_families: number;
      tenant_id: string;
    };
    const tourDatetime = `${tourSlot.date}T${tourSlot.start_time}`;

    // Check capacity
    const { count: bookedCount } = await supabase
      .from("waitlist_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tourSlot.tenant_id)
      .eq("tour_date", tourDatetime)
      .in("stage", [
        "tour_scheduled",
        "tour_completed",
        "offered",
        "accepted",
        "enrolled",
      ])
      .is("deleted_at", null);

    if ((bookedCount ?? 0) >= tourSlot.max_families) {
      return failure(
        "This tour slot is fully booked",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Get current entry
    const { data: currentEntry } = await supabase
      .from("waitlist_entries")
      .select("stage, tenant_id")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (!currentEntry) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = currentEntry as { stage: WaitlistStage; tenant_id: string };
    const previousStage = entry.stage;

    // Update the entry with tour info + move to tour_scheduled
    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({
        stage: "tour_scheduled" as WaitlistStage,
        tour_date: tourDatetime,
        tour_guide: null,
      })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    // Log stage transition
    if (previousStage !== "tour_scheduled") {
      await supabase.from("waitlist_stage_history").insert({
        tenant_id: entry.tenant_id,
        waitlist_entry_id: entryId,
        from_stage: previousStage,
        to_stage: "tour_scheduled",
        changed_by: context.user.id,
        notes: `Tour booked for ${tourSlot.date} at ${tourSlot.start_time}`,
      });
    }

    return success(data as WaitlistEntry);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to book tour";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RECORD TOUR ATTENDANCE
// ============================================================
// Permission: MANAGE_TOURS
// Marks whether the family attended the tour and adds notes.
// Moves entry to 'tour_completed' if attended.
// ============================================================

export async function recordTourAttendance(
  entryId: string,
  attended: boolean,
  tourNotes?: string,
): Promise<ActionResponse<WaitlistEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_TOURS);
    const supabase = await createSupabaseServerClient();

    const { data: current } = await supabase
      .from("waitlist_entries")
      .select("stage, tenant_id")
      .eq("id", entryId)
      .is("deleted_at", null)
      .single();

    if (!current) {
      return failure("Waitlist entry not found", ErrorCodes.NOT_FOUND);
    }

    const entry = current as { stage: WaitlistStage; tenant_id: string };

    if (entry.stage !== "tour_scheduled") {
      return failure(
        `Entry must be at 'tour_scheduled' to record attendance, currently '${entry.stage}'`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const newStage: WaitlistStage = attended ? "tour_completed" : "waitlisted";

    const { data, error } = await supabase
      .from("waitlist_entries")
      .update({
        stage: newStage,
        tour_attended: attended,
        tour_notes: tourNotes?.trim() ?? null,
      })
      .eq("id", entryId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    await supabase.from("waitlist_stage_history").insert({
      tenant_id: entry.tenant_id,
      waitlist_entry_id: entryId,
      from_stage: "tour_scheduled",
      to_stage: newStage,
      changed_by: context.user.id,
      notes: attended
        ? `Tour attended. ${tourNotes?.trim() ?? ""}`
        : `Tour not attended - moved back to waitlist. ${tourNotes?.trim() ?? ""}`,
    });

    return success(data as WaitlistEntry);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to record attendance";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
