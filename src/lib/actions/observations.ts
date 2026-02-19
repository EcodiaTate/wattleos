// src/lib/actions/observations.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse, PaginatedResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';
import type {
  Observation,
  ObservationFeedItem,
  ObservationMedia,
  Student,
  CurriculumNode,
  User,
} from '@/types/domain';

// Local helper types for relation rows returned by Supabase selects.
// (We keep them minimal and then map into canonical domain shapes.)
type AuthorRow = Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;

type StudentPick = Pick<Student, 'id' | 'first_name' | 'last_name' | 'preferred_name' | 'photo_url'>;
type OutcomePick = Pick<CurriculumNode, 'id' | 'title' | 'level'>;

type ObsRow = {
  id: string;
  content: string | null;
  status: Observation['status'];
  created_at: string;
  published_at: string | null;
  author_id: string;
};

// Local “join row” shapes for mapping
type ObservationStudentJoin = { student: StudentPick };
type ObservationOutcomeJoin = { curriculum_node: OutcomePick };

// ============================================================
// CREATE: New observation (starts as draft)
// ============================================================
export async function createObservation(input: {
  content: string;
  studentIds: string[];
  outcomeIds: string[];
}): Promise<ActionResponse<Observation>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  // 1. Create the observation
  const { data: observation, error: obsError } = await supabase
    .from('observations')
    .insert({
      tenant_id: context.tenant.id,
      author_id: context.user.id,
      content: input.content,
      status: 'draft',
    })
    .select()
    .single();

  if (obsError || !observation) {
    return failure(obsError?.message ?? 'Failed to create observation', ErrorCodes.INTERNAL_ERROR);
  }

  // 2. Tag students
  if (input.studentIds.length > 0) {
    const studentInserts = input.studentIds.map((studentId) => ({
      tenant_id: context.tenant.id,
      observation_id: (observation as any).id,
      student_id: studentId,
    }));

    const { error: studentsError } = await supabase.from('observation_students').insert(studentInserts);

    if (studentsError) {
      // Non-fatal: observation was created, students just failed to tag
      console.error('Failed to tag students:', studentsError.message);
    }
  }

  // 3. Tag curriculum outcomes
  if (input.outcomeIds.length > 0) {
    const outcomeInserts = input.outcomeIds.map((nodeId) => ({
      tenant_id: context.tenant.id,
      observation_id: (observation as any).id,
      curriculum_node_id: nodeId,
    }));

    const { error: outcomesError } = await supabase.from('observation_outcomes').insert(outcomeInserts);

    if (outcomesError) {
      console.error('Failed to tag outcomes:', outcomesError.message);
    }
  }

  return success(observation as Observation);
}

// ============================================================
// UPDATE: Edit an observation draft
// ============================================================
export async function updateObservation(
  observationId: string,
  input: {
    content?: string;
    studentIds?: string[];
    outcomeIds?: string[];
  }
): Promise<ActionResponse<Observation>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  // Verify ownership and draft status
  const { data: existing, error: existingError } = await supabase
    .from('observations')
    .select('id, author_id, status')
    .eq('id', observationId)
    .is('deleted_at', null)
    .single();

  if (existingError) return failure(existingError.message, ErrorCodes.INTERNAL_ERROR);
  if (!existing) return failure('Observation not found', ErrorCodes.NOT_FOUND);

  if ((existing as any).status === 'published') {
    return failure('Published observations cannot be edited', ErrorCodes.VALIDATION_ERROR);
  }

  if ((existing as any).author_id !== context.user.id) {
    return failure('Only the author can edit a draft', ErrorCodes.FORBIDDEN);
  }

  // Update content if provided
  if (input.content !== undefined) {
    const { error } = await supabase.from('observations').update({ content: input.content }).eq('id', observationId);
    if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);
  }

  // Replace student tags if provided
  if (input.studentIds !== undefined) {
    await supabase.from('observation_students').delete().eq('observation_id', observationId);

    if (input.studentIds.length > 0) {
      const { error } = await supabase.from('observation_students').insert(
        input.studentIds.map((sid) => ({
          tenant_id: context.tenant.id,
          observation_id: observationId,
          student_id: sid,
        }))
      );
      if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }
  }

  // Replace outcome tags if provided
  if (input.outcomeIds !== undefined) {
    await supabase.from('observation_outcomes').delete().eq('observation_id', observationId);

    if (input.outcomeIds.length > 0) {
      const { error } = await supabase.from('observation_outcomes').insert(
        input.outcomeIds.map((nid) => ({
          tenant_id: context.tenant.id,
          observation_id: observationId,
          curriculum_node_id: nid,
        }))
      );
      if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }
  }

  // Fetch updated observation
  const { data, error } = await supabase.from('observations').select('*').eq('id', observationId).single();
  if (error || !data) return failure('Failed to fetch updated observation', ErrorCodes.INTERNAL_ERROR);

  return success(data as Observation);
}

// ============================================================
// PUBLISH: Transition observation from draft to published
// ============================================================
export async function publishObservation(observationId: string): Promise<ActionResponse<Observation>> {
  await requirePermission(Permissions.PUBLISH_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('observations')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', observationId)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !data) {
    return failure(error?.message ?? 'Observation not found or already published', ErrorCodes.NOT_FOUND);
  }

  return success(data as Observation);
}

// ============================================================
// ARCHIVE: Soft-archive a published observation
// ============================================================
export async function archiveObservation(observationId: string): Promise<ActionResponse<Observation>> {
  await requirePermission(Permissions.PUBLISH_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('observations')
    .update({ status: 'archived' })
    .eq('id', observationId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !data) return failure(error?.message ?? 'Observation not found', ErrorCodes.NOT_FOUND);

  return success(data as Observation);
}

// ============================================================
// DELETE: Soft-delete a draft observation
// ============================================================
export async function deleteObservation(
  observationId: string
): Promise<ActionResponse<{ success: boolean }>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from('observations')
    .select('author_id, status')
    .eq('id', observationId)
    .is('deleted_at', null)
    .single();

  if (existingError) return failure(existingError.message, ErrorCodes.INTERNAL_ERROR);
  if (!existing) return failure('Observation not found', ErrorCodes.NOT_FOUND);

  if ((existing as any).status !== 'draft') {
    return failure('Only drafts can be deleted', ErrorCodes.VALIDATION_ERROR);
  }

  if ((existing as any).author_id !== context.user.id) {
    return failure('Only the author can delete a draft', ErrorCodes.FORBIDDEN);
  }

  const { error } = await supabase
    .from('observations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', observationId);

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success({ success: true });
}

// ============================================================
// FEED: Get observation feed with relations (paginated)
// ============================================================
export async function getObservationFeed(options?: {
  page?: number;
  perPage?: number;
  status?: 'draft' | 'published' | 'archived';
  studentId?: string;
  outcomeId?: string;
  authorId?: string;
}): Promise<PaginatedResponse<ObservationFeedItem>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const page = options?.page ?? 1;
  const perPage = options?.perPage ?? 20;
  const offset = (page - 1) * perPage;

  let countQuery = supabase
    .from('observations')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  let dataQuery = supabase
    .from('observations')
    .select('id, content, status, created_at, published_at, author_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (options?.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  if (options?.authorId) {
    countQuery = countQuery.eq('author_id', options.authorId);
    dataQuery = dataQuery.eq('author_id', options.authorId);
  }

  if (options?.studentId) {
    const { data: obsIds, error } = await supabase
      .from('observation_students')
      .select('observation_id')
      .eq('student_id', options.studentId);

    if (error) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: error.message, code: ErrorCodes.INTERNAL_ERROR },
      };
    }

    const ids = (obsIds ?? []).map((r: any) => r.observation_id as string);
    if (ids.length === 0) {
      return { data: [], pagination: { total: 0, page, per_page: perPage, total_pages: 0 }, error: null };
    }
    countQuery = countQuery.in('id', ids);
    dataQuery = dataQuery.in('id', ids);
  }

  if (options?.outcomeId) {
    const { data: obsIds, error } = await supabase
      .from('observation_outcomes')
      .select('observation_id')
      .eq('curriculum_node_id', options.outcomeId);

    if (error) {
      return {
        data: [],
        pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
        error: { message: error.message, code: ErrorCodes.INTERNAL_ERROR },
      };
    }

    const ids = (obsIds ?? []).map((r: any) => r.observation_id as string);
    if (ids.length === 0) {
      return { data: [], pagination: { total: 0, page, per_page: perPage, total_pages: 0 }, error: null };
    }
    countQuery = countQuery.in('id', ids);
    dataQuery = dataQuery.in('id', ids);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
      error: { message: countError.message, code: ErrorCodes.INTERNAL_ERROR },
    };
  }

  const { data: observations, error: dataError } = await dataQuery;
  if (dataError || !observations) {
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
      error: { message: dataError?.message ?? 'Failed', code: ErrorCodes.INTERNAL_ERROR },
    };
  }

  const obsRows = observations as unknown as ObsRow[];

  if (obsRows.length === 0) {
    return {
      data: [],
      pagination: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
      error: null,
    };
  }

  const obsIds = obsRows.map((o) => o.id);
  const authorIds = [...new Set(obsRows.map((o) => o.author_id))];

  const [authorsRes, studentsRes, outcomesRes, mediaRes] = await Promise.all([
    supabase.from('users').select('id, first_name, last_name, avatar_url').in('id', authorIds),
    supabase
      .from('observation_students')
      .select('observation_id, student:students(id, first_name, last_name, preferred_name, photo_url)')
      .in('observation_id', obsIds),
    supabase
      .from('observation_outcomes')
      .select('observation_id, curriculum_node:curriculum_nodes(id, title, level)')
      .in('observation_id', obsIds),
    supabase
      .from('observation_media')
      .select('*')
      .in('observation_id', obsIds)
      .is('deleted_at', null),
  ]);

  const authorMap = new Map<string, AuthorRow>(
    (authorsRes.data ?? []).map((a: any) => [
      a.id as string,
      {
        id: a.id as string,
        first_name: a.first_name ?? null,
        last_name: a.last_name ?? null,
        avatar_url: a.avatar_url ?? null,
      } satisfies AuthorRow,
    ])
  );

  // observation_students map: obsId -> [{ student }]
  const studentsByObs = new Map<string, ObservationStudentJoin[]>();
  for (const row of (studentsRes.data ?? []) as any[]) {
    const obsId = row.observation_id as string;
    const student = row.student as StudentPick | null;
    if (!student) continue;

    if (!studentsByObs.has(obsId)) studentsByObs.set(obsId, []);
    studentsByObs.get(obsId)!.push({ student });
  }

  // observation_outcomes map: obsId -> [{ curriculum_node }]
  const outcomesByObs = new Map<string, ObservationOutcomeJoin[]>();
  for (const row of (outcomesRes.data ?? []) as any[]) {
    const obsId = row.observation_id as string;
    const node = row.curriculum_node as OutcomePick | null;
    if (!node) continue;

    if (!outcomesByObs.has(obsId)) outcomesByObs.set(obsId, []);
    outcomesByObs.get(obsId)!.push({ curriculum_node: node });
  }

  // observation_media map: obsId -> ObservationMedia[]
  const mediaByObs = new Map<string, ObservationMedia[]>();
  for (const row of (mediaRes.data ?? []) as any[]) {
    const obsId = row.observation_id as string;
    if (!mediaByObs.has(obsId)) mediaByObs.set(obsId, []);
    mediaByObs.get(obsId)!.push(row as ObservationMedia);
  }

  const feedItems: ObservationFeedItem[] = obsRows.map((obs) => ({
    id: obs.id,
    content: obs.content,
    status: obs.status,
    published_at: obs.published_at,
    created_at: obs.created_at,
    author:
      authorMap.get(obs.author_id) ??
      ({
        id: obs.author_id,
        first_name: null,
        last_name: null,
        avatar_url: null,
      } as AuthorRow),
    students: (studentsByObs.get(obs.id) ?? []).map((os: ObservationStudentJoin) => os.student),
    outcomes: (outcomesByObs.get(obs.id) ?? []).map((oo: ObservationOutcomeJoin) => oo.curriculum_node),
    media: mediaByObs.get(obs.id) ?? [],
  }));

  return {
    data: feedItems,
    pagination: {
      total: count ?? 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count ?? 0) / perPage),
    },
    error: null,
  };
}

// ============================================================
// GET: Single observation with full relations
// ============================================================
export async function getObservation(
  observationId: string
): Promise<ActionResponse<ObservationFeedItem>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data: obs, error: obsError } = await supabase
    .from('observations')
    .select('id, content, status, created_at, published_at, author_id')
    .eq('id', observationId)
    .is('deleted_at', null)
    .single();

  if (obsError) return failure(obsError.message, ErrorCodes.INTERNAL_ERROR);
  if (!obs) return failure('Observation not found', ErrorCodes.NOT_FOUND);

  const obsRow = obs as unknown as ObsRow;

  const [authorRes, studentsRes, outcomesRes, mediaRes] = await Promise.all([
    supabase.from('users').select('id, first_name, last_name, avatar_url').eq('id', obsRow.author_id).single(),
    supabase
      .from('observation_students')
      .select('student:students(id, first_name, last_name, preferred_name, photo_url)')
      .eq('observation_id', observationId),
    supabase
      .from('observation_outcomes')
      .select('curriculum_node:curriculum_nodes(id, title, level)')
      .eq('observation_id', observationId),
    supabase.from('observation_media').select('*').eq('observation_id', observationId).is('deleted_at', null),
  ]);

  const author: AuthorRow =
    (authorRes.data as any) ??
    ({
      id: obsRow.author_id,
      first_name: null,
      last_name: null,
      avatar_url: null,
    } as AuthorRow);

  const observation_students: ObservationStudentJoin[] = ((studentsRes.data ?? []) as any[])
    .filter((r) => r.student)
    .map((r) => ({ student: r.student as StudentPick }));

  const observation_outcomes: ObservationOutcomeJoin[] = ((outcomesRes.data ?? []) as any[])
    .filter((r) => r.curriculum_node)
    .map((r) => ({ curriculum_node: r.curriculum_node as OutcomePick }));

  const observation_media: ObservationMedia[] = ((mediaRes.data ?? []) as any[]).map((m) => m as ObservationMedia);

  const feedItem: ObservationFeedItem = {
    id: obsRow.id,
    content: obsRow.content,
    status: obsRow.status,
    created_at: obsRow.created_at,
    published_at: obsRow.published_at,
    author,
    students: observation_students.map((os: ObservationStudentJoin) => os.student),
    outcomes: observation_outcomes.map((oo: ObservationOutcomeJoin) => oo.curriculum_node),
    media: observation_media,
  };

  return success(feedItem);
}

// ============================================================
// MEDIA: Record a media attachment (after upload to storage)
// ============================================================
export async function addObservationMedia(input: {
  observationId: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  storageProvider: 'supabase' | 'google_drive';
  storagePath?: string;
  googleDriveFileId?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
}): Promise<ActionResponse<ObservationMedia>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('observation_media')
    .insert({
      tenant_id: context.tenant.id,
      observation_id: input.observationId,
      media_type: input.mediaType,
      storage_provider: input.storageProvider,
      storage_path: input.storagePath ?? null,
      google_drive_file_id: input.googleDriveFileId ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      file_name: input.fileName ?? null,
      file_size_bytes: input.fileSizeBytes ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    return failure(error?.message ?? 'Failed to add media', ErrorCodes.INTERNAL_ERROR);
  }

  return success(data as ObservationMedia);
}

// ============================================================
// MEDIA: Delete a media attachment
// ============================================================
export async function deleteObservationMedia(
  mediaId: string
): Promise<ActionResponse<{ success: boolean }>> {
  await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('observation_media')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', mediaId);

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success({ success: true });
}
