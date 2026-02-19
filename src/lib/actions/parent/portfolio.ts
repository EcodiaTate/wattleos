// src/lib/actions/parent/portfolio.ts
//
// ============================================================
// WattleOS V2 — Parent Portal: Portfolio Actions
// ============================================================
// Fetches published observations and mastery progression for
// a parent's child. Only published observations are visible
// to parents (enforced by both application logic and RLS).
//
// WHY separate from staff observations: Parents see a curated
// view — no drafts, no archived items, no editing capabilities.
// The portfolio is a read-only celebration of learning.
// ============================================================

'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { isGuardianOf } from './children';
import type { ActionResponse } from '@/types/api';

// ============================================================
// Types
// ============================================================

export interface ChildObservation {
  id: string;
  content: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  outcomes: Array<{
    nodeId: string;
    title: string;
    level: string;
  }>;
  media: Array<{
    id: string;
    mediaType: string;
    storageUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
  }>;
}

export interface ChildMasteryRecord {
  nodeId: string;
  nodeTitle: string;
  nodeLevel: string;
  areaName: string | null;
  status: string;
  updatedAt: string;
}

export interface ChildMasterySummary {
  instanceId: string;
  instanceName: string;
  total: number;
  notStarted: number;
  presented: number;
  practicing: number;
  mastered: number;
  percentMastered: number;
}

// ============================================================
// getChildObservations — published observations for a child
// ============================================================

export async function getChildObservations(
  studentId: string,
  params?: { page?: number; perPage?: number }
): Promise<ActionResponse<ChildObservation[]> & { pagination?: { page: number; total: number; totalPages: number } }> {
  try {
    const context = await getTenantContext();

    // Verify guardian relationship
    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return { data: null, error: { message: 'Not authorized', code: 'FORBIDDEN' } };
    }

    const supabase = await createSupabaseServerClient();
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 20;
    const offset = (page - 1) * perPage;

    // Get observation IDs for this student
    const { data: links } = await supabase
      .from('observation_students')
      .select('observation_id')
      .eq('tenant_id', context.tenant.id)
      .eq('student_id', studentId);

    const obsIds = (links ?? []).map((l) => l.observation_id);
    if (obsIds.length === 0) {
      return {
        data: [],
        error: null,
        pagination: { page, total: 0, totalPages: 0 },
      };
    }

    // Count total published
    const { count: total } = await supabase
      .from('observations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenant.id)
      .eq('status', 'published')
      .in('id', obsIds)
      .is('deleted_at', null);

    // Fetch paginated observations
    const { data: observations, error } = await supabase
      .from('observations')
      .select(
        `
        id,
        content,
        published_at,
        created_at,
        author:users!observations_author_id_fkey(first_name, last_name)
      `
      )
      .eq('tenant_id', context.tenant.id)
      .eq('status', 'published')
      .in('id', obsIds)
      .is('deleted_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      return { data: null, error: { message: error.message, code: 'QUERY_ERROR' } };
    }

    const foundIds = (observations ?? []).map((o) => o.id);

    // Fetch outcomes for these observations
    const { data: outcomeLinks } = foundIds.length > 0
      ? await supabase
          .from('observation_outcomes')
          .select(
            `
            observation_id,
            node:curriculum_nodes(id, title, level)
          `
          )
          .eq('tenant_id', context.tenant.id)
          .in('observation_id', foundIds)
      : { data: [] };

    const outcomesMap = new Map<string, ChildObservation['outcomes']>();
    for (const link of outcomeLinks ?? []) {
      const node = link.node as unknown as { id: string; title: string; level: string } | null;
      if (!node) continue;
      const existing = outcomesMap.get(link.observation_id) ?? [];
      existing.push({ nodeId: node.id, title: node.title, level: node.level });
      outcomesMap.set(link.observation_id, existing);
    }

    // Fetch media for these observations
    const { data: mediaRecords } = foundIds.length > 0
      ? await supabase
          .from('observation_media')
          .select('id, observation_id, media_type, storage_url, thumbnail_url, caption')
          .in('observation_id', foundIds)
          .is('deleted_at', null)
      : { data: [] };

    const mediaMap = new Map<string, ChildObservation['media']>();
    for (const m of mediaRecords ?? []) {
      const existing = mediaMap.get(m.observation_id) ?? [];
      existing.push({
        id: m.id,
        mediaType: m.media_type,
        storageUrl: m.storage_url,
        thumbnailUrl: m.thumbnail_url,
        caption: m.caption,
      });
      mediaMap.set(m.observation_id, existing);
    }

    // Assemble
    const result: ChildObservation[] = (observations ?? []).map((o) => {
      const author = o.author as unknown as { first_name: string | null; last_name: string | null } | null;
      return {
        id: o.id,
        content: o.content,
        authorName: [author?.first_name, author?.last_name].filter(Boolean).join(' ') || 'Guide',
        publishedAt: o.published_at,
        createdAt: o.created_at,
        outcomes: outcomesMap.get(o.id) ?? [],
        media: mediaMap.get(o.id) ?? [],
      };
    });

    const totalCount = total ?? 0;

    return {
      data: result,
      error: null,
      pagination: {
        page,
        total: totalCount,
        totalPages: Math.ceil(totalCount / perPage),
      },
    };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}

// ============================================================
// getChildMastery — mastery records grouped by curriculum instance
// ============================================================

export async function getChildMastery(
  studentId: string
): Promise<ActionResponse<ChildMasterySummary[]>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return { data: null, error: { message: 'Not authorized', code: 'FORBIDDEN' } };
    }

    const supabase = await createSupabaseServerClient();

    // Get all mastery records with node info
    const { data: masteryRecords, error } = await supabase
      .from('student_mastery')
      .select(
        `
        status,
        node:curriculum_nodes!inner(
          id,
          title,
          level,
          instance_id
        )
      `
      )
      .eq('tenant_id', context.tenant.id)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (error) {
      return { data: null, error: { message: error.message, code: 'QUERY_ERROR' } };
    }

    // Get curriculum instance names
    const { data: instances } = await supabase
      .from('curriculum_instances')
      .select('id, name')
      .eq('tenant_id', context.tenant.id)
      .is('deleted_at', null);

    const instanceNameMap = new Map<string, string>();
    for (const inst of instances ?? []) {
      instanceNameMap.set(inst.id, inst.name);
    }

    // Group by instance
    const instanceMap = new Map<
      string,
      { total: number; notStarted: number; presented: number; practicing: number; mastered: number }
    >();

    for (const record of masteryRecords ?? []) {
      const node = record.node as unknown as { id: string; instance_id: string };
      const instanceId = node.instance_id;

      if (!instanceMap.has(instanceId)) {
        instanceMap.set(instanceId, {
          total: 0,
          notStarted: 0,
          presented: 0,
          practicing: 0,
          mastered: 0,
        });
      }

      const stats = instanceMap.get(instanceId)!;
      stats.total++;
      switch (record.status) {
        case 'not_started':
          stats.notStarted++;
          break;
        case 'presented':
          stats.presented++;
          break;
        case 'practicing':
          stats.practicing++;
          break;
        case 'mastered':
          stats.mastered++;
          break;
      }
    }

    const summaries: ChildMasterySummary[] = Array.from(instanceMap.entries()).map(
      ([instanceId, stats]) => ({
        instanceId,
        instanceName: instanceNameMap.get(instanceId) ?? 'Unknown Curriculum',
        ...stats,
        percentMastered: stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0,
      })
    );

    return { data: summaries, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}

// ============================================================
// getChildMasteryDetails — full mastery list for a curriculum
// ============================================================

export async function getChildMasteryDetails(
  studentId: string,
  instanceId: string
): Promise<ActionResponse<ChildMasteryRecord[]>> {
  try {
    const context = await getTenantContext();

    const isGuardian = await isGuardianOf(studentId);
    if (!isGuardian) {
      return { data: null, error: { message: 'Not authorized', code: 'FORBIDDEN' } };
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('student_mastery')
      .select(
        `
        status,
        updated_at,
        node:curriculum_nodes!inner(
          id,
          title,
          level,
          instance_id,
          parent:curriculum_nodes(title)
        )
      `
      )
      .eq('tenant_id', context.tenant.id)
      .eq('student_id', studentId)
      .is('deleted_at', null);

    if (error) {
      return { data: null, error: { message: error.message, code: 'QUERY_ERROR' } };
    }

    // Filter to the requested instance and map
    const records: ChildMasteryRecord[] = (data ?? [])
      .filter((r) => {
        const node = r.node as unknown as { instance_id: string };
        return node.instance_id === instanceId;
      })
      .map((r) => {
        const node = r.node as unknown as {
          id: string;
          title: string;
          level: string;
          parent: { title: string } | null;
        };
        return {
          nodeId: node.id,
          nodeTitle: node.title,
          nodeLevel: node.level,
          areaName: node.parent?.title ?? null,
          status: r.status,
          updatedAt: r.updated_at,
        };
      });

    return { data: records, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}