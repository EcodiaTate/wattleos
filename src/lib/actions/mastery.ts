// src/lib/actions/mastery.ts
'use server';

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';

import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';
import type {
  StudentMastery,
  MasteryHistoryEntry,
  MasteryStatus,
} from '@/types/domain';

// ============================================================
// Composite types for UI rendering
// ============================================================

export interface MasteryWithNode extends StudentMastery {
  curriculum_node: {
    id: string;
    title: string;
    level: string;
    parent_id: string | null;
    instance_id: string;
    sequence_order: number;
    is_hidden: boolean;
  };
}

export interface MasteryHistoryWithMeta extends MasteryHistoryEntry {
  changed_by_user:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | null;
  curriculum_node_title: string;
}

export interface StudentMasteryOverview {
  student_id: string;
  student_name: string;
  total_outcomes: number;
  not_started: number;
  presented: number;
  practicing: number;
  mastered: number;
}

export interface ClassHeatmapRow {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  statuses: Record<string, MasteryStatus>; // curriculum_node_id → status
}

export interface PortfolioTimelineItem {
  type: 'observation' | 'mastery_change';
  date: string;
  // Observation fields
  observation_id?: string;
  observation_content?: string | null;
  observation_author?: string;
  observation_outcomes?: Array<{ id: string; title: string }>;
  observation_media_count?: number;
  // Mastery change fields
  mastery_node_title?: string;
  mastery_previous_status?: string | null;
  mastery_new_status?: string;
  mastery_changed_by?: string;
}

// ============================================================
// READ: Get all mastery records for a student within an instance
// ============================================================
export async function getStudentMastery(
  studentId: string,
  instanceId: string
): Promise<ActionResponse<MasteryWithNode[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  // Get all curriculum nodes for this instance
  const { data: nodes, error: nodesError } = await supabase
    .from('curriculum_nodes')
    .select('id, title, level, parent_id, instance_id, sequence_order, is_hidden')
    .eq('instance_id', instanceId)
    .is('deleted_at', null)
    .eq('is_hidden', false)
    .order('sequence_order');

  if (nodesError) return failure(nodesError.message, ErrorCodes.INTERNAL_ERROR);
  if (!nodes || nodes.length === 0) return success([]);

  // Get existing mastery records for this student
  const nodeIds = nodes.map((n) => n.id);
  const { data: masteryRecords, error: masteryError } = await supabase
    .from('student_mastery')
    .select('*')
    .eq('student_id', studentId)
    .in('curriculum_node_id', nodeIds)
    .is('deleted_at', null);

  if (masteryError) return failure(masteryError.message, ErrorCodes.INTERNAL_ERROR);

  // Build a map of existing mastery records
  const masteryMap = new Map<string, StudentMastery>();
  for (const record of masteryRecords ?? []) {
    masteryMap.set(record.curriculum_node_id as string, record as unknown as StudentMastery);
  }

  // Merge: for each node, return mastery record (or synthesize a not_started one)
  const result: MasteryWithNode[] = nodes.map((node) => {
    const existing = masteryMap.get(node.id);
    if (existing) {
      return {
        ...existing,
        curriculum_node: node,
      };
    }

    // Synthesize a "not_started" placeholder (not persisted until first status change)
    return {
      id: `virtual-${node.id}`,
      tenant_id: '',
      student_id: studentId,
      curriculum_node_id: node.id,
      status: 'not_started' as MasteryStatus,
      date_achieved: null,
      assessed_by: null,
      notes: null,
      created_at: '',
      updated_at: '',
      deleted_at: undefined,
      curriculum_node: node,
    };
  });

  return success(result);
}

// ============================================================
// UPDATE: Set mastery status for a student × outcome
// ============================================================
// 1) Upsert student_mastery via cookie-auth client (RLS applies)
// 2) Insert mastery_history via service-role admin client
// ============================================================
export async function updateMasteryStatus(input: {
  studentId: string;
  curriculumNodeId: string;
  newStatus: MasteryStatus;
  notes?: string;
}): Promise<ActionResponse<StudentMastery>> {
  const context = await requirePermission(Permissions.MANAGE_MASTERY);

  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if a mastery record already exists
  const { data: existing, error: existingError } = await supabase
    .from('student_mastery')
    .select('*')
    .eq('student_id', input.studentId)
    .eq('curriculum_node_id', input.curriculumNodeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    return failure(existingError.message, ErrorCodes.INTERNAL_ERROR);
  }

  let masteryRecord: StudentMastery;
  const previousStatus = (existing as { status?: string } | null)?.status ?? null;

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('student_mastery')
      .update({
        status: input.newStatus,
        date_achieved: today,
        assessed_by: context.user.id,
        notes: input.notes ?? (existing as { notes?: string | null }).notes ?? null,
      })
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? 'Failed to update mastery', ErrorCodes.INTERNAL_ERROR);
    }
    masteryRecord = data as unknown as StudentMastery;
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('student_mastery')
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.studentId,
        curriculum_node_id: input.curriculumNodeId,
        status: input.newStatus,
        date_achieved: today,
        assessed_by: context.user.id,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(error?.message ?? 'Failed to create mastery record', ErrorCodes.INTERNAL_ERROR);
    }
    masteryRecord = data as unknown as StudentMastery;
  }

  // Append to mastery_history (service role — bypasses RLS)
  const { error: histError } = await adminClient.from('mastery_history').insert({
    tenant_id: context.tenant.id,
    student_mastery_id: masteryRecord.id,
    student_id: input.studentId,
    curriculum_node_id: input.curriculumNodeId,
    previous_status: previousStatus,
    new_status: input.newStatus,
    changed_by: context.user.id,
  });

  if (histError) {
    return failure(histError.message, ErrorCodes.INTERNAL_ERROR);
  }

  return success(masteryRecord);
}

// ============================================================
// BULK UPDATE: Set mastery status for multiple outcomes at once
// ============================================================
export async function bulkUpdateMasteryStatus(input: {
  studentId: string;
  updates: Array<{
    curriculumNodeId: string;
    newStatus: MasteryStatus;
  }>;
}): Promise<ActionResponse<{ updated: number }>> {
  await requirePermission(Permissions.MANAGE_MASTERY);

  let updated = 0;
  for (const update of input.updates) {
    const result = await updateMasteryStatus({
      studentId: input.studentId,
      curriculumNodeId: update.curriculumNodeId,
      newStatus: update.newStatus,
    });
    if (result.data) updated++;
  }

  return success({ updated });
}

// ============================================================
// READ: Get mastery history for a student (timeline)
// ============================================================
export async function getStudentMasteryHistory(
  studentId: string,
  limit: number = 50
): Promise<ActionResponse<MasteryHistoryWithMeta[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('mastery_history')
    .select(
      `
      *,
      changed_by_user:users!mastery_history_changed_by_fkey(first_name, last_name),
      curriculum_node:curriculum_nodes!mastery_history_curriculum_node_id_fkey(title)
    `
    )
    .eq('student_id', studentId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback: if the join fails (possible with RLS), do a simpler query
    const { data: simpleData, error: simpleError } = await supabase
      .from('mastery_history')
      .select('*')
      .eq('student_id', studentId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (simpleError) return failure(simpleError.message, ErrorCodes.INTERNAL_ERROR);

    const result: MasteryHistoryWithMeta[] = (simpleData ?? []).map((row) => ({
      ...(row as unknown as MasteryHistoryEntry),
      changed_by_user: null,
      curriculum_node_title: '',
    }));

    return success(result);
  }

  const result: MasteryHistoryWithMeta[] = (data ?? []).map((row: Record<string, unknown>) => {
    const changedByUser = row.changed_by_user as
      | { first_name: string | null; last_name: string | null }
      | null;
    const curriculumNode = row.curriculum_node as { title: string } | null;

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      student_mastery_id: row.student_mastery_id as string,
      student_id: row.student_id as string,
      curriculum_node_id: row.curriculum_node_id as string,
      previous_status: (row.previous_status as MasteryStatus | null),
      new_status: (row.new_status as MasteryStatus),
      
      changed_by: row.changed_by as string | null,
      changed_at: row.changed_at as string,
      changed_by_user: changedByUser,
      curriculum_node_title: curriculumNode?.title ?? '',
    };
  });

  return success(result);
}

// ============================================================
// READ: Get mastery overview for all students in a class
// (used for the class heatmap)
// ============================================================
export async function getClassMasteryHeatmap(
  instanceId: string,
  studentIds: string[]
): Promise<ActionResponse<ClassHeatmapRow[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  if (studentIds.length === 0) return success([]);

  // Get all outcome-level nodes for this instance
  const { data: outcomes, error: outcomesError } = await supabase
    .from('curriculum_nodes')
    .select('id')
    .eq('instance_id', instanceId)
    .eq('level', 'outcome')
    .eq('is_hidden', false)
    .is('deleted_at', null);

  if (outcomesError) return failure(outcomesError.message, ErrorCodes.INTERNAL_ERROR);

  const outcomeIds = (outcomes ?? []).map((o) => o.id);

  // Get all mastery records for these students × outcomes
  const { data: masteryRecords, error: masteryError } = await supabase
    .from('student_mastery')
    .select('student_id, curriculum_node_id, status')
    .in('student_id', studentIds)
    .in('curriculum_node_id', outcomeIds)
    .is('deleted_at', null);

  if (masteryError) return failure(masteryError.message, ErrorCodes.INTERNAL_ERROR);

  // Get student names
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .in('id', studentIds)
    .is('deleted_at', null)
    .order('last_name')
    .order('first_name');

  if (studentsError) return failure(studentsError.message, ErrorCodes.INTERNAL_ERROR);

  // Build the heatmap rows
  const masteryByStudent = new Map<string, Record<string, MasteryStatus>>();
  for (const record of masteryRecords ?? []) {
    const sid = record.student_id as string;
    const nid = record.curriculum_node_id as string;
    if (!masteryByStudent.has(sid)) masteryByStudent.set(sid, {});
    masteryByStudent.get(sid)![nid] = record.status as MasteryStatus;
  }

  const rows: ClassHeatmapRow[] = (students ?? []).map((student) => ({
    student_id: student.id,
    student_first_name: student.first_name,
    student_last_name: student.last_name,
    statuses: masteryByStudent.get(student.id) ?? {},
  }));

  return success(rows);
}

// ============================================================
// READ: Get mastery summary stats for a single student
// (used for portfolio header and dashboard widgets)
// ============================================================
export async function getStudentMasterySummary(
  studentId: string,
  instanceId: string
): Promise<
  ActionResponse<{
    total: number;
    not_started: number;
    presented: number;
    practicing: number;
    mastered: number;
  }>
> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  // Count total outcome nodes in the instance
  const { count: totalCount, error: countError } = await supabase
    .from('curriculum_nodes')
    .select('id', { count: 'exact', head: true })
    .eq('instance_id', instanceId)
    .eq('level', 'outcome')
    .eq('is_hidden', false)
    .is('deleted_at', null);

  if (countError) return failure(countError.message, ErrorCodes.INTERNAL_ERROR);

  const total = totalCount ?? 0;

  // Fetch outcome IDs once
  const { data: outcomeNodes, error: outcomeIdsError } = await supabase
    .from('curriculum_nodes')
    .select('id')
    .eq('instance_id', instanceId)
    .eq('level', 'outcome')
    .eq('is_hidden', false)
    .is('deleted_at', null);

  if (outcomeIdsError) return failure(outcomeIdsError.message, ErrorCodes.INTERNAL_ERROR);

  const outcomeIds = (outcomeNodes ?? []).map((n) => n.id);

  // Count mastery records by status
  const { data: statusRows, error: statusError } = await supabase
    .from('student_mastery')
    .select('status')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .in('curriculum_node_id', outcomeIds);

  if (statusError) return failure(statusError.message, ErrorCodes.INTERNAL_ERROR);

  const counts = {
    total,
    not_started: 0,
    presented: 0,
    practicing: 0,
    mastered: 0,
  };

  for (const row of statusRows ?? []) {
    const s = row.status as MasteryStatus;
    if (s in counts) (counts as Record<string, number>)[s]++;
  }

  // not_started = total outcomes minus those with any explicit status
  counts.not_started = total - (counts.presented + counts.practicing + counts.mastered);

  return success(counts);
}

// ============================================================
// READ: Portfolio timeline for a student
// ============================================================
export async function getStudentPortfolioTimeline(
  studentId: string,
  limit: number = 50
): Promise<ActionResponse<PortfolioTimelineItem[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const timeline: PortfolioTimelineItem[] = [];

  // 1) Get published observations for this student
  const { data: obsStudents, error: obsStudentsError } = await supabase
    .from('observation_students')
    .select('observation_id')
    .eq('student_id', studentId);

  if (obsStudentsError) return failure(obsStudentsError.message, ErrorCodes.INTERNAL_ERROR);

  if (obsStudents && obsStudents.length > 0) {
    const obsIds = obsStudents.map((os) => os.observation_id);

    const { data: observations, error: obsError } = await supabase
      .from('observations')
      .select(
        `
        id, content, status, published_at, created_at,
        author:users!observations_author_id_fkey(first_name, last_name)
      `
      )
      .in('id', obsIds)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (obsError) return failure(obsError.message, ErrorCodes.INTERNAL_ERROR);

    for (const obs of observations ?? []) {
      const author = obs.author as unknown as { first_name: string | null; last_name: string | null } | null;

      // outcomes for this observation
      const { data: outcomes, error: outcomesError } = await supabase
        .from('observation_outcomes')
        .select('curriculum_node_id, curriculum_nodes!inner(id, title)')
        .eq('observation_id', obs.id);

      if (outcomesError) return failure(outcomesError.message, ErrorCodes.INTERNAL_ERROR);

      // media count
      const { count: mediaCount, error: mediaError } = await supabase
        .from('observation_media')
        .select('id', { count: 'exact', head: true })
        .eq('observation_id', obs.id)
        .is('deleted_at', null);

      if (mediaError) return failure(mediaError.message, ErrorCodes.INTERNAL_ERROR);

      timeline.push({
        type: 'observation',
        date: (obs.published_at as string) ?? (obs.created_at as string),
        observation_id: obs.id as string,
        observation_content: obs.content as string | null,
        observation_author: author
          ? `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim()
          : 'Unknown',
        observation_outcomes: (outcomes ?? []).map((o) => {
          const node = (o as Record<string, unknown>).curriculum_nodes as { id: string; title: string };
          return { id: node.id, title: node.title };
        }),
        observation_media_count: mediaCount ?? 0,
      });
    }
  }

  // 2) Get mastery history for this student
  const { data: masteryChanges, error: masteryError } = await supabase
    .from('mastery_history')
    .select(
      `
      *,
      changed_by_user:users!mastery_history_changed_by_fkey(first_name, last_name),
      curriculum_node:curriculum_nodes!mastery_history_curriculum_node_id_fkey(title)
    `
    )
    .eq('student_id', studentId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (masteryError) return failure(masteryError.message, ErrorCodes.INTERNAL_ERROR);

  for (const change of masteryChanges ?? []) {
    const changedByUser = (change as Record<string, unknown>).changed_by_user as
      | { first_name: string | null; last_name: string | null }
      | null;
    const node = (change as Record<string, unknown>).curriculum_node as { title: string } | null;

    timeline.push({
      type: 'mastery_change',
      date: change.changed_at as string,
      mastery_node_title: node?.title ?? 'Unknown outcome',
      mastery_previous_status: change.previous_status as string | null,
      mastery_new_status: change.new_status as string,
      mastery_changed_by: changedByUser
        ? `${changedByUser.first_name ?? ''} ${changedByUser.last_name ?? ''}`.trim()
        : 'System',
    });
  }

  // 3) Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return success(timeline.slice(0, limit));
}
