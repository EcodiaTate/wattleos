// src/lib/actions/announcements.ts
//
// ============================================================
// WattleOS V2 — Announcement Server Actions
// ============================================================
// Handles school-wide and class-targeted announcements.
// Staff create/manage, parents view. Read receipts tracked
// for engagement visibility.
//
// WHY server actions not API routes: Matches WattleOS pattern.
// Server Actions are co-located, type-safe, and don't need
// a separate API layer for internal mutations.
// ============================================================

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { ActionResponse, success, failure, ErrorCodes } from '@/types/api';
import type {
  Announcement,
  AnnouncementWithAuthor,
  AnnouncementRead,
  User,
  Class,
} from '@/types/domain';
import type { AnnouncementPriority, AnnouncementTargetType } from '@/lib/constants/communications';

// ============================================================
// Input Types
// ============================================================

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_class_id?: string | null;
  is_pinned?: boolean;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  is_pinned?: boolean;
}

export interface ListAnnouncementsParams {
  target_class_id?: string;
  priority?: AnnouncementPriority;
  pinned_only?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================
// CREATE ANNOUNCEMENT
// ============================================================
// Permission: SEND_ANNOUNCEMENTS
// Sets published_at to now() — announcements go live immediately.
// ============================================================

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<ActionResponse<Announcement>> {
  try {
    const context = await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    if (!input.title.trim()) {
      return failure('Title is required', ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.content.trim()) {
      return failure('Content is required', ErrorCodes.VALIDATION_ERROR);
    }
    if (input.target_type === 'class' && !input.target_class_id) {
      return failure(
        'A target class must be selected for class-targeted announcements',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        tenant_id: context.tenant.id,
        author_id: context.user.id,
        title: input.title.trim(),
        content: input.content.trim(),
        priority: input.priority,
        target_type: input.target_type,
        target_class_id: input.target_type === 'class' ? input.target_class_id : null,
        is_pinned: input.is_pinned ?? false,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as Announcement);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create announcement';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE ANNOUNCEMENT
// ============================================================

export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput
): Promise<ActionResponse<Announcement>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.content !== undefined) updateData.content = input.content.trim();
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.is_pinned !== undefined) updateData.is_pinned = input.is_pinned;

    if (Object.keys(updateData).length === 0) {
      return failure('No fields to update', ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as Announcement);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update announcement';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE ANNOUNCEMENT (soft delete)
// ============================================================

export async function deleteAnnouncement(
  announcementId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('announcements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', announcementId)
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete announcement';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST ANNOUNCEMENTS (Staff view)
// ============================================================
// Returns all announcements with author info, read counts,
// ordered by pinned first, then published_at descending.
// Permission: SEND_ANNOUNCEMENTS
// ============================================================

export async function listAnnouncements(
  params: ListAnnouncementsParams = {}
): Promise<ActionResponse<AnnouncementWithAuthor[]>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let query = supabase
      .from('announcements')
      .select(
        `
        *,
        author:users!announcements_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!announcements_target_class_id_fkey(id, name),
        announcement_reads(id)
      `
      )
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.target_class_id) {
      query = query.eq('target_class_id', params.target_class_id);
    }
    if (params.priority) {
      query = query.eq('priority', params.priority);
    }
    if (params.pinned_only) {
      query = query.eq('is_pinned', true);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const announcements: AnnouncementWithAuthor[] = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const author = row.author as Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
        const target_class = row.target_class as Pick<Class, 'id' | 'name'> | null;
        const reads = row.announcement_reads as Array<{ id: string }> | null;

        return {
          id: row.id as string,
          tenant_id: row.tenant_id as string,
          author_id: row.author_id as string,
          title: row.title as string,
          content: row.content as string,
          priority: row.priority as AnnouncementPriority,
          target_type: row.target_type as AnnouncementTargetType,
          target_class_id: row.target_class_id as string | null,
          is_pinned: row.is_pinned as boolean,
          published_at: row.published_at as string,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          author,
          target_class,
          read_count: reads?.length ?? 0,
        };
      }
    );

    return success(announcements);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list announcements';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET ANNOUNCEMENTS FOR PARENT
// ============================================================
// Returns announcements visible to the current parent:
// • All school-wide announcements
// • Class-targeted announcements for classes their children attend
// Includes is_read flag per announcement.
// No permission check — available to all authenticated users.
// ============================================================

export async function getAnnouncementsForParent(
  params: { limit?: number; offset?: number } = {}
): Promise<ActionResponse<AnnouncementWithAuthor[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const limit = params.limit ?? 30;
    const offset = params.offset ?? 0;

    // Get classes the parent's children are enrolled in
    const { data: guardianships } = await supabase
      .from('guardians')
      .select('student_id')
      .eq('user_id', context.user.id)
      .is('deleted_at', null);

    const studentIds = (guardianships ?? []).map(
      (g) => (g as { student_id: string }).student_id
    );

    let classIds: string[] = [];
    if (studentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('student_id', studentIds)
        .eq('status', 'active')
        .is('deleted_at', null);

      classIds = [
        ...new Set(
          (enrollments ?? []).map((e) => (e as { class_id: string }).class_id)
        ),
      ];
    }

    // Fetch announcements: school-wide OR targeting one of the parent's classes
    let query = supabase
      .from('announcements')
      .select(
        `
        *,
        author:users!announcements_author_id_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!announcements_target_class_id_fkey(id, name)
      `
      )
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (classIds.length > 0) {
      // school-wide OR class-targeted for parent's classes
      query = query.or(
        `target_type.eq.school_wide,target_class_id.in.(${classIds.join(',')})`
      );
    } else {
      // No children enrolled — only school-wide
      query = query.eq('target_type', 'school_wide');
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Get read status for current user
    const announcementIds = ((data ?? []) as Array<{ id: string }>).map((a) => a.id);
    let readSet = new Set<string>();

    if (announcementIds.length > 0) {
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', context.user.id)
        .in('announcement_id', announcementIds);

      readSet = new Set(
        (reads ?? []).map(
          (r) => (r as { announcement_id: string }).announcement_id
        )
      );
    }

    const announcements: AnnouncementWithAuthor[] = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        author_id: row.author_id as string,
        title: row.title as string,
        content: row.content as string,
        priority: row.priority as AnnouncementPriority,
        target_type: row.target_type as AnnouncementTargetType,
        target_class_id: row.target_class_id as string | null,
        is_pinned: row.is_pinned as boolean,
        published_at: row.published_at as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        author: row.author as Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>,
        target_class: row.target_class as Pick<Class, 'id' | 'name'> | null,
        is_read: readSet.has(row.id as string),
      })
    );

    return success(announcements);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get announcements';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MARK ANNOUNCEMENT AS READ
// ============================================================
// Creates a read receipt. Idempotent — upserts on the
// unique(announcement_id, user_id) constraint.
// ============================================================

export async function markAnnouncementRead(
  announcementId: string
): Promise<ActionResponse<AnnouncementRead>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('announcement_reads')
      .upsert(
        {
          tenant_id: context.tenant.id,
          announcement_id: announcementId,
          user_id: context.user.id,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'announcement_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as AnnouncementRead);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark as read';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET UNREAD ANNOUNCEMENT COUNT
// ============================================================
// Used for sidebar notification badge. Counts announcements
// visible to the current user that they haven't read yet.
// ============================================================

export async function getUnreadAnnouncementCount(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get parent's class IDs (same logic as getAnnouncementsForParent)
    const { data: guardianships } = await supabase
      .from('guardians')
      .select('student_id')
      .eq('user_id', context.user.id)
      .is('deleted_at', null);

    const studentIds = (guardianships ?? []).map(
      (g) => (g as { student_id: string }).student_id
    );

    let classIds: string[] = [];
    if (studentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('student_id', studentIds)
        .eq('status', 'active')
        .is('deleted_at', null);

      classIds = [
        ...new Set(
          (enrollments ?? []).map((e) => (e as { class_id: string }).class_id)
        ),
      ];
    }

    // Count visible announcements
    let announcementQuery = supabase
      .from('announcements')
      .select('id')
      .is('deleted_at', null);

    if (classIds.length > 0) {
      announcementQuery = announcementQuery.or(
        `target_type.eq.school_wide,target_class_id.in.(${classIds.join(',')})`
      );
    } else {
      announcementQuery = announcementQuery.eq('target_type', 'school_wide');
    }

    const { data: allAnnouncements } = await announcementQuery;
    const allIds = ((allAnnouncements ?? []) as Array<{ id: string }>).map((a) => a.id);

    if (allIds.length === 0) {
      return success(0);
    }

    // Count which ones are read
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', context.user.id)
      .in('announcement_id', allIds);

    const readSet = new Set(
      (reads ?? []).map(
        (r) => (r as { announcement_id: string }).announcement_id
      )
    );

    const unreadCount = allIds.filter((id) => !readSet.has(id)).length;

    return success(unreadCount);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get unread count';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET ANNOUNCEMENT READ STATS
// ============================================================
// For staff view: how many users have read a specific
// announcement. Returns count and list of readers.
// Permission: SEND_ANNOUNCEMENTS
// ============================================================

export async function getAnnouncementReadStats(
  announcementId: string
): Promise<ActionResponse<{ total_reads: number; readers: Array<Pick<User, 'id' | 'first_name' | 'last_name'> & { read_at: string }> }>> {
  try {
    await requirePermission(Permissions.SEND_ANNOUNCEMENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('announcement_reads')
      .select(
        `
        read_at,
        user:users!announcement_reads_user_id_fkey(id, first_name, last_name)
      `
      )
      .eq('announcement_id', announcementId)
      .order('read_at', { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const readers = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...(row.user as Pick<User, 'id' | 'first_name' | 'last_name'>),
      read_at: row.read_at as string,
    }));

    return success({
      total_reads: readers.length,
      readers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get read stats';
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}