"use server";

// ============================================================
// WattleOS V2 - Module 14: Curriculum Cross-Mappings
// ============================================================
// Links outcomes between curriculum frameworks (e.g., AMI →
// EYLF, ACARA → QCAA). Global mappings (tenant_id IS NULL) are
// curated by Ecodia; tenant-specific overrides allow schools to
// add their own or adjust confidence levels.
//
// WHY cross-mappings exist: A Montessori school must track
// mastery against AMI curriculum (their pedagogy) AND map
// observations to EYLF outcomes (regulatory compliance for 0–5)
// AND report against ACARA (F–10) or QCAA (11–12). Cross-
// mappings automate this so guides tag once (AMI) and the system
// resolves all linked compliance outcomes.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

export type CrossMappingType =
  | "aligned"
  | "partially_aligned"
  | "prerequisite"
  | "extends";
export type CrossMappingConfidence = "verified" | "suggested" | "community";

export interface CurriculumCrossMapping {
  id: string;
  tenant_id: string | null;
  source_template_id: string;
  source_node_id: string;
  target_template_id: string;
  target_node_id: string;
  mapping_type: CrossMappingType;
  confidence: CrossMappingConfidence;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** Cross-mapping with resolved node titles and template names for display */
export interface CrossMappingWithDetails extends CurriculumCrossMapping {
  source_node: {
    id: string;
    title: string;
    code: string | null;
    level: string;
  };
  source_template: {
    id: string;
    name: string;
    framework: string | null;
  };
  target_node: {
    id: string;
    title: string;
    code: string | null;
    level: string;
  };
  target_template: {
    id: string;
    name: string;
    framework: string | null;
  };
}

/** Lightweight linked outcome - returned for auto-tagging observations */
export interface LinkedOutcome {
  node_id: string;
  node_title: string;
  node_code: string | null;
  template_id: string;
  template_name: string;
  framework: string | null;
  mapping_type: CrossMappingType;
  confidence: CrossMappingConfidence;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateCrossMappingInput {
  source_template_id: string;
  source_node_id: string;
  target_template_id: string;
  target_node_id: string;
  mapping_type: CrossMappingType;
  confidence?: CrossMappingConfidence;
  notes?: string | null;
  /** If true, creates a global mapping (requires manage_curriculum_templates). Otherwise tenant-scoped. */
  is_global?: boolean;
}

export interface UpdateCrossMappingInput {
  mapping_type?: CrossMappingType;
  confidence?: CrossMappingConfidence;
  notes?: string | null;
}

export interface ListCrossMappingsFilter {
  /** Filter by source or target node ID */
  node_id?: string;
  /** Filter by source template */
  source_template_id?: string;
  /** Filter by target template */
  target_template_id?: string;
  /** Filter by mapping type */
  mapping_type?: CrossMappingType;
  /** Filter by confidence level */
  confidence?: CrossMappingConfidence;
  /** Include global mappings (default: true) */
  include_global?: boolean;
  /** Include tenant-specific overrides (default: true) */
  include_tenant?: boolean;
}

// ============================================================
// Permission keys (must match the seeded permissions)
// ============================================================

const PERM_MANAGE_CROSS_MAPPINGS = "manage_cross_mappings";
const PERM_MANAGE_CURRICULUM_TEMPLATES = "manage_curriculum_templates";

// ============================================================
// CREATE: Add a cross-mapping between two curriculum nodes
// ============================================================
// WHY tenant-scoped by default: Schools may discover additional
// alignments between their AMI outcomes and EYLF. Global
// mappings are curated centrally by Ecodia.
// ============================================================

export async function createCrossMapping(
  input: CreateCrossMappingInput,
): Promise<ActionResponse<CurriculumCrossMapping>> {
  try {
    const isGlobal = input.is_global === true;

    // Global mappings need system-level permission
    const permKey = isGlobal
      ? PERM_MANAGE_CURRICULUM_TEMPLATES
      : PERM_MANAGE_CROSS_MAPPINGS;
    const context = await requirePermission(permKey);

    const supabase = await createSupabaseServerClient();

    // Validate source and target nodes exist
    const adminClient = createSupabaseAdminClient();

    const [sourceNode, targetNode] = await Promise.all([
      adminClient
        .from("curriculum_nodes")
        .select("id")
        .eq("id", input.source_node_id)
        .single(),
      adminClient
        .from("curriculum_nodes")
        .select("id")
        .eq("id", input.target_node_id)
        .single(),
    ]);

    if (sourceNode.error || !sourceNode.data) {
      return failure("Source curriculum node not found", ErrorCodes.NOT_FOUND);
    }
    if (targetNode.error || !targetNode.data) {
      return failure("Target curriculum node not found", ErrorCodes.NOT_FOUND);
    }

    // Prevent self-mapping
    if (input.source_node_id === input.target_node_id) {
      return failure(
        "Cannot map a node to itself",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const insertData = {
      tenant_id: isGlobal ? null : context.tenant.id,
      source_template_id: input.source_template_id,
      source_node_id: input.source_node_id,
      target_template_id: input.target_template_id,
      target_node_id: input.target_node_id,
      mapping_type: input.mapping_type,
      confidence: input.confidence ?? "verified",
      notes: input.notes ?? null,
      created_by: context.user.id,
    };

    // Use admin client for global mappings (no tenant_id in RLS)
    const client = isGlobal ? adminClient : supabase;

    const { data, error } = await client
      .from("curriculum_cross_mappings")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "A mapping between these two nodes already exists",
          ErrorCodes.CONFLICT,
        );
      }
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    return success(data as CurriculumCrossMapping);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create cross-mapping";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// UPDATE: Modify mapping type, confidence, or notes
// ============================================================

export async function updateCrossMapping(
  mappingId: string,
  input: UpdateCrossMappingInput,
): Promise<ActionResponse<CurriculumCrossMapping>> {
  try {
    await requirePermission(PERM_MANAGE_CROSS_MAPPINGS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.mapping_type !== undefined)
      updateData.mapping_type = input.mapping_type;
    if (input.confidence !== undefined)
      updateData.confidence = input.confidence;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    // Try tenant-scoped first
    const { data, error } = await supabase
      .from("curriculum_cross_mappings")
      .update(updateData)
      .eq("id", mappingId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    if (!data) {
      return failure(
        "Cross-mapping not found or not editable",
        ErrorCodes.NOT_FOUND,
      );
    }

    return success(data as CurriculumCrossMapping);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update cross-mapping";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// DELETE: Remove a cross-mapping
// ============================================================
// WHY hard delete (not soft): Cross-mappings are metadata links,
// not user content. Removing one just unlinks two outcomes. The
// UNIQUE constraint means we can re-create later if needed.
// ============================================================

export async function deleteCrossMapping(
  mappingId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(PERM_MANAGE_CROSS_MAPPINGS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("curriculum_cross_mappings")
      .delete()
      .eq("id", mappingId);

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete cross-mapping";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// DELETE (Global): Remove a global cross-mapping
// ============================================================
// WHY separate function: Global mappings have tenant_id IS NULL,
// so tenant-scoped RLS won't match. Requires system permission.
// ============================================================

export async function deleteGlobalCrossMapping(
  mappingId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(PERM_MANAGE_CURRICULUM_TEMPLATES);
    const adminClient = createSupabaseAdminClient();

    const { error } = await adminClient
      .from("curriculum_cross_mappings")
      .delete()
      .eq("id", mappingId)
      .is("tenant_id", null);

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to delete global cross-mapping";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// LIST: Get all cross-mappings for a specific node (both
// directions - where this node is source OR target)
// ============================================================
// WHY bidirectional: If AMI "Pouring" → EYLF 3.2, viewing the
// EYLF 3.2 node should also show the link back to AMI "Pouring".
// ============================================================

export async function listCrossMappingsForNode(
  nodeId: string,
): Promise<ActionResponse<CrossMappingWithDetails[]>> {
  try {
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    // We use admin client because cross-mappings may be global (NULL tenant_id)
    // and we need to join across template tables that are also global.
    // RLS on curriculum_cross_mappings already allows SELECT on global rows.

    // Fetch mappings where this node is the source
    const { data: asSource, error: sourceError } = await adminClient
      .from("curriculum_cross_mappings")
      .select(
        `
        *,
        source_node:curriculum_nodes!curriculum_cross_mappings_source_node_id_fkey(id, title, code, level),
        source_template:curriculum_templates!curriculum_cross_mappings_source_template_id_fkey(id, name, framework),
        target_node:curriculum_nodes!curriculum_cross_mappings_target_node_id_fkey(id, title, code, level),
        target_template:curriculum_templates!curriculum_cross_mappings_target_template_id_fkey(id, name, framework)
      `,
      )
      .eq("source_node_id", nodeId);

    if (sourceError) {
      return failure(sourceError.message, ErrorCodes.INTERNAL_ERROR);
    }

    // Fetch mappings where this node is the target
    const { data: asTarget, error: targetError } = await adminClient
      .from("curriculum_cross_mappings")
      .select(
        `
        *,
        source_node:curriculum_nodes!curriculum_cross_mappings_source_node_id_fkey(id, title, code, level),
        source_template:curriculum_templates!curriculum_cross_mappings_source_template_id_fkey(id, name, framework),
        target_node:curriculum_nodes!curriculum_cross_mappings_target_node_id_fkey(id, title, code, level),
        target_template:curriculum_templates!curriculum_cross_mappings_target_template_id_fkey(id, name, framework)
      `,
      )
      .eq("target_node_id", nodeId);

    if (targetError) {
      return failure(targetError.message, ErrorCodes.INTERNAL_ERROR);
    }

    // Deduplicate by ID (a node could theoretically appear in both)
    const allMappings = [...(asSource ?? []), ...(asTarget ?? [])];
    const seen = new Set<string>();
    const deduplicated: CrossMappingWithDetails[] = [];

    for (const mapping of allMappings) {
      const row = mapping as Record<string, unknown>;
      const id = row.id as string;
      if (!seen.has(id)) {
        seen.add(id);
        deduplicated.push(normalizeMappingRow(row));
      }
    }

    return success(deduplicated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list cross-mappings";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// LIST: Get all cross-mappings between two templates
// ============================================================
// WHY: The cross-mapping viewer UI needs to show all links
// between, say, "AMI Primary 3–6" and "EYLF v2" in a matrix.
// ============================================================

export async function listCrossMappingsBetweenTemplates(
  templateIdA: string,
  templateIdB: string,
): Promise<ActionResponse<CrossMappingWithDetails[]>> {
  try {
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    // Get mappings in both directions between the two templates
    const { data, error } = await adminClient
      .from("curriculum_cross_mappings")
      .select(
        `
        *,
        source_node:curriculum_nodes!curriculum_cross_mappings_source_node_id_fkey(id, title, code, level),
        source_template:curriculum_templates!curriculum_cross_mappings_source_template_id_fkey(id, name, framework),
        target_node:curriculum_nodes!curriculum_cross_mappings_target_node_id_fkey(id, title, code, level),
        target_template:curriculum_templates!curriculum_cross_mappings_target_template_id_fkey(id, name, framework)
      `,
      )
      .or(
        `and(source_template_id.eq.${templateIdA},target_template_id.eq.${templateIdB}),` +
          `and(source_template_id.eq.${templateIdB},target_template_id.eq.${templateIdA})`,
      )
      .order("created_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    const mappings = (data ?? []).map((row) =>
      normalizeMappingRow(row as Record<string, unknown>),
    );

    return success(mappings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list cross-mappings";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// LIST (Filtered): General-purpose cross-mapping query
// ============================================================

export async function listCrossMappings(
  filter: ListCrossMappingsFilter = {},
): Promise<ActionResponse<CrossMappingWithDetails[]>> {
  try {
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    let query = adminClient.from("curriculum_cross_mappings").select(`
        *,
        source_node:curriculum_nodes!curriculum_cross_mappings_source_node_id_fkey(id, title, code, level),
        source_template:curriculum_templates!curriculum_cross_mappings_source_template_id_fkey(id, name, framework),
        target_node:curriculum_nodes!curriculum_cross_mappings_target_node_id_fkey(id, title, code, level),
        target_template:curriculum_templates!curriculum_cross_mappings_target_template_id_fkey(id, name, framework)
      `);

    if (filter.node_id) {
      query = query.or(
        `source_node_id.eq.${filter.node_id},target_node_id.eq.${filter.node_id}`,
      );
    }
    if (filter.source_template_id) {
      query = query.eq("source_template_id", filter.source_template_id);
    }
    if (filter.target_template_id) {
      query = query.eq("target_template_id", filter.target_template_id);
    }
    if (filter.mapping_type) {
      query = query.eq("mapping_type", filter.mapping_type);
    }
    if (filter.confidence) {
      query = query.eq("confidence", filter.confidence);
    }

    // Scope: global vs tenant
    if (filter.include_global === false && filter.include_tenant === false) {
      return success([]);
    }
    if (filter.include_global === false) {
      query = query.not("tenant_id", "is", null);
    }
    if (filter.include_tenant === false) {
      query = query.is("tenant_id", null);
    }

    const { data, error } = await query.order("created_at", {
      ascending: true,
    });

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    const mappings = (data ?? []).map((row) =>
      normalizeMappingRow(row as Record<string, unknown>),
    );

    return success(mappings);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list cross-mappings";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// RESOLVE: Get all linked compliance outcomes for a set of
// curriculum node IDs
// ============================================================
// WHY: This is the core compliance auto-tagging function. When
// a guide tags an observation with AMI outcomes, the system
// calls this to find all linked EYLF/ACARA/QCAA outcomes.
// The observation can then be automatically cross-tagged for
// compliance reporting.
//
// Returns outcomes grouped by framework for easy consumption.
// ============================================================

export interface LinkedOutcomesResult {
  /** All linked outcomes across all frameworks */
  outcomes: LinkedOutcome[];
  /** Outcomes grouped by framework name */
  by_framework: Record<string, LinkedOutcome[]>;
}

export async function resolveLinkedOutcomes(
  nodeIds: string[],
): Promise<ActionResponse<LinkedOutcomesResult>> {
  try {
    await getTenantContext();

    if (nodeIds.length === 0) {
      return success({ outcomes: [], by_framework: {} });
    }

    const adminClient = createSupabaseAdminClient();

    // Find all cross-mappings where any of these nodes is the source
    const { data: forwardMappings, error: fwdError } = await adminClient
      .from("curriculum_cross_mappings")
      .select(
        `
        target_node_id,
        target_template_id,
        mapping_type,
        confidence,
        target_node:curriculum_nodes!curriculum_cross_mappings_target_node_id_fkey(id, title, code),
        target_template:curriculum_templates!curriculum_cross_mappings_target_template_id_fkey(id, name, framework)
      `,
      )
      .in("source_node_id", nodeIds);

    if (fwdError) {
      return failure(fwdError.message, ErrorCodes.INTERNAL_ERROR);
    }

    // Also find reverse mappings (where these nodes are the target)
    const { data: reverseMappings, error: revError } = await adminClient
      .from("curriculum_cross_mappings")
      .select(
        `
        source_node_id,
        source_template_id,
        mapping_type,
        confidence,
        source_node:curriculum_nodes!curriculum_cross_mappings_source_node_id_fkey(id, title, code),
        source_template:curriculum_templates!curriculum_cross_mappings_source_template_id_fkey(id, name, framework)
      `,
      )
      .in("target_node_id", nodeIds);

    if (revError) {
      return failure(revError.message, ErrorCodes.INTERNAL_ERROR);
    }

    const outcomes: LinkedOutcome[] = [];
    const seen = new Set<string>();

    // Process forward mappings (source → target)
    for (const row of forwardMappings ?? []) {
      const r = row as Record<string, unknown>;
      const targetNode = unwrapJoin(r.target_node);
      const targetTemplate = unwrapJoin(r.target_template);
      if (!targetNode || !targetTemplate) continue;

      const nodeId = targetNode.id as string;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      outcomes.push({
        node_id: nodeId,
        node_title: targetNode.title as string,
        node_code: (targetNode.code as string) ?? null,
        template_id: targetTemplate.id as string,
        template_name: targetTemplate.name as string,
        framework: (targetTemplate.framework as string) ?? null,
        mapping_type: r.mapping_type as CrossMappingType,
        confidence: r.confidence as CrossMappingConfidence,
      });
    }

    // Process reverse mappings (target → source)
    for (const row of reverseMappings ?? []) {
      const r = row as Record<string, unknown>;
      const sourceNode = unwrapJoin(r.source_node);
      const sourceTemplate = unwrapJoin(r.source_template);
      if (!sourceNode || !sourceTemplate) continue;

      const nodeId = sourceNode.id as string;
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);

      outcomes.push({
        node_id: nodeId,
        node_title: sourceNode.title as string,
        node_code: (sourceNode.code as string) ?? null,
        template_id: sourceTemplate.id as string,
        template_name: sourceTemplate.name as string,
        framework: (sourceTemplate.framework as string) ?? null,
        mapping_type: r.mapping_type as CrossMappingType,
        confidence: r.confidence as CrossMappingConfidence,
      });
    }

    // Group by framework
    const byFramework: Record<string, LinkedOutcome[]> = {};
    for (const outcome of outcomes) {
      const key = outcome.framework ?? "Unknown";
      if (!byFramework[key]) {
        byFramework[key] = [];
      }
      byFramework[key].push(outcome);
    }

    return success({ outcomes, by_framework: byFramework });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to resolve linked outcomes";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// BULK CREATE: Import multiple cross-mappings at once
// ============================================================
// WHY: When importing a JSON template with embedded cross_mappings,
// we need to create many mappings in one operation. Also used by
// the admin cross-mapping bulk editor.
// ============================================================

export interface BulkCrossMappingInput {
  source_node_id: string;
  target_node_id: string;
  source_template_id: string;
  target_template_id: string;
  mapping_type: CrossMappingType;
  confidence?: CrossMappingConfidence;
  notes?: string | null;
}

export interface BulkCreateResult {
  created: number;
  skipped: number;
  errors: string[];
}

export async function bulkCreateCrossMappings(
  mappings: BulkCrossMappingInput[],
  isGlobal: boolean = false,
): Promise<ActionResponse<BulkCreateResult>> {
  try {
    const permKey = isGlobal
      ? PERM_MANAGE_CURRICULUM_TEMPLATES
      : PERM_MANAGE_CROSS_MAPPINGS;
    const context = await requirePermission(permKey);

    if (mappings.length === 0) {
      return success({ created: 0, skipped: 0, errors: [] });
    }

    if (mappings.length > 500) {
      return failure(
        "Maximum 500 mappings per batch",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const client = isGlobal
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();

    const rows = mappings.map((m) => ({
      tenant_id: isGlobal ? null : context.tenant.id,
      source_template_id: m.source_template_id,
      source_node_id: m.source_node_id,
      target_template_id: m.target_template_id,
      target_node_id: m.target_node_id,
      mapping_type: m.mapping_type,
      confidence: m.confidence ?? "verified",
      notes: m.notes ?? null,
      created_by: context.user.id,
    }));

    // Use upsert with onConflict to skip duplicates
    const { data, error } = await client
      .from("curriculum_cross_mappings")
      .upsert(rows, {
        onConflict: "source_node_id,target_node_id",
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    const created = (data ?? []).length;
    const skipped = mappings.length - created;

    return success({ created, skipped, errors: [] });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to bulk create cross-mappings";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// Private Helpers
// ============================================================

/** Supabase returns joins as objects or arrays. Normalize to single object. */
function unwrapJoin(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value))
    return (value[0] as Record<string, unknown>) ?? null;
  return value as Record<string, unknown>;
}

/** Normalize a raw Supabase row with joined relations into CrossMappingWithDetails */
function normalizeMappingRow(
  row: Record<string, unknown>,
): CrossMappingWithDetails {
  const sourceNode = unwrapJoin(row.source_node);
  const sourceTemplate = unwrapJoin(row.source_template);
  const targetNode = unwrapJoin(row.target_node);
  const targetTemplate = unwrapJoin(row.target_template);

  return {
    id: row.id as string,
    tenant_id: (row.tenant_id as string) ?? null,
    source_template_id: row.source_template_id as string,
    source_node_id: row.source_node_id as string,
    target_template_id: row.target_template_id as string,
    target_node_id: row.target_node_id as string,
    mapping_type: row.mapping_type as CrossMappingType,
    confidence: row.confidence as CrossMappingConfidence,
    notes: (row.notes as string) ?? null,
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    source_node: {
      id: (sourceNode?.id as string) ?? "",
      title: (sourceNode?.title as string) ?? "",
      code: (sourceNode?.code as string) ?? null,
      level: (sourceNode?.level as string) ?? "",
    },
    source_template: {
      id: (sourceTemplate?.id as string) ?? "",
      name: (sourceTemplate?.name as string) ?? "",
      framework: (sourceTemplate?.framework as string) ?? null,
    },
    target_node: {
      id: (targetNode?.id as string) ?? "",
      title: (targetNode?.title as string) ?? "",
      code: (targetNode?.code as string) ?? null,
      level: (targetNode?.level as string) ?? "",
    },
    target_template: {
      id: (targetTemplate?.id as string) ?? "",
      name: (targetTemplate?.name as string) ?? "",
      framework: (targetTemplate?.framework as string) ?? null,
    },
  };
}
