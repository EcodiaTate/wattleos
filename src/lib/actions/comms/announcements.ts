// src/lib/actions/comms/announcements.ts
//
// ============================================================
// WattleOS V2 - Module 12: Enhanced Announcement Server Actions
// ============================================================
// Replaces the Module 7 announcements with the full Module 12
// schema: scheduling, expiry, program-scoped targeting,
// acknowledgement tracking, and pin management.
//
// WHY separate from old announcements.ts: The mega migration
// changed the schema significantly (scope enum, scheduled_for,
// requires_acknowledgement, announcement_acknowledgements).
// This file uses the new tables; the old file can be removed
// once the UI is migrated.
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

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementScope = "school" | "class" | "program";

/** Attachment shape stored in the JSONB attachment_urls column */
export interface AnnouncementAttachment {
  name: string;
  url: string;
  mime_type: string;
}

/** Row shape matching the new mega-migration announcements table */
export interface Announcement {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  target_class_id: string | null;
  target_program_id: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  expires_at: string | null;
  attachment_urls: AnnouncementAttachment[];
  requires_acknowledgement: boolean;
  pin_to_top: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Announcement enriched with author + target info + engagement stats */
export interface AnnouncementWithDetails extends Announcement {
  author: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  target_class: Pick<Class, "id" | "name"> | null;
  acknowledgement_count: number;
  is_acknowledged: boolean;
}

export interface AnnouncementAcknowledgement {
  id: string;
  tenant_id: string;
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  target_class_id?: string | null;
  target_program_id?: string | null;
  scheduled_for?: string | null;
  expires_at?: string | null;
  attachment_urls?: AnnouncementAttachment[];
  requires_acknowledgement?: boolean;
  pin_to_top?: boolean;
  /** If true, publish immediately. If false (or scheduled_for set), stays draft. */
  publish_now?: boolean;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  priority?: AnnouncementPriority;
  scope?: AnnouncementScope;
  target_class_id?: string | null;
  target_program_id?: string | null;
  scheduled_for?: string | null;
  expires_at?: string | null;
  attachment_urls?: AnnouncementAttachment[];
  requires_acknowledgement?: boolean;
  pin_to_top?: boolean;
}

export interface ListAnnouncementsParams {
  scope?: AnnouncementScope;
  target_class_id?: string;
  priority?: AnnouncementPriority;
  pinned_only?: boolean;
  include_drafts?: boolean;
  include_expired?: boolean;
  page?: number;
  per_page?: number;
}

// ============================================================
// CREATE ANNOUNCEMENT
// ============================================================
// Permission: SEND_ANNOUNCEMENTS
// Creates an announcement. If publish_now is true or no
// scheduled_for is set, published_at = now(). Otherwise it
// stays as a draft with a scheduled publish time.
// ============================================================

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<ActionResponse<Announcement>> {
  try {
    const context = await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    if (!input.title.trim()) {
      return failure("Title is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.body.trim()) {
      return failure(
        "Announcement body is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.scope === "class" && !input.target_class_id) {
      return failure(
        "A target class is required for class-scoped announcements",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.scope === "program" && !input.target_program_id) {
      return failure(
        "A target program is required for program-scoped announcements",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Determine published_at: immediate, scheduled, or draft
    let publishedAt: string | null = null;
    if (input.publish_now && !input.scheduled_for) {
      publishedAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        tenant_id: context.tenant.id,
        author_id: context.user.id,
        title: input.title.trim(),
        body: input.body.trim(),
        priority: input.priority,
        scope: input.scope,
        target_class_id: input.scope === "class" ? input.target_class_id : null,
        target_program_id:
          input.scope === "program" ? input.target_program_id : null,
        published_at: publishedAt,
        scheduled_for: input.scheduled_for ?? null,
        expires_at: input.expires_at ?? null,
        attachment_urls: JSON.stringify(input.attachment_urls ?? []),
        requires_acknowledgement: input.requires_acknowledgement ?? false,
        pin_to_top: input.pin_to_top ?? false,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as Announcement);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE ANNOUNCEMENT
// ============================================================
// Permission: SEND_ANNOUNCEMENTS
// Partial update. Only provided fields are modified.
// ============================================================

export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput,
): Promise<ActionResponse<Announcement>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.body !== undefined) updateData.body = input.body.trim();
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.scope !== undefined) updateData.scope = input.scope;
    if (input.target_class_id !== undefined)
      updateData.target_class_id = input.target_class_id;
    if (input.target_program_id !== undefined)
      updateData.target_program_id = input.target_program_id;
    if (input.scheduled_for !== undefined)
      updateData.scheduled_for = input.scheduled_for;
    if (input.expires_at !== undefined)
      updateData.expires_at = input.expires_at;
    if (input.attachment_urls !== undefined)
      updateData.attachment_urls = JSON.stringify(input.attachment_urls);
    if (input.requires_acknowledgement !== undefined)
      updateData.requires_acknowledgement = input.requires_acknowledgement;
    if (input.pin_to_top !== undefined)
      updateData.pin_to_top = input.pin_to_top;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("announcements")
      .update(updateData)
      .eq("id", announcementId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as Announcement);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// PUBLISH ANNOUNCEMENT
// ============================================================
// Moves a draft to published. Sets published_at = now().
// Clears scheduled_for since it's being published manually.
// ============================================================

export async function publishAnnouncement(
  announcementId: string,
): Promise<ActionResponse<Announcement>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    // Verify it's currently unpublished
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("id, published_at")
      .eq("id", announcementId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Announcement not found", ErrorCodes.NOT_FOUND);
    }

    if ((existing as { published_at: string | null }).published_at) {
      return failure(
        "Announcement is already published",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("announcements")
      .update({
        published_at: new Date().toISOString(),
        scheduled_for: null,
      })
      .eq("id", announcementId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as Announcement);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to publish announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE ANNOUNCEMENT (soft delete)
// ============================================================

export async function deleteAnnouncement(
  announcementId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("announcements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", announcementId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST ANNOUNCEMENTS (Staff view - paginated)
// ============================================================
// Returns announcements with author info, acknowledgement
// counts, ordered by pinned first → published_at descending.
// Permission: SEND_ANNOUNCEMENTS
// ============================================================

export async function listAnnouncements(
  params: ListAnnouncementsParams = {},
): Promise<PaginatedResponse<AnnouncementWithDetails>> {
  try {
    const context = await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Count query
    let countQuery = supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    if (!params.include_drafts) {
      countQuery = countQuery.not("published_at", "is", null);
    }
    if (!params.include_expired) {
      countQuery = countQuery.or("expires_at.is.null,expires_at.gt.now()");
    }
    if (params.scope) {
      countQuery = countQuery.eq("scope", params.scope);
    }
    if (params.target_class_id) {
      countQuery = countQuery.eq("target_class_id", params.target_class_id);
    }
    if (params.priority) {
      countQuery = countQuery.eq("priority", params.priority);
    }
    if (params.pinned_only) {
      countQuery = countQuery.eq("pin_to_top", true);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;
    if (total === 0) {
      return paginated([], 0, page, perPage);
    }

    // Data query
    let query = supabase
      .from("announcements")
      .select(
        `
        *,
        author:users!announcements_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!announcements_target_class_id_fkey(id, name),
        announcement_acknowledgements(id)
      `,
      )
      .is("deleted_at", null)
      .order("pin_to_top", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + perPage - 1);

    if (!params.include_drafts) {
      query = query.not("published_at", "is", null);
    }
    if (!params.include_expired) {
      query = query.or("expires_at.is.null,expires_at.gt.now()");
    }
    if (params.scope) {
      query = query.eq("scope", params.scope);
    }
    if (params.target_class_id) {
      query = query.eq("target_class_id", params.target_class_id);
    }
    if (params.priority) {
      query = query.eq("priority", params.priority);
    }
    if (params.pinned_only) {
      query = query.eq("pin_to_top", true);
    }

    const { data, error } = await query;

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Check which the current user has acknowledged
    const announcementIds = ((data ?? []) as Array<{ id: string }>).map(
      (a) => a.id,
    );
    let ackSet = new Set<string>();

    if (announcementIds.length > 0) {
      const { data: acks } = await supabase
        .from("announcement_acknowledgements")
        .select("announcement_id")
        .eq("user_id", context.user.id)
        .in("announcement_id", announcementIds);

      ackSet = new Set(
        (acks ?? []).map(
          (a) => (a as { announcement_id: string }).announcement_id,
        ),
      );
    }

    const announcements: AnnouncementWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      // Base fields
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      author_id: row.author_id as string,
      title: row.title as string,
      body: row.body as string,
      priority: row.priority as AnnouncementPriority,
      scope: row.scope as AnnouncementScope,
      target_class_id: row.target_class_id as string | null,
      target_program_id: row.target_program_id as string | null,
      published_at: row.published_at as string | null,
      scheduled_for: row.scheduled_for as string | null,
      expires_at: row.expires_at as string | null,
      attachment_urls: (row.attachment_urls ?? []) as AnnouncementAttachment[],
      requires_acknowledgement: row.requires_acknowledgement as boolean,
      pin_to_top: row.pin_to_top as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      // Enrichments
      author: row.author as Pick<
        User,
        "id" | "first_name" | "last_name" | "avatar_url"
      >,
      target_class: row.target_class as Pick<Class, "id" | "name"> | null,
      acknowledgement_count: Array.isArray(row.announcement_acknowledgements)
        ? (row.announcement_acknowledgements as Array<unknown>).length
        : 0,
      is_acknowledged: ackSet.has(row.id as string),
    }));

    return paginated(announcements, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list announcements";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET ANNOUNCEMENTS FOR PARENT
// ============================================================
// Returns published, non-expired announcements visible to
// the current parent based on their children's class enrollments
// and program bookings. No permission required (authenticated).
// ============================================================

export async function getAnnouncementsForParent(
  params: { page?: number; per_page?: number } = {},
): Promise<PaginatedResponse<AnnouncementWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const page = params.page ?? 1;
    const perPage = params.per_page ?? 25;
    const offset = (page - 1) * perPage;

    // Resolve parent's class IDs via guardian → student → enrollment
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

    // Build OR filter: school-wide OR class-targeted for parent's classes
    let scopeFilter: string;
    if (classIds.length > 0) {
      scopeFilter = `scope.eq.school,target_class_id.in.(${classIds.join(",")})`;
    } else {
      scopeFilter = "scope.eq.school";
    }

    // Count
    const { count, error: countError } = await supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .or("expires_at.is.null,expires_at.gt.now()")
      .or(scopeFilter);

    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;
    if (total === 0) {
      return paginated([], 0, page, perPage);
    }

    // Data
    const { data, error } = await supabase
      .from("announcements")
      .select(
        `
        *,
        author:users!announcements_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!announcements_target_class_id_fkey(id, name),
        announcement_acknowledgements(id)
      `,
      )
      .is("deleted_at", null)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .or("expires_at.is.null,expires_at.gt.now()")
      .or(scopeFilter)
      .order("pin_to_top", { ascending: false })
      .order("published_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Acknowledged status for current user
    const announcementIds = ((data ?? []) as Array<{ id: string }>).map(
      (a) => a.id,
    );
    let ackSet = new Set<string>();

    if (announcementIds.length > 0) {
      const { data: acks } = await supabase
        .from("announcement_acknowledgements")
        .select("announcement_id")
        .eq("user_id", context.user.id)
        .in("announcement_id", announcementIds);

      ackSet = new Set(
        (acks ?? []).map(
          (a) => (a as { announcement_id: string }).announcement_id,
        ),
      );
    }

    const announcements: AnnouncementWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => ({
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      author_id: row.author_id as string,
      title: row.title as string,
      body: row.body as string,
      priority: row.priority as AnnouncementPriority,
      scope: row.scope as AnnouncementScope,
      target_class_id: row.target_class_id as string | null,
      target_program_id: row.target_program_id as string | null,
      published_at: row.published_at as string | null,
      scheduled_for: row.scheduled_for as string | null,
      expires_at: row.expires_at as string | null,
      attachment_urls: (row.attachment_urls ?? []) as AnnouncementAttachment[],
      requires_acknowledgement: row.requires_acknowledgement as boolean,
      pin_to_top: row.pin_to_top as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      author: row.author as Pick<
        User,
        "id" | "first_name" | "last_name" | "avatar_url"
      >,
      target_class: row.target_class as Pick<Class, "id" | "name"> | null,
      acknowledgement_count: Array.isArray(row.announcement_acknowledgements)
        ? (row.announcement_acknowledgements as Array<unknown>).length
        : 0,
      is_acknowledged: ackSet.has(row.id as string),
    }));

    return paginated(announcements, total, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get announcements";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ACKNOWLEDGE ANNOUNCEMENT
// ============================================================
// Idempotent upsert on (tenant_id, announcement_id, user_id).
// Any authenticated tenant member can acknowledge.
// ============================================================

export async function acknowledgeAnnouncement(
  announcementId: string,
): Promise<ActionResponse<AnnouncementAcknowledgement>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("announcement_acknowledgements")
      .upsert(
        {
          tenant_id: context.tenant.id,
          announcement_id: announcementId,
          user_id: context.user.id,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,announcement_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as AnnouncementAcknowledgement);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to acknowledge announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET ACKNOWLEDGEMENT STATS
// ============================================================
// Staff view: who acknowledged, who hasn't. Useful for
// urgent announcements requiring parent confirmation.
// Permission: SEND_ANNOUNCEMENTS
// ============================================================

export interface AcknowledgementStats {
  total_acknowledged: number;
  acknowledgers: Array<
    Pick<User, "id" | "first_name" | "last_name"> & { acknowledged_at: string }
  >;
}

export async function getAcknowledgementStats(
  announcementId: string,
): Promise<ActionResponse<AcknowledgementStats>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("announcement_acknowledgements")
      .select(
        `
        acknowledged_at,
        user:users!announcement_acknowledgements_user_id_fkey(id, first_name, last_name)
      `,
      )
      .eq("announcement_id", announcementId)
      .order("acknowledged_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const acknowledgers = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
        ...(row.user as Pick<User, "id" | "first_name" | "last_name">),
        acknowledged_at: row.acknowledged_at as string,
      }),
    );

    return success({
      total_acknowledged: acknowledgers.length,
      acknowledgers,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to get acknowledgement stats";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET UNREAD / UNACKNOWLEDGED COUNT
// ============================================================
// For notification badge. Counts published announcements the
// current user hasn't acknowledged (where requires_acknowledgement
// is true) plus totally unviewed ones.
// ============================================================

export async function getUnacknowledgedCount(): Promise<
  ActionResponse<number>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get parent's class IDs
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

    // Get all visible announcements requiring acknowledgement
    let scopeFilter: string;
    if (classIds.length > 0) {
      scopeFilter = `scope.eq.school,target_class_id.in.(${classIds.join(",")})`;
    } else {
      scopeFilter = "scope.eq.school";
    }

    const { data: allAnnouncements } = await supabase
      .from("announcements")
      .select("id")
      .is("deleted_at", null)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .or("expires_at.is.null,expires_at.gt.now()")
      .eq("requires_acknowledgement", true)
      .or(scopeFilter);

    const allIds = ((allAnnouncements ?? []) as Array<{ id: string }>).map(
      (a) => a.id,
    );

    if (allIds.length === 0) {
      return success(0);
    }

    // Which ones has the user acknowledged?
    const { data: acks } = await supabase
      .from("announcement_acknowledgements")
      .select("announcement_id")
      .eq("user_id", context.user.id)
      .in("announcement_id", allIds);

    const ackSet = new Set(
      (acks ?? []).map(
        (a) => (a as { announcement_id: string }).announcement_id,
      ),
    );

    const unacknowledgedCount = allIds.filter((id) => !ackSet.has(id)).length;

    return success(unacknowledgedCount);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get unacknowledged count";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET SINGLE ANNOUNCEMENT
// ============================================================
// Returns a single announcement with full details. Accessible
// by any authenticated tenant member (RLS handles scoping).
// ============================================================

export async function getAnnouncement(
  announcementId: string,
): Promise<ActionResponse<AnnouncementWithDetails>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("announcements")
      .select(
        `
        *,
        author:users!announcements_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!announcements_target_class_id_fkey(id, name),
        announcement_acknowledgements(id)
      `,
      )
      .eq("id", announcementId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return failure("Announcement not found", ErrorCodes.NOT_FOUND);
    }

    const row = data as Record<string, unknown>;

    // Check if current user has acknowledged
    const { data: acks } = await supabase
      .from("announcement_acknowledgements")
      .select("id")
      .eq("announcement_id", announcementId)
      .eq("user_id", context.user.id)
      .limit(1);

    const announcement: AnnouncementWithDetails = {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      author_id: row.author_id as string,
      title: row.title as string,
      body: row.body as string,
      priority: row.priority as AnnouncementPriority,
      scope: row.scope as AnnouncementScope,
      target_class_id: row.target_class_id as string | null,
      target_program_id: row.target_program_id as string | null,
      published_at: row.published_at as string | null,
      scheduled_for: row.scheduled_for as string | null,
      expires_at: row.expires_at as string | null,
      attachment_urls: (row.attachment_urls ?? []) as AnnouncementAttachment[],
      requires_acknowledgement: row.requires_acknowledgement as boolean,
      pin_to_top: row.pin_to_top as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      deleted_at: row.deleted_at as string | null,
      author: row.author as Pick<
        User,
        "id" | "first_name" | "last_name" | "avatar_url"
      >,
      target_class: row.target_class as Pick<Class, "id" | "name"> | null,
      acknowledgement_count: Array.isArray(row.announcement_acknowledgements)
        ? (row.announcement_acknowledgements as Array<unknown>).length
        : 0,
      is_acknowledged: (acks ?? []).length > 0,
    };

    return success(announcement);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get announcement";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
