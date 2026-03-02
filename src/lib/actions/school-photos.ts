"use server";

// src/lib/actions/school-photos.ts
//
// ============================================================
// WattleOS V2 - School Photos Server Actions (Module R)
// ============================================================
// Photo session management, historical photo archive, bulk
// upload matching, and ID card generation.
//
// Upload flow:
//   1. Client compresses image (image-compression.ts)
//   2. Client uploads to "profile-photos" bucket via Supabase
//   3. Client calls registerPhoto() with storage path + URL
//   4. Server creates person_photos record
//   5. Optionally sets as current (updates students.photo_url
//      or users.avatar_url)
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  PersonPhoto,
  PersonPhotoWithPerson,
  PhotoCoverageStats,
  PhotoDashboardData,
  PhotoSession,
  PhotoSessionWithDetails,
  IdCardTemplate,
  IdCardPersonData,
} from "@/types/domain";
import { AuditActions, logAudit, logAuditBulk } from "@/lib/utils/audit";
import {
  createSessionSchema,
  updateSessionSchema,
  registerPhotoSchema,
  bulkMatchSchema,
  setCurrentPhotoSchema,
  cropPhotoSchema,
  saveIdCardTemplateSchema,
  generateIdCardsSchema,
  listPhotosFilterSchema,
  type CreateSessionInput,
  type UpdateSessionInput,
  type RegisterPhotoInput,
  type BulkMatchInput,
  type SetCurrentPhotoInput,
  type CropPhotoInput,
  type SaveIdCardTemplateInput,
  type GenerateIdCardsInput,
  type ListPhotosFilter,
} from "@/lib/validations/school-photos";

// ============================================================
// Session CRUD
// ============================================================

export async function createPhotoSession(
  input: CreateSessionInput,
): Promise<ActionResponse<PhotoSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = createSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("photo_sessions")
      .insert({
        tenant_id: context.tenant.id,
        name: parsed.data.name,
        description: parsed.data.description,
        session_date: parsed.data.session_date,
        person_type: parsed.data.person_type,
        status: "open",
        created_by: context.user.id,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PHOTO_SESSION_CREATED,
      entityType: "photo_session",
      entityId: data.id,
      metadata: {
        name: parsed.data.name,
        session_date: parsed.data.session_date,
      },
    });

    return success(data as PhotoSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create photo session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updatePhotoSession(
  sessionId: string,
  input: UpdateSessionInput,
): Promise<ActionResponse<PhotoSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;

    const { data, error } = await supabase
      .from("photo_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PHOTO_SESSION_UPDATED,
      entityType: "photo_session",
      entityId: sessionId,
      metadata: updateData,
    });

    return success(data as PhotoSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function closePhotoSession(
  sessionId: string,
): Promise<ActionResponse<PhotoSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("photo_sessions")
      .update({ status: "closed" })
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PHOTO_SESSION_CLOSED,
      entityType: "photo_session",
      entityId: sessionId,
    });

    return success(data as PhotoSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to close session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function archivePhotoSession(
  sessionId: string,
): Promise<ActionResponse<PhotoSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("photo_sessions")
      .update({ status: "archived" })
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PHOTO_SESSION_ARCHIVED,
      entityType: "photo_session",
      entityId: sessionId,
    });

    return success(data as PhotoSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to archive session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getPhotoSession(
  sessionId: string,
): Promise<ActionResponse<PhotoSessionWithDetails | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data: session, error } = await supabase
      .from("photo_sessions")
      .select(
        "*, created_by_user:users!photo_sessions_created_by_fkey(id, first_name, last_name)",
      )
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!session) return success(null);

    // Count matched vs unmatched photos
    const { count: totalCount } = await supabase
      .from("person_photos")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    const { count: matchedCount } = await supabase
      .from("person_photos")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .not("person_id", "is", null)
      .is("deleted_at", null);

    const total = totalCount ?? 0;
    const matched = matchedCount ?? 0;

    const createdByUser = Array.isArray(session.created_by_user)
      ? (session.created_by_user[0] ?? null)
      : (session.created_by_user ?? null);

    const result: PhotoSessionWithDetails = {
      ...(session as unknown as PhotoSession),
      created_by_user: createdByUser,
      photos_by_status: {
        matched,
        unmatched: total - matched,
        total,
      },
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Photo Registration & Management
// ============================================================

export async function registerPhoto(
  input: RegisterPhotoInput,
): Promise<ActionResponse<PersonPhoto>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = registerPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("person_photos")
      .insert({
        tenant_id: context.tenant.id,
        session_id: parsed.data.session_id,
        person_type: parsed.data.person_type,
        person_id: parsed.data.person_id,
        storage_path: parsed.data.storage_path,
        photo_url: parsed.data.photo_url,
        original_filename: parsed.data.original_filename,
        file_size_bytes: parsed.data.file_size_bytes || null,
        is_current: false,
        uploaded_by: context.user.id,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // Update session counters
    if (parsed.data.session_id) {
      await updateSessionCounts(
        supabase,
        parsed.data.session_id,
        context.tenant.id,
      );
    }

    // If set_as_current and person is assigned, set as current
    if (parsed.data.set_as_current && parsed.data.person_id) {
      await setPhotoAsCurrentInternal(
        supabase,
        context.tenant.id,
        data.id,
        parsed.data.person_type,
        parsed.data.person_id,
        parsed.data.photo_url,
      );
    }

    await logAudit({
      context,
      action: AuditActions.PHOTO_UPLOADED,
      entityType: "person_photo",
      entityId: data.id,
      metadata: {
        person_type: parsed.data.person_type,
        person_id: parsed.data.person_id,
        session_id: parsed.data.session_id,
        original_filename: parsed.data.original_filename,
      },
    });

    return success(data as PersonPhoto);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to register photo",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function confirmBulkMatch(
  input: BulkMatchInput,
): Promise<ActionResponse<{ matched: number; errors: string[] }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = bulkMatchSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    let matched = 0;
    const errors: string[] = [];

    for (const match of parsed.data.matches) {
      // Update person_photos row: set person_id
      const { data: photo, error: updateError } = await supabase
        .from("person_photos")
        .update({
          person_id: match.person_id,
          person_type: match.person_type,
        })
        .eq("id", match.photo_id)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .select("id, photo_url, person_type, person_id")
        .single();

      if (updateError) {
        errors.push(`Photo ${match.photo_id}: ${updateError.message}`);
        continue;
      }

      // Optionally set as current
      if (parsed.data.set_as_current && photo) {
        await setPhotoAsCurrentInternal(
          supabase,
          context.tenant.id,
          photo.id,
          match.person_type,
          match.person_id,
          photo.photo_url,
        );
      }

      matched++;
    }

    // Update session counts
    await updateSessionCounts(
      supabase,
      parsed.data.session_id,
      context.tenant.id,
    );

    await logAuditBulk(context, [
      {
        action: AuditActions.PHOTO_BULK_UPLOADED,
        entityType: "photo_session",
        entityId: parsed.data.session_id,
        metadata: {
          matched_count: matched,
          error_count: errors.length,
          set_as_current: parsed.data.set_as_current,
        },
      },
    ]);

    return success({ matched, errors });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to confirm bulk match",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function setPhotoAsCurrent(
  input: SetCurrentPhotoInput,
): Promise<ActionResponse<PersonPhoto>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = setCurrentPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch the photo to get person info
    const { data: photo, error: fetchError } = await supabase
      .from("person_photos")
      .select("*")
      .eq("id", parsed.data.photo_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !photo) {
      return failure("Photo not found", ErrorCodes.NOT_FOUND);
    }

    if (!photo.person_id) {
      return failure(
        "Photo is not assigned to a person",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    await setPhotoAsCurrentInternal(
      supabase,
      context.tenant.id,
      photo.id,
      photo.person_type,
      photo.person_id,
      photo.photo_url,
    );

    await logAudit({
      context,
      action: AuditActions.PHOTO_SET_CURRENT,
      entityType: "person_photo",
      entityId: photo.id,
      metadata: {
        person_type: photo.person_type,
        person_id: photo.person_id,
      },
    });

    return success({ ...photo, is_current: true } as PersonPhoto);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to set current photo",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deletePhoto(
  photoId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    // Fetch photo first
    const { data: photo, error: fetchError } = await supabase
      .from("person_photos")
      .select("*")
      .eq("id", photoId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !photo) {
      return failure("Photo not found", ErrorCodes.NOT_FOUND);
    }

    // Soft delete the photo record
    const { error: deleteError } = await supabase
      .from("person_photos")
      .update({ deleted_at: new Date().toISOString(), is_current: false })
      .eq("id", photoId);

    if (deleteError)
      return failure(deleteError.message, ErrorCodes.DATABASE_ERROR);

    // If this was the current photo, clear the profile URL
    if (photo.is_current && photo.person_id) {
      if (photo.person_type === "student") {
        await supabase
          .from("students")
          .update({ photo_url: null })
          .eq("id", photo.person_id)
          .eq("tenant_id", context.tenant.id);
      } else {
        await supabase
          .from("users")
          .update({ avatar_url: null })
          .eq("id", photo.person_id);
      }
    }

    // Remove from storage
    const admin = createSupabaseAdminClient();
    await admin.storage.from("profile-photos").remove([photo.storage_path]);

    // Update session counts if applicable
    if (photo.session_id) {
      await updateSessionCounts(supabase, photo.session_id, context.tenant.id);
    }

    await logAudit({
      context,
      action: AuditActions.PHOTO_DELETED,
      entityType: "person_photo",
      entityId: photoId,
      metadata: {
        person_type: photo.person_type,
        person_id: photo.person_id,
        was_current: photo.is_current,
      },
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete photo",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updatePhotoCrop(
  input: CropPhotoInput,
): Promise<ActionResponse<PersonPhoto>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = cropPhotoSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("person_photos")
      .update({ crop_data: parsed.data.crop_data })
      .eq("id", parsed.data.photo_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PHOTO_CROPPED,
      entityType: "person_photo",
      entityId: parsed.data.photo_id,
      metadata: { crop_data: parsed.data.crop_data },
    });

    return success(data as PersonPhoto);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update crop",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Queries
// ============================================================

export async function getPhotoDashboard(): Promise<
  ActionResponse<PhotoDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    // Fetch sessions (most recent first, limit 10)
    const { data: sessions, error: sessionsError } = await supabase
      .from("photo_sessions")
      .select(
        "*, created_by_user:users!photo_sessions_created_by_fkey(id, first_name, last_name)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(10);

    if (sessionsError)
      return failure(sessionsError.message, ErrorCodes.DATABASE_ERROR);

    // Build session details with photo counts
    const sessionDetails: PhotoSessionWithDetails[] = [];
    for (const session of sessions ?? []) {
      const { count: totalCount } = await supabase
        .from("person_photos")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null);

      const { count: matchedCount } = await supabase
        .from("person_photos")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("tenant_id", context.tenant.id)
        .not("person_id", "is", null)
        .is("deleted_at", null);

      const total = totalCount ?? 0;
      const matched = matchedCount ?? 0;

      const createdByUser = Array.isArray(session.created_by_user)
        ? (session.created_by_user[0] ?? null)
        : (session.created_by_user ?? null);

      sessionDetails.push({
        ...(session as unknown as PhotoSession),
        created_by_user: createdByUser,
        photos_by_status: { matched, unmatched: total - matched, total },
      });
    }

    // Student coverage
    const { count: totalStudents } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .in("enrollment_status", ["active", "enrolled"])
      .is("deleted_at", null);

    const { count: studentsWithPhoto } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .in("enrollment_status", ["active", "enrolled"])
      .not("photo_url", "is", null)
      .is("deleted_at", null);

    const totalStudentCount = totalStudents ?? 0;
    const studentPhotoCount = studentsWithPhoto ?? 0;

    const studentCoverage: PhotoCoverageStats = {
      total: totalStudentCount,
      with_photo: studentPhotoCount,
      without_photo: totalStudentCount - studentPhotoCount,
      percentage:
        totalStudentCount > 0
          ? Math.round((studentPhotoCount / totalStudentCount) * 100)
          : 0,
    };

    // Staff coverage
    const { count: totalStaff } = await supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    const { count: staffWithPhoto } = await supabase
      .from("tenant_members")
      .select("user_id, users!inner(avatar_url)", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active")
      .not("users.avatar_url", "is", null);

    const totalStaffCount = totalStaff ?? 0;
    const staffPhotoCount = staffWithPhoto ?? 0;

    const staffCoverage: PhotoCoverageStats = {
      total: totalStaffCount,
      with_photo: staffPhotoCount,
      without_photo: totalStaffCount - staffPhotoCount,
      percentage:
        totalStaffCount > 0
          ? Math.round((staffPhotoCount / totalStaffCount) * 100)
          : 0,
    };

    // Recent uploads (last 20)
    const { data: recentPhotos } = await supabase
      .from("person_photos")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const recentUploads: PersonPhotoWithPerson[] = (recentPhotos ?? []).map(
      (p) => ({
        ...(p as unknown as PersonPhoto),
        student: null,
        user: null,
      }),
    );

    return success({
      sessions: sessionDetails,
      student_coverage: studentCoverage,
      staff_coverage: staffCoverage,
      recent_uploads: recentUploads,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listStudentPhotos(filter: ListPhotosFilter): Promise<
  ActionResponse<{
    students: Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
      class_name: string | null;
      has_photo: boolean;
    }>;
    total: number;
  }>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = listPhotosFilterSchema.safeParse(filter);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    let query = supabase
      .from("students")
      .select(
        "id, first_name, last_name, preferred_name, photo_url, enrollments!inner(class:classes(name))",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .in("enrollment_status", ["active", "enrolled"])
      .is("deleted_at", null);

    // Search filter
    if (parsed.data.search) {
      const term = `%${parsed.data.search}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},preferred_name.ilike.${term}`,
      );
    }

    // Photo filter
    if (parsed.data.has_photo === true) {
      query = query.not("photo_url", "is", null);
    } else if (parsed.data.has_photo === false) {
      query = query.is("photo_url", null);
    }

    // Pagination
    const offset = (parsed.data.page - 1) * parsed.data.per_page;
    query = query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + parsed.data.per_page - 1);

    const { data, error, count } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const students = (data ?? []).map((s: Record<string, unknown>) => {
      const enrollments = (s.enrollments ?? []) as Array<{
        class: Array<{ name: string }> | null;
      }>;
      const className = enrollments[0]?.class?.[0]?.name ?? null;

      return {
        id: s.id as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
        preferred_name: s.preferred_name as string | null,
        photo_url: s.photo_url as string | null,
        class_name: className,
        has_photo: s.photo_url !== null,
      };
    });

    return success({ students, total: count ?? 0 });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list students",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listStaffPhotos(filter: ListPhotosFilter): Promise<
  ActionResponse<{
    staff: Array<{
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      role_name: string | null;
      has_photo: boolean;
    }>;
    total: number;
  }>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = listPhotosFilterSchema.safeParse(filter);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    let query = supabase
      .from("tenant_members")
      .select(
        "user_id, users!inner(id, first_name, last_name, avatar_url), role:roles(name)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    // Search filter
    if (parsed.data.search) {
      const term = `%${parsed.data.search}%`;
      query = query.or(
        `users.first_name.ilike.${term},users.last_name.ilike.${term}`,
      );
    }

    // Pagination
    const offset = (parsed.data.page - 1) * parsed.data.per_page;
    query = query.range(offset, offset + parsed.data.per_page - 1);

    const { data, error, count } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const staff = (data ?? []).map((m: Record<string, unknown>) => {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      const role = Array.isArray(m.role) ? m.role[0] : m.role;

      return {
        id: (user as Record<string, unknown>)?.id as string,
        first_name: (user as Record<string, unknown>)?.first_name as string,
        last_name: (user as Record<string, unknown>)?.last_name as string,
        avatar_url: (user as Record<string, unknown>)?.avatar_url as
          | string
          | null,
        role_name: (role as Record<string, unknown>)?.name as string | null,
        has_photo: (user as Record<string, unknown>)?.avatar_url !== null,
      };
    });

    return success({ staff, total: count ?? 0 });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list staff",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getPersonPhotoHistory(
  personType: "student" | "staff",
  personId: string,
): Promise<ActionResponse<PersonPhoto[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("person_photos")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("person_type", personType)
      .eq("person_id", personId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as PersonPhoto[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get photo history",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getSessionPhotos(
  sessionId: string,
): Promise<ActionResponse<PersonPhoto[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("person_photos")
      .select("*")
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as PersonPhoto[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get session photos",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ID Card Templates
// ============================================================

export async function saveIdCardTemplate(
  input: SaveIdCardTemplateInput,
): Promise<ActionResponse<IdCardTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = saveIdCardTemplateSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // If setting as default, unset other defaults for same person_type
    if (parsed.data.is_default) {
      await supabase
        .from("id_card_templates")
        .update({ is_default: false })
        .eq("tenant_id", context.tenant.id)
        .eq("person_type", parsed.data.person_type)
        .is("deleted_at", null);
    }

    let data;
    let error;

    if (parsed.data.id) {
      // Update existing
      const result = await supabase
        .from("id_card_templates")
        .update({
          name: parsed.data.name,
          person_type: parsed.data.person_type,
          template_config: parsed.data.template_config,
          is_default: parsed.data.is_default,
        })
        .eq("id", parsed.data.id)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .select("*")
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from("id_card_templates")
        .insert({
          tenant_id: context.tenant.id,
          name: parsed.data.name,
          person_type: parsed.data.person_type,
          template_config: parsed.data.template_config,
          is_default: parsed.data.is_default,
        })
        .select("*")
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ID_CARD_TEMPLATE_SAVED,
      entityType: "id_card_template",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    return success(data as IdCardTemplate);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to save template",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getIdCardTemplates(): Promise<
  ActionResponse<IdCardTemplate[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("id_card_templates")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as IdCardTemplate[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list templates",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getIdCardPersonData(
  input: GenerateIdCardsInput,
): Promise<
  ActionResponse<{ template: IdCardTemplate; people: IdCardPersonData[] }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const parsed = generateIdCardsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch template
    const { data: template, error: tplError } = await supabase
      .from("id_card_templates")
      .select("*")
      .eq("id", parsed.data.template_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (tplError || !template) {
      return failure("Template not found", ErrorCodes.NOT_FOUND);
    }

    const people: IdCardPersonData[] = [];

    if ((template as IdCardTemplate).person_type === "student") {
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select(
          "id, first_name, last_name, preferred_name, photo_url, enrollments(class:classes(name))",
        )
        .eq("tenant_id", context.tenant.id)
        .in("id", parsed.data.person_ids)
        .is("deleted_at", null);

      if (studentError)
        return failure(studentError.message, ErrorCodes.DATABASE_ERROR);

      for (const s of students ?? []) {
        const enrollments = (s.enrollments ?? []) as Array<{
          class: Array<{ name: string }> | null;
        }>;
        const className = enrollments[0]?.class?.[0]?.name ?? null;
        people.push({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          preferred_name: s.preferred_name,
          photo_url: s.photo_url,
          class_name: className,
          position: null,
          person_type: "student",
        });
      }
    } else {
      const { data: members, error: staffError } = await supabase
        .from("tenant_members")
        .select(
          "user_id, users!inner(id, first_name, last_name, avatar_url), role:roles(name)",
        )
        .eq("tenant_id", context.tenant.id)
        .in("user_id", parsed.data.person_ids)
        .eq("status", "active");

      if (staffError)
        return failure(staffError.message, ErrorCodes.DATABASE_ERROR);

      for (const m of members ?? []) {
        const user = Array.isArray(m.users) ? m.users[0] : m.users;
        const role = Array.isArray(m.role) ? m.role[0] : m.role;

        if (user) {
          people.push({
            id: (user as Record<string, unknown>).id as string,
            first_name: (user as Record<string, unknown>).first_name as string,
            last_name: (user as Record<string, unknown>).last_name as string,
            preferred_name: null,
            photo_url: (user as Record<string, unknown>).avatar_url as
              | string
              | null,
            class_name: null,
            position: (role as Record<string, unknown>)?.name as string | null,
            person_type: "staff",
          });
        }
      }
    }

    await logAudit({
      context,
      action: AuditActions.ID_CARDS_GENERATED,
      entityType: "id_card_template",
      entityId: parsed.data.template_id,
      metadata: { person_count: people.length, year: parsed.data.year },
    });

    return success({ template: template as IdCardTemplate, people });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to generate ID cards",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Roster Data for Matching
// ============================================================

export async function getStudentRoster(): Promise<
  ActionResponse<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
    }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("tenant_id", context.tenant.id)
      .in("enrollment_status", ["active", "enrolled"])
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success(data ?? []);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get roster",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getStaffRoster(): Promise<
  ActionResponse<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
    }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("tenant_members")
      .select("user_id, users!inner(id, first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const roster = (data ?? []).map((m: Record<string, unknown>) => {
      const user = Array.isArray(m.users) ? m.users[0] : m.users;
      return {
        id: (user as Record<string, unknown>).id as string,
        first_name: (user as Record<string, unknown>).first_name as string,
        last_name: (user as Record<string, unknown>).last_name as string,
        preferred_name: null,
      };
    });

    return success(roster);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get staff roster",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Internal Helpers
// ============================================================

async function setPhotoAsCurrentInternal(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  photoId: string,
  personType: string,
  personId: string,
  photoUrl: string,
): Promise<void> {
  // 1. Unset previous current for this person
  await supabase
    .from("person_photos")
    .update({ is_current: false })
    .eq("tenant_id", tenantId)
    .eq("person_type", personType)
    .eq("person_id", personId)
    .eq("is_current", true)
    .is("deleted_at", null);

  // 2. Set new current
  await supabase
    .from("person_photos")
    .update({ is_current: true })
    .eq("id", photoId);

  // 3. Update the profile URL on the source table
  if (personType === "student") {
    await supabase
      .from("students")
      .update({ photo_url: photoUrl })
      .eq("id", personId)
      .eq("tenant_id", tenantId);
  } else {
    await supabase
      .from("users")
      .update({ avatar_url: photoUrl })
      .eq("id", personId);
  }
}

async function updateSessionCounts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sessionId: string,
  tenantId: string,
): Promise<void> {
  const { count: totalCount } = await supabase
    .from("person_photos")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  const { count: matchedCount } = await supabase
    .from("person_photos")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantId)
    .not("person_id", "is", null)
    .is("deleted_at", null);

  await supabase
    .from("photo_sessions")
    .update({
      total_photos: totalCount ?? 0,
      matched_count: matchedCount ?? 0,
    })
    .eq("id", sessionId)
    .eq("tenant_id", tenantId);
}
