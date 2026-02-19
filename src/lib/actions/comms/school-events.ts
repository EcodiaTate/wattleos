// src/lib/actions/comms/school-events.ts
//
// ============================================================
// WattleOS V2 - Module 12: School Event Server Actions
// ============================================================
// Full event lifecycle: create → publish → RSVP → track.
// Events can be school-wide, class-specific, program-specific,
// or staff-only. Supports RSVP with guest counts and capacity
// limits.
//
// WHY events in comms not a separate module: Events are a
// communication channel. They appear in the parent news feed
// alongside announcements and chat updates. Keeping them in
// comms ensures a unified communication experience.
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
import type { Class, User } from "@/types/domain";

// ============================================================
// Types
// ============================================================

export type EventType =
  | "general"
  | "excursion"
  | "parent_meeting"
  | "performance"
  | "sports_day"
  | "fundraiser"
  | "professional_development"
  | "public_holiday"
  | "pupil_free_day"
  | "term_start"
  | "term_end";

export type EventScope = "school" | "class" | "program" | "staff";
export type RSVPStatus = "going" | "not_going" | "maybe";

export interface EventAttachment {
  name: string;
  url: string;
}

export interface SchoolEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  location_url: string | null;
  scope: EventScope;
  target_class_id: string | null;
  target_program_id: string | null;
  rsvp_enabled: boolean;
  rsvp_deadline: string | null;
  max_attendees: number | null;
  created_by: string;
  attachment_urls: EventAttachment[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SchoolEventWithDetails extends SchoolEvent {
  creator: Pick<User, "id" | "first_name" | "last_name">;
  target_class: Pick<Class, "id" | "name"> | null;
  rsvp_summary: {
    going: number;
    not_going: number;
    maybe: number;
    total_guests: number;
  };
  my_rsvp: EventRSVP | null;
}

export interface EventRSVP {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string;
  status: RSVPStatus;
  guests: number;
  notes: string | null;
  responded_at: string;
}

export interface EventRSVPWithUser extends EventRSVP {
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_type: EventType;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  location?: string | null;
  location_url?: string | null;
  scope: EventScope;
  target_class_id?: string | null;
  target_program_id?: string | null;
  rsvp_enabled?: boolean;
  rsvp_deadline?: string | null;
  max_attendees?: number | null;
  attachment_urls?: EventAttachment[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  event_type?: EventType;
  start_at?: string;
  end_at?: string | null;
  all_day?: boolean;
  location?: string | null;
  location_url?: string | null;
  scope?: EventScope;
  target_class_id?: string | null;
  target_program_id?: string | null;
  rsvp_enabled?: boolean;
  rsvp_deadline?: string | null;
  max_attendees?: number | null;
  attachment_urls?: EventAttachment[];
}

export interface ListEventsParams {
  scope?: EventScope;
  event_type?: EventType;
  target_class_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

// ============================================================
// CREATE EVENT
// ============================================================
// Permission: MANAGE_EVENTS
// ============================================================

export async function createEvent(
  input: CreateEventInput,
): Promise<ActionResponse<SchoolEvent>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EVENTS);
    const supabase = await createSupabaseServerClient();

    if (!input.title.trim()) {
      return failure("Event title is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.start_at) {
      return failure(
        "Start date/time is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.scope === "class" && !input.target_class_id) {
      return failure(
        "A target class is required for class-scoped events",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.scope === "program" && !input.target_program_id) {
      return failure(
        "A target program is required for program-scoped events",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.end_at && new Date(input.end_at) < new Date(input.start_at)) {
      return failure(
        "End time cannot be before start time",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("school_events")
      .insert({
        tenant_id: context.tenant.id,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        event_type: input.event_type,
        start_at: input.start_at,
        end_at: input.end_at ?? null,
        all_day: input.all_day ?? false,
        location: input.location?.trim() ?? null,
        location_url: input.location_url?.trim() ?? null,
        scope: input.scope,
        target_class_id: input.scope === "class" ? input.target_class_id : null,
        target_program_id:
          input.scope === "program" ? input.target_program_id : null,
        rsvp_enabled: input.rsvp_enabled ?? false,
        rsvp_deadline: input.rsvp_deadline ?? null,
        max_attendees: input.max_attendees ?? null,
        created_by: context.user.id,
        attachment_urls: JSON.stringify(input.attachment_urls ?? []),
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as SchoolEvent);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create event";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE EVENT
// ============================================================

export async function updateEvent(
  eventId: string,
  input: UpdateEventInput,
): Promise<ActionResponse<SchoolEvent>> {
  try {
    await requirePermission(Permissions.MANAGE_EVENTS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined)
      updateData.description = input.description?.trim() ?? null;
    if (input.event_type !== undefined)
      updateData.event_type = input.event_type;
    if (input.start_at !== undefined) updateData.start_at = input.start_at;
    if (input.end_at !== undefined) updateData.end_at = input.end_at;
    if (input.all_day !== undefined) updateData.all_day = input.all_day;
    if (input.location !== undefined)
      updateData.location = input.location?.trim() ?? null;
    if (input.location_url !== undefined)
      updateData.location_url = input.location_url?.trim() ?? null;
    if (input.scope !== undefined) updateData.scope = input.scope;
    if (input.target_class_id !== undefined)
      updateData.target_class_id = input.target_class_id;
    if (input.target_program_id !== undefined)
      updateData.target_program_id = input.target_program_id;
    if (input.rsvp_enabled !== undefined)
      updateData.rsvp_enabled = input.rsvp_enabled;
    if (input.rsvp_deadline !== undefined)
      updateData.rsvp_deadline = input.rsvp_deadline;
    if (input.max_attendees !== undefined)
      updateData.max_attendees = input.max_attendees;
    if (input.attachment_urls !== undefined)
      updateData.attachment_urls = JSON.stringify(input.attachment_urls);

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("school_events")
      .update(updateData)
      .eq("id", eventId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as SchoolEvent);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update event";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE EVENT (soft delete)
// ============================================================

export async function deleteEvent(
  eventId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_EVENTS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("school_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete event";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST EVENTS (Staff view - paginated calendar)
// ============================================================
// Permission: MANAGE_EVENTS
// Returns events in chronological order with RSVP summaries.
// ============================================================

export async function listEvents(
  params: ListEventsParams = {},
): Promise<PaginatedResponse<SchoolEventWithDetails>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EVENTS);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Count
    let countQuery = supabase
      .from("school_events")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (params.scope) countQuery = countQuery.eq("scope", params.scope);
    if (params.event_type)
      countQuery = countQuery.eq("event_type", params.event_type);
    if (params.target_class_id)
      countQuery = countQuery.eq("target_class_id", params.target_class_id);
    if (params.from_date)
      countQuery = countQuery.gte("start_at", params.from_date);
    if (params.to_date) countQuery = countQuery.lte("start_at", params.to_date);

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
      .from("school_events")
      .select(
        `
        *,
        creator:users!school_events_created_by_fkey(id, first_name, last_name),
        target_class:classes!school_events_target_class_id_fkey(id, name),
        event_rsvps(id, status, guests)
      `,
      )
      .is("deleted_at", null)
      .order("start_at", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params.scope) query = query.eq("scope", params.scope);
    if (params.event_type) query = query.eq("event_type", params.event_type);
    if (params.target_class_id)
      query = query.eq("target_class_id", params.target_class_id);
    if (params.from_date) query = query.gte("start_at", params.from_date);
    if (params.to_date) query = query.lte("start_at", params.to_date);

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Get current user's RSVPs
    const eventIds = ((data ?? []) as Array<{ id: string }>).map((e) => e.id);
    let myRsvpMap = new Map<string, EventRSVP>();

    if (eventIds.length > 0) {
      const { data: myRsvps } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("user_id", context.user.id)
        .in("event_id", eventIds);

      for (const r of (myRsvps ?? []) as EventRSVP[]) {
        myRsvpMap.set(r.event_id, r);
      }
    }

    const events: SchoolEventWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const rsvps = (row.event_rsvps ?? []) as Array<{
        id: string;
        status: RSVPStatus;
        guests: number;
      }>;
      const goingCount = rsvps.filter((r) => r.status === "going").length;
      const notGoingCount = rsvps.filter(
        (r) => r.status === "not_going",
      ).length;
      const maybeCount = rsvps.filter((r) => r.status === "maybe").length;
      const totalGuests = rsvps.reduce((sum, r) => sum + r.guests, 0);

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        title: row.title as string,
        description: row.description as string | null,
        event_type: row.event_type as EventType,
        start_at: row.start_at as string,
        end_at: row.end_at as string | null,
        all_day: row.all_day as boolean,
        location: row.location as string | null,
        location_url: row.location_url as string | null,
        scope: row.scope as EventScope,
        target_class_id: row.target_class_id as string | null,
        target_program_id: row.target_program_id as string | null,
        rsvp_enabled: row.rsvp_enabled as boolean,
        rsvp_deadline: row.rsvp_deadline as string | null,
        max_attendees: row.max_attendees as number | null,
        created_by: row.created_by as string,
        attachment_urls: (row.attachment_urls ?? []) as EventAttachment[],
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        creator: row.creator as Pick<User, "id" | "first_name" | "last_name">,
        target_class: row.target_class as Pick<Class, "id" | "name"> | null,
        rsvp_summary: {
          going: goingCount,
          not_going: notGoingCount,
          maybe: maybeCount,
          total_guests: totalGuests,
        },
        my_rsvp: myRsvpMap.get(row.id as string) ?? null,
      };
    });

    return paginated(events, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list events";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET EVENTS FOR PARENT
// ============================================================
// Returns upcoming events visible to the parent based on
// their children's class enrollments. No special permission.
// ============================================================

export async function getEventsForParent(
  params: {
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  } = {},
): Promise<PaginatedResponse<SchoolEventWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Resolve parent's class IDs
    const { data: guardianships } = await supabase
      .from("guardians")
      .select("student_id")
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    const studentIds = (guardianships ?? []).map(
      (g) => (g as { student_id: string }).student_id,
    );

    let classIds: string[] = [];
    if (studentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .in("student_id", studentIds)
        .eq("status", "active")
        .is("deleted_at", null);

      classIds = [
        ...new Set(
          (enrollments ?? []).map((e) => (e as { class_id: string }).class_id),
        ),
      ];
    }

    // Scope filter: school-wide OR class events for parent's classes
    // Exclude staff-only events
    let scopeFilter: string;
    if (classIds.length > 0) {
      scopeFilter = `scope.eq.school,and(scope.eq.class,target_class_id.in.(${classIds.join(",")}))`;
    } else {
      scopeFilter = "scope.eq.school";
    }

    // Default to showing upcoming events from now
    const fromDate = params.from_date ?? new Date().toISOString();

    // Count
    let countQuery = supabase
      .from("school_events")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .neq("scope", "staff")
      .gte("start_at", fromDate)
      .or(scopeFilter);

    if (params.to_date) {
      countQuery = countQuery.lte("start_at", params.to_date);
    }

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
      .from("school_events")
      .select(
        `
        *,
        creator:users!school_events_created_by_fkey(id, first_name, last_name),
        target_class:classes!school_events_target_class_id_fkey(id, name),
        event_rsvps(id, status, guests)
      `,
      )
      .is("deleted_at", null)
      .neq("scope", "staff")
      .gte("start_at", fromDate)
      .or(scopeFilter)
      .order("start_at", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (params.to_date) {
      query = query.lte("start_at", params.to_date);
    }

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // My RSVPs
    const eventIds = ((data ?? []) as Array<{ id: string }>).map((e) => e.id);
    let myRsvpMap = new Map<string, EventRSVP>();

    if (eventIds.length > 0) {
      const { data: myRsvps } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("user_id", context.user.id)
        .in("event_id", eventIds);

      for (const r of (myRsvps ?? []) as EventRSVP[]) {
        myRsvpMap.set(r.event_id, r);
      }
    }

    const events: SchoolEventWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const rsvps = (row.event_rsvps ?? []) as Array<{
        id: string;
        status: RSVPStatus;
        guests: number;
      }>;

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        title: row.title as string,
        description: row.description as string | null,
        event_type: row.event_type as EventType,
        start_at: row.start_at as string,
        end_at: row.end_at as string | null,
        all_day: row.all_day as boolean,
        location: row.location as string | null,
        location_url: row.location_url as string | null,
        scope: row.scope as EventScope,
        target_class_id: row.target_class_id as string | null,
        target_program_id: row.target_program_id as string | null,
        rsvp_enabled: row.rsvp_enabled as boolean,
        rsvp_deadline: row.rsvp_deadline as string | null,
        max_attendees: row.max_attendees as number | null,
        created_by: row.created_by as string,
        attachment_urls: (row.attachment_urls ?? []) as EventAttachment[],
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        deleted_at: row.deleted_at as string | null,
        creator: row.creator as Pick<User, "id" | "first_name" | "last_name">,
        target_class: row.target_class as Pick<Class, "id" | "name"> | null,
        rsvp_summary: {
          going: rsvps.filter((r) => r.status === "going").length,
          not_going: rsvps.filter((r) => r.status === "not_going").length,
          maybe: rsvps.filter((r) => r.status === "maybe").length,
          total_guests: rsvps.reduce((sum, r) => sum + r.guests, 0),
        },
        my_rsvp: myRsvpMap.get(row.id as string) ?? null,
      };
    });

    return paginated(events, total, page, perPage);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get events";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE EVENT
// ============================================================

export async function getEvent(
  eventId: string,
): Promise<ActionResponse<SchoolEventWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("school_events")
      .select(
        `
        *,
        creator:users!school_events_created_by_fkey(id, first_name, last_name),
        target_class:classes!school_events_target_class_id_fkey(id, name),
        event_rsvps(id, status, guests)
      `,
      )
      .eq("id", eventId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Event not found", ErrorCodes.NOT_FOUND);
    }

    const row = data as Record<string, unknown>;
    const rsvps = (row.event_rsvps ?? []) as Array<{
      id: string;
      status: RSVPStatus;
      guests: number;
    }>;

    // Current user's RSVP
    const { data: myRsvps } = await supabase
      .from("event_rsvps")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", context.user.id)
      .limit(1);

    const event: SchoolEventWithDetails = {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | null,
      event_type: row.event_type as EventType,
      start_at: row.start_at as string,
      end_at: row.end_at as string | null,
      all_day: row.all_day as boolean,
      location: row.location as string | null,
      location_url: row.location_url as string | null,
      scope: row.scope as EventScope,
      target_class_id: row.target_class_id as string | null,
      target_program_id: row.target_program_id as string | null,
      rsvp_enabled: row.rsvp_enabled as boolean,
      rsvp_deadline: row.rsvp_deadline as string | null,
      max_attendees: row.max_attendees as number | null,
      created_by: row.created_by as string,
      attachment_urls: (row.attachment_urls ?? []) as EventAttachment[],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      creator: row.creator as Pick<User, "id" | "first_name" | "last_name">,
      target_class: row.target_class as Pick<Class, "id" | "name"> | null,
      rsvp_summary: {
        going: rsvps.filter((r) => r.status === "going").length,
        not_going: rsvps.filter((r) => r.status === "not_going").length,
        maybe: rsvps.filter((r) => r.status === "maybe").length,
        total_guests: rsvps.reduce((sum, r) => sum + r.guests, 0),
      },
      my_rsvp: myRsvps && myRsvps.length > 0 ? (myRsvps[0] as EventRSVP) : null,
    };

    return success(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get event";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RESPOND TO EVENT (RSVP)
// ============================================================
// Upserts on (tenant_id, event_id, user_id). Any authenticated
// tenant member can RSVP. Checks capacity limits and deadlines.
// ============================================================

export async function respondToEvent(
  eventId: string,
  rsvpStatus: RSVPStatus,
  guests: number = 0,
  notes?: string | null,
): Promise<ActionResponse<EventRSVP>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch event to check constraints
    const { data: event, error: eventError } = await supabase
      .from("school_events")
      .select("id, rsvp_enabled, rsvp_deadline, max_attendees")
      .eq("id", eventId)
      .is("deleted_at", null)
      .single();

    if (eventError || !event) {
      return failure("Event not found", ErrorCodes.NOT_FOUND);
    }

    const evt = event as {
      id: string;
      rsvp_enabled: boolean;
      rsvp_deadline: string | null;
      max_attendees: number | null;
    };

    if (!evt.rsvp_enabled) {
      return failure(
        "RSVP is not enabled for this event",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check deadline
    if (evt.rsvp_deadline && new Date(evt.rsvp_deadline) < new Date()) {
      return failure("RSVP deadline has passed", ErrorCodes.VALIDATION_ERROR);
    }

    // Check capacity (only for 'going' responses)
    if (rsvpStatus === "going" && evt.max_attendees !== null) {
      const { count: currentGoing } = await supabase
        .from("event_rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "going")
        .neq("user_id", context.user.id); // Exclude current user (they may be updating)

      const { data: currentGuests } = await supabase
        .from("event_rsvps")
        .select("guests")
        .eq("event_id", eventId)
        .eq("status", "going")
        .neq("user_id", context.user.id);

      const totalAttending =
        (currentGoing ?? 0) +
        (currentGuests ?? []).reduce(
          (sum, r) => sum + ((r as { guests: number }).guests ?? 0),
          0,
        );

      if (totalAttending + 1 + guests > evt.max_attendees) {
        return failure(
          `This event has reached its maximum capacity of ${evt.max_attendees}`,
          ErrorCodes.VALIDATION_ERROR,
        );
      }
    }

    if (guests < 0) {
      return failure(
        "Guest count cannot be negative",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("event_rsvps")
      .upsert(
        {
          tenant_id: context.tenant.id,
          event_id: eventId,
          user_id: context.user.id,
          status: rsvpStatus,
          guests,
          notes: notes?.trim() ?? null,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,event_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as EventRSVP);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to RSVP";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET EVENT RSVP LIST (Staff view)
// ============================================================
// Returns all RSVPs with user details, grouped by status.
// Permission: MANAGE_EVENTS
// ============================================================

export async function getEventRSVPs(
  eventId: string,
): Promise<ActionResponse<EventRSVPWithUser[]>> {
  try {
    await requirePermission(Permissions.MANAGE_EVENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("event_rsvps")
      .select(
        `
        *,
        user:users!event_rsvps_user_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("event_id", eventId)
      .order("responded_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as EventRSVPWithUser[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get RSVPs";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
