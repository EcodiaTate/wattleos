// src/lib/actions/curriculum.ts
'use server';

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';
import type {
  CurriculumTemplate,
  CurriculumInstance,
  CurriculumNode,
  CurriculumLevel,
} from '@/types/domain';

// ============================================================
// READ: List available curriculum templates (global)
// ============================================================
export async function listCurriculumTemplates(): Promise<ActionResponse<CurriculumTemplate[]>> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('curriculum_templates')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumTemplate[]);
}

// ============================================================
// READ: List tenant's curriculum instances
// ============================================================
export async function listCurriculumInstances(): Promise<ActionResponse<CurriculumInstance[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('curriculum_instances')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumInstance[]);
}

// ============================================================
// READ: Get full node tree for a curriculum instance
// ============================================================
export async function getCurriculumTree(
  instanceId: string
): Promise<ActionResponse<CurriculumNode[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .select('*')
    .eq('instance_id', instanceId)
    .is('deleted_at', null)
    .order('sequence_order', { ascending: true });

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumNode[]);
}

// ============================================================
// FORK: Create a tenant instance from a global template
// ============================================================
export async function forkCurriculumTemplate(
  templateId: string,
  name: string,
  description?: string
): Promise<ActionResponse<CurriculumInstance>> {
  const context = await requirePermission(Permissions.MANAGE_CURRICULUM);
  const adminClient = createSupabaseAdminClient();

  // 1) Verify template exists
  const { data: template, error: templateError } = await adminClient
    .from('curriculum_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    return failure('Template not found', ErrorCodes.NOT_FOUND);
  }

  // 2) Create the instance
  const { data: instance, error: instanceError } = await adminClient
    .from('curriculum_instances')
    .insert({
      tenant_id: context.tenant.id,
      source_template_id: templateId,
      name,
      description: description ?? (template as { description?: string | null }).description ?? null,
    })
    .select()
    .single();

  if (instanceError || !instance) {
    return failure(instanceError?.message ?? 'Failed to create instance', ErrorCodes.INTERNAL_ERROR);
  }

  // 3) Fetch all template nodes
  const { data: templateNodes, error: nodesError } = await adminClient
    .from('curriculum_template_nodes')
    .select('*')
    .eq('template_id', templateId)
    .order('sequence_order', { ascending: true });

  if (nodesError || !templateNodes) {
    return failure(nodesError?.message ?? 'Failed to read template nodes', ErrorCodes.INTERNAL_ERROR);
  }

  // 4) Copy nodes (parents before children) and build an ID map
  const idMap = new Map<string, string>(); // template_node_id → new_node_id

  const levelOrder: Record<string, number> = { area: 0, strand: 1, outcome: 2, activity: 3 };
  const sortedNodes = [...templateNodes].sort(
    (a: any, b: any) => levelOrder[a.level] - levelOrder[b.level]
  );

  for (const level of ['area', 'strand', 'outcome', 'activity'] as const) {
    const nodesAtLevel = sortedNodes.filter((n: any) => n.level === level);
    if (nodesAtLevel.length === 0) continue;

    const inserts = nodesAtLevel.map((node: any) => ({
      tenant_id: context.tenant.id,
      instance_id: (instance as any).id,
      parent_id: node.parent_id ? idMap.get(node.parent_id) ?? null : null,
      source_template_node_id: node.id,
      level: node.level,
      title: node.title,
      description: node.description,
      sequence_order: node.sequence_order,
      is_hidden: false,
    }));

    const { data: insertedNodes, error: insertError } = await adminClient
      .from('curriculum_nodes')
      .insert(inserts)
      .select();

    if (insertError || !insertedNodes) {
      return failure(insertError?.message ?? `Failed to insert ${level} nodes`, ErrorCodes.INTERNAL_ERROR);
    }

    for (const inserted of insertedNodes as any[]) {
      if (inserted.source_template_node_id) {
        idMap.set(inserted.source_template_node_id, inserted.id);
      }
    }
  }

  return success(instance as CurriculumInstance);
}

// ============================================================
// CREATE: Add a custom node to a curriculum instance
// ============================================================
export async function createCurriculumNode(input: {
  instanceId: string;
  parentId: string | null;
  level: CurriculumLevel;
  title: string;
  description?: string;
}): Promise<ActionResponse<CurriculumNode>> {
  const context = await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  // Get the next sequence order for this parent
  let nextOrder = 0;

  if (input.parentId === null) {
    const { data: rootSiblings, error } = await supabase
      .from('curriculum_nodes')
      .select('sequence_order')
      .eq('instance_id', input.instanceId)
      .is('deleted_at', null)
      .is('parent_id', null)
      .order('sequence_order', { ascending: false })
      .limit(1);

    if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

    nextOrder = rootSiblings && rootSiblings.length > 0 ? (rootSiblings[0].sequence_order as number) + 1 : 0;
  } else {
    const { data: siblings, error } = await supabase
      .from('curriculum_nodes')
      .select('sequence_order')
      .eq('instance_id', input.instanceId)
      .is('deleted_at', null)
      .eq('parent_id', input.parentId)
      .order('sequence_order', { ascending: false })
      .limit(1);

    if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

    nextOrder = siblings && siblings.length > 0 ? (siblings[0].sequence_order as number) + 1 : 0;
  }

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .insert({
      tenant_id: context.tenant.id,
      instance_id: input.instanceId,
      parent_id: input.parentId,
      level: input.level,
      title: input.title,
      description: input.description ?? null,
      sequence_order: nextOrder,
      source_template_node_id: null,
      is_hidden: false,
    })
    .select()
    .single();

  if (error || !data) return failure(error?.message ?? 'Failed to create node', ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumNode);
}

// ============================================================
// UPDATE: Rename a curriculum node
// ============================================================
export async function updateCurriculumNode(
  nodeId: string,
  updates: { title?: string; description?: string }
): Promise<ActionResponse<CurriculumNode>> {
  await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .update(updates)
    .eq('id', nodeId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !data) return failure(error?.message ?? 'Node not found', ErrorCodes.NOT_FOUND);

  return success(data as CurriculumNode);
}

// ============================================================
// UPDATE: Toggle node visibility (hide/show)
// ============================================================
export async function toggleNodeVisibility(
  nodeId: string
): Promise<ActionResponse<CurriculumNode>> {
  await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const { data: current, error: currentError } = await supabase
    .from('curriculum_nodes')
    .select('is_hidden')
    .eq('id', nodeId)
    .is('deleted_at', null)
    .single();

  if (currentError) return failure(currentError.message, ErrorCodes.INTERNAL_ERROR);
  if (!current) return failure('Node not found', ErrorCodes.NOT_FOUND);

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .update({ is_hidden: !(current as any).is_hidden })
    .eq('id', nodeId)
    .select()
    .single();

  if (error || !data) return failure(error?.message ?? 'Failed to update', ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumNode);
}

// ============================================================
// UPDATE: Reorder nodes (move up/down within siblings)
// ============================================================
export async function reorderCurriculumNode(
  nodeId: string,
  direction: 'up' | 'down'
): Promise<ActionResponse<{ success: boolean }>> {
  await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const { data: node, error: nodeError } = await supabase
    .from('curriculum_nodes')
    .select('*')
    .eq('id', nodeId)
    .is('deleted_at', null)
    .single();

  if (nodeError) return failure(nodeError.message, ErrorCodes.INTERNAL_ERROR);
  if (!node) return failure('Node not found', ErrorCodes.NOT_FOUND);

  // Get siblings
  let siblingsQuery = supabase
    .from('curriculum_nodes')
    .select('id, sequence_order')
    .eq('instance_id', (node as any).instance_id)
    .is('deleted_at', null)
    .order('sequence_order', { ascending: true });

  siblingsQuery = (node as any).parent_id
    ? siblingsQuery.eq('parent_id', (node as any).parent_id)
    : siblingsQuery.is('parent_id', null);

  const { data: siblings, error: sibError } = await siblingsQuery;
  if (sibError) return failure(sibError.message, ErrorCodes.INTERNAL_ERROR);
  if (!siblings || siblings.length < 2) return success({ success: true });

  const currentIndex = siblings.findIndex((s) => s.id === nodeId);
  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (swapIndex < 0 || swapIndex >= siblings.length) return success({ success: true });

  const current = siblings[currentIndex];
  const swap = siblings[swapIndex];

  const { error: e1 } = await supabase
    .from('curriculum_nodes')
    .update({ sequence_order: swap.sequence_order })
    .eq('id', current.id);

  if (e1) return failure(e1.message, ErrorCodes.INTERNAL_ERROR);

  const { error: e2 } = await supabase
    .from('curriculum_nodes')
    .update({ sequence_order: current.sequence_order })
    .eq('id', swap.id);

  if (e2) return failure(e2.message, ErrorCodes.INTERNAL_ERROR);

  return success({ success: true });
}

// ============================================================
// DELETE: Soft-delete a curriculum node and its children
// ============================================================
export async function deleteCurriculumNode(
  nodeId: string
): Promise<ActionResponse<{ success: boolean }>> {
  await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();

  const { error } = await supabase.from('curriculum_nodes').update({ deleted_at: now }).eq('id', nodeId);
  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  // Soft-delete descendants iteratively
  let parentIds = [nodeId];
  while (parentIds.length > 0) {
    const { data: children, error: childError } = await supabase
      .from('curriculum_nodes')
      .select('id')
      .in('parent_id', parentIds)
      .is('deleted_at', null);

    if (childError) return failure(childError.message, ErrorCodes.INTERNAL_ERROR);
    if (!children || children.length === 0) break;

    const childIds = children.map((c) => c.id);

    const { error: delError } = await supabase
      .from('curriculum_nodes')
      .update({ deleted_at: now })
      .in('id', childIds);

    if (delError) return failure(delError.message, ErrorCodes.INTERNAL_ERROR);

    parentIds = childIds;
  }

  return success({ success: true });
}

// ============================================================
// SEARCH: Search nodes within an instance
// ============================================================
export async function searchCurriculumNodes(
  instanceId: string,
  query: string
): Promise<ActionResponse<CurriculumNode[]>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('curriculum_nodes')
    .select('*')
    .eq('instance_id', instanceId)
    .is('deleted_at', null)
    .ilike('title', `%${query}%`)
    .order('sequence_order', { ascending: true })
    .limit(50);

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success(data as CurriculumNode[]);
}

// ============================================================
// CREATE: Create a blank curriculum instance (from scratch)
// ============================================================
export async function createBlankCurriculumInstance(
  name: string,
  description?: string
): Promise<ActionResponse<CurriculumInstance>> {
  const context = await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('curriculum_instances')
    .insert({
      tenant_id: context.tenant.id,
      name,
      description: description ?? null,
      source_template_id: null,
    })
    .select()
    .single();

  if (error || !data) {
    return failure(error?.message ?? 'Failed to create instance', ErrorCodes.INTERNAL_ERROR);
  }

  return success(data as CurriculumInstance);
}

// ============================================================
// DELETE: Soft-delete a curriculum instance
// ============================================================
export async function deleteCurriculumInstance(
  instanceId: string
): Promise<ActionResponse<{ success: boolean }>> {
  await requirePermission(Permissions.MANAGE_CURRICULUM);
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('curriculum_instances')
    .update({ deleted_at: now })
    .eq('id', instanceId);

  if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

  return success({ success: true });
}
