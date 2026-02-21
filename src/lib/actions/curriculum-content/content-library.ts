'use server';

"use server";

// ============================================================
// WattleOS V2 - Module 14: Curriculum Content Library
// ============================================================
// Enhanced queries for the curriculum content library. Extends
// Module 2's basic CRUD with framework-aware filtering, material
// search, compliance reporting, and JSON template import.
//
// WHY this file is separate from curriculum.ts: Module 2 handles
// the core engine (instances, nodes, forking). Module 14 adds
// the content layer - richer metadata, cross-framework queries,
// and compliance reporting that didn't exist in the original
// curriculum engine design.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";
import type { CurriculumNode, CurriculumTemplate } from "@/types/domain";

// ============================================================
// Types
// ============================================================

export interface EnhancedCurriculumTemplate extends CurriculumTemplate {
  country: string | null;
  state: string | null;
  is_compliance_framework: boolean;
}

/** Extended node with the new Module 14 columns */
export interface EnhancedCurriculumNode extends CurriculumNode {
  code: string | null;
  materials: string[] | null;
  direct_aims: string[] | null;
  indirect_aims: string[] | null;
  age_range: string | null;
  prerequisites: string[] | null;
  assessment_criteria: string | null;
  content_url: string | null;
}

/** Filter options for template listing */
export interface TemplateFilter {
  framework?: string;
  age_range?: string;
  country?: string;
  state?: string;
  is_compliance_framework?: boolean;
  search?: string;
}

/** Material search result - a node with its template context */
export interface MaterialSearchResult {
  node_id: string;
  node_title: string;
  node_code: string | null;
  node_level: string;
  materials: string[];
  template_id: string;
  template_name: string;
  framework: string | null;
  instance_id: string | null;
  instance_name: string | null;
}

/** Compliance evidence item - an observation or mastery record tagged with a compliance outcome */
export interface ComplianceEvidence {
  type: "observation" | "mastery";
  id: string;
  /** For observations: content snippet. For mastery: status. */
  summary: string;
  student_name: string;
  student_id: string;
  date: string;
  /** The AMI (or other pedagogical) outcome that was directly tagged */
  source_outcome: {
    id: string;
    title: string;
    code: string | null;
  } | null;
}

/** Compliance report for a single compliance framework outcome */
export interface ComplianceReportItem {
  outcome_id: string;
  outcome_title: string;
  outcome_code: string | null;
  evidence_count: number;
  evidence: ComplianceEvidence[];
}

/** Full compliance report for a framework */
export interface ComplianceReport {
  framework: string;
  template_id: string;
  template_name: string;
  generated_at: string;
  outcomes: ComplianceReportItem[];
  total_evidence: number;
  outcomes_with_evidence: number;
  outcomes_without_evidence: number;
}

/** JSON template import format - matches the spec in MODULES_10_14_DESIGN.md */
export interface JsonTemplateNode {
  level: string;
  title: string;
  code?: string;
  description?: string;
  materials?: string[];
  direct_aims?: string[];
  indirect_aims?: string[];
  age_range?: string;
  assessment_criteria?: string;
  content_url?: string;
  cross_mappings?: Array<{
    framework: string;
    code: string;
    type: string;
  }>;
  children?: JsonTemplateNode[];
}

export interface JsonTemplateImport {
  slug: string;
  name: string;
  framework: string;
  age_range: string;
  country?: string;
  state?: string;
  version: string;
  is_compliance_framework?: boolean;
  nodes: JsonTemplateNode[];
}

// ============================================================
// Permission keys
// ============================================================

const PERM_VIEW_COMPLIANCE = "view_compliance_reports";
const PERM_MANAGE_TEMPLATES = "manage_curriculum_templates";

// ============================================================
// LIST: Get templates with Module 14 enhanced filtering
// ============================================================
// WHY: The original listCurriculumTemplates() returns all active
// templates with no filtering. With 20+ templates across AMI,
// AMS, EYLF, ACARA, QCAA, schools need to filter by what's
// relevant to their age range and compliance needs.
// ============================================================

export async function listTemplatesFiltered(
  filter: TemplateFilter = {},
): Promise<ActionResponse<EnhancedCurriculumTemplate[]>> {
  try {
    // Templates are global - any authenticated user can read them
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    let query = adminClient
      .from("curriculum_templates")
      .select("*")
      .eq("is_active", true);

    if (filter.framework) {
      query = query.eq("framework", filter.framework);
    }
    if (filter.age_range) {
      query = query.eq("age_range", filter.age_range);
    }
    if (filter.country) {
      query = query.eq("country", filter.country);
    }
    if (filter.state) {
      query = query.eq("state", filter.state);
    }
    if (filter.is_compliance_framework !== undefined) {
      query = query.eq(
        "is_compliance_framework",
        filter.is_compliance_framework,
      );
    }
    if (filter.search) {
      query = query.ilike("name", `%${filter.search}%`);
    }

    const { data, error } = await query.order("framework").order("name");

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    return success((data ?? []) as EnhancedCurriculumTemplate[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list templates";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// LIST: Get distinct frameworks available in templates
// ============================================================
// WHY: Populates the framework filter dropdown in the UI
// without hardcoding framework names.
// ============================================================

export async function listAvailableFrameworks(): Promise<
  ActionResponse<string[]>
> {
  try {
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("curriculum_templates")
      .select("framework")
      .eq("is_active", true)
      .not("framework", "is", null);

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    const frameworks = [
      ...new Set(
        ((data ?? []) as Array<{ framework: string | null }>)
          .map((r) => r.framework)
          .filter((f): f is string => f !== null),
      ),
    ].sort();

    return success(frameworks);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list frameworks";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// LIST: Get distinct age ranges available in templates
// ============================================================

export async function listAvailableAgeRanges(): Promise<
  ActionResponse<string[]>
> {
  try {
    await getTenantContext();
    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient
      .from("curriculum_templates")
      .select("age_range")
      .eq("is_active", true)
      .not("age_range", "is", null);

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    const ageRanges = [
      ...new Set(
        ((data ?? []) as Array<{ age_range: string | null }>)
          .map((r) => r.age_range)
          .filter((a): a is string => a !== null),
      ),
    ];

    // Sort age ranges sensibly: 0-3, 3-6, 6-9, etc.
    ageRanges.sort((a, b) => {
      const aStart = parseFloat(a.split("-")[0] ?? "0");
      const bStart = parseFloat(b.split("-")[0] ?? "0");
      return aStart - bStart;
    });

    return success(ageRanges);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list age ranges";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// SEARCH: Find curriculum nodes by material name
// ============================================================
// WHY: "Which outcomes use the Pink Tower?" is a common query
// from Montessori guides when planning lessons. The materials
// array on curriculum_nodes makes this searchable.
// ============================================================

export async function searchNodesByMaterial(
  materialQuery: string,
  options?: {
    instance_id?: string;
    template_id?: string;
    limit?: number;
  },
): Promise<ActionResponse<MaterialSearchResult[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const limit = options?.limit ?? 50;
    const results: MaterialSearchResult[] = [];

    // Search tenant's curriculum instances (nodes they've forked)
    if (options?.instance_id || !options?.template_id) {
      let instanceQuery = supabase
        .from("curriculum_nodes")
        .select(
          `
          id, title, code, level, materials, instance_id,
          instance:curriculum_instances!curriculum_nodes_instance_id_fkey(id, name, source_template_id)
        `,
        )
        .is("deleted_at", null)
        .not("materials", "is", null)
        .contains("materials", [materialQuery])
        .limit(limit);

      if (options?.instance_id) {
        instanceQuery = instanceQuery.eq("instance_id", options.instance_id);
      }

      const { data: instanceNodes, error: instanceError } = await instanceQuery;

      if (instanceError) {
        return failure(instanceError.message, ErrorCodes.INTERNAL_ERROR);
      }

      for (const row of instanceNodes ?? []) {
        const r = row as Record<string, unknown>;
        const instance = unwrapJoin(r.instance);

        results.push({
          node_id: r.id as string,
          node_title: r.title as string,
          node_code: (r.code as string) ?? null,
          node_level: r.level as string,
          materials: (r.materials as string[]) ?? [],
          template_id: (instance?.source_template_id as string) ?? "",
          template_name: "",
          framework: null,
          instance_id: (instance?.id as string) ?? null,
          instance_name: (instance?.name as string) ?? null,
        });
      }
    }

    // Also search global template nodes if no specific instance
    if (options?.template_id || !options?.instance_id) {
      let templateQuery = adminClient
        .from("curriculum_template_nodes")
        .select(
          `
          id, title, code, level, materials, template_id,
          template:curriculum_templates!curriculum_template_nodes_template_id_fkey(id, name, framework)
        `,
        )
        .not("materials", "is", null)
        .contains("materials", [materialQuery])
        .limit(limit);

      if (options?.template_id) {
        templateQuery = templateQuery.eq("template_id", options.template_id);
      }

      const { data: templateNodes, error: templateError } = await templateQuery;

      // Template nodes table may not exist yet or may not have materials column.
      // Fall back gracefully - this is a search, not critical path.
      if (!templateError && templateNodes) {
        for (const row of templateNodes) {
          const r = row as Record<string, unknown>;
          const template = unwrapJoin(r.template);

          results.push({
            node_id: r.id as string,
            node_title: r.title as string,
            node_code: (r.code as string) ?? null,
            node_level: r.level as string,
            materials: (r.materials as string[]) ?? [],
            template_id: (template?.id as string) ?? "",
            template_name: (template?.name as string) ?? "",
            framework: (template?.framework as string) ?? null,
            instance_id: null,
            instance_name: null,
          });
        }
      }
    }

    return success(results.slice(0, limit));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search by material";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// SEARCH: Find nodes by official code
// ============================================================
// WHY: Teachers and compliance officers reference outcomes by
// code (e.g., "ACMNA001", "EYLF-3.2"). Quick lookup by code.
// ============================================================

export async function searchNodesByCode(
  code: string,
  options?: {
    instance_id?: string;
    exact?: boolean;
    limit?: number;
  },
): Promise<ActionResponse<EnhancedCurriculumNode[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const limit = options?.limit ?? 20;

    let query = supabase
      .from("curriculum_nodes")
      .select("*")
      .is("deleted_at", null)
      .not("code", "is", null);

    if (options?.instance_id) {
      query = query.eq("instance_id", options.instance_id);
    }

    if (options?.exact) {
      query = query.eq("code", code);
    } else {
      query = query.ilike("code", `%${code}%`);
    }

    const { data, error } = await query.order("code").limit(limit);

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    return success((data ?? []) as EnhancedCurriculumNode[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search by code";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// REPORT: Generate compliance report for a framework
// ============================================================
// WHY: During ACECQA assessment & rating visits, the school
// must demonstrate evidence against every EYLF outcome. This
// function generates: "For each EYLF outcome, here are all
// observations and mastery records that map to it (via cross-
// mappings from AMI outcomes)."
//
// The report traverses: compliance outcome ← cross-mapping →
// pedagogical outcome → observation_outcomes / student_mastery
// ============================================================

export async function generateComplianceReport(
  complianceTemplateId: string,
  options?: {
    /** Only include evidence from this date onwards */
    from_date?: string;
    /** Only include evidence up to this date */
    to_date?: string;
    /** Only include evidence for this student */
    student_id?: string;
    /** Only include evidence for this class */
    class_id?: string;
  },
): Promise<ActionResponse<ComplianceReport>> {
  try {
    await requirePermission(PERM_VIEW_COMPLIANCE);
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // 1. Fetch the compliance template
    const { data: template, error: templateError } = await adminClient
      .from("curriculum_templates")
      .select("*")
      .eq("id", complianceTemplateId)
      .single();

    if (templateError || !template) {
      return failure("Compliance template not found", ErrorCodes.NOT_FOUND);
    }

    const typedTemplate = template as Record<string, unknown>;
    const framework = (typedTemplate.framework as string) ?? "Unknown";
    const templateName = typedTemplate.name as string;

    // 2. Fetch all outcome-level nodes in this compliance template
    const { data: complianceNodes, error: nodesError } = await adminClient
      .from("curriculum_template_nodes")
      .select("id, title, code, level")
      .eq("template_id", complianceTemplateId)
      .in("level", ["outcome", "strand"])
      .order("sequence_order");

    if (nodesError) {
      return failure(nodesError.message, ErrorCodes.INTERNAL_ERROR);
    }

    if (!complianceNodes || complianceNodes.length === 0) {
      return success({
        framework,
        template_id: complianceTemplateId,
        template_name: templateName,
        generated_at: new Date().toISOString(),
        outcomes: [],
        total_evidence: 0,
        outcomes_with_evidence: 0,
        outcomes_without_evidence: 0,
      });
    }

    // 3. For each compliance node, find cross-mapped pedagogical nodes
    const complianceNodeIds = complianceNodes.map(
      (n) => (n as Record<string, unknown>).id as string,
    );

    const { data: crossMappings, error: mapError } = await adminClient
      .from("curriculum_cross_mappings")
      .select("source_node_id, target_node_id")
      .or(
        `source_node_id.in.(${complianceNodeIds.join(",")}),` +
          `target_node_id.in.(${complianceNodeIds.join(",")})`,
      );

    if (mapError) {
      return failure(mapError.message, ErrorCodes.INTERNAL_ERROR);
    }

    // Build: complianceNodeId → [pedagogicalNodeId, ...]
    const complianceToSource = new Map<string, Set<string>>();
    const complianceNodeIdSet = new Set(complianceNodeIds);

    for (const mapping of crossMappings ?? []) {
      const m = mapping as Record<string, unknown>;
      const sourceId = m.source_node_id as string;
      const targetId = m.target_node_id as string;

      if (complianceNodeIdSet.has(targetId)) {
        // This compliance node is the target → source is the pedagogical node
        if (!complianceToSource.has(targetId))
          complianceToSource.set(targetId, new Set());
        complianceToSource.get(targetId)!.add(sourceId);
      }
      if (complianceNodeIdSet.has(sourceId)) {
        // This compliance node is the source → target is the pedagogical node
        if (!complianceToSource.has(sourceId))
          complianceToSource.set(sourceId, new Set());
        complianceToSource.get(sourceId)!.add(targetId);
      }
    }

    // 4. Collect all pedagogical node IDs we need to search evidence for
    const allPedagogicalNodeIds: string[] = [];
    for (const nodeIds of complianceToSource.values()) {
      for (const id of nodeIds) {
        allPedagogicalNodeIds.push(id);
      }
    }

    // 5. Also find tenant curriculum_nodes that were forked from these template nodes
    // (observations link to instance nodes, not template nodes)
    let instanceNodeMap = new Map<string, string>(); // template_node_id → instance_node_id

    if (allPedagogicalNodeIds.length > 0) {
      const { data: instanceNodes } = await supabase
        .from("curriculum_nodes")
        .select("id, source_template_node_id")
        .in("source_template_node_id", allPedagogicalNodeIds)
        .is("deleted_at", null);

      if (instanceNodes) {
        for (const node of instanceNodes) {
          const n = node as Record<string, unknown>;
          const templateNodeId = n.source_template_node_id as string;
          const instanceNodeId = n.id as string;
          instanceNodeMap.set(templateNodeId, instanceNodeId);
        }
      }
    }

    // 6. Fetch observation evidence
    const instanceNodeIds = [...instanceNodeMap.values()];
    const observationEvidence = new Map<string, ComplianceEvidence[]>(); // instanceNodeId → evidence[]

    if (instanceNodeIds.length > 0) {
      let obsQuery = supabase
        .from("observation_outcomes")
        .select(
          `
          curriculum_node_id,
          observation:observations!observation_outcomes_observation_id_fkey(
            id, content, published_at, status,
            observation_students:observation_students(
              student:students!observation_students_student_id_fkey(id, first_name, last_name)
            )
          )
        `,
        )
        .in("curriculum_node_id", instanceNodeIds);

      const { data: obsData } = await obsQuery;

      if (obsData) {
        for (const row of obsData) {
          const r = row as Record<string, unknown>;
          const nodeId = r.curriculum_node_id as string;
          const observation = unwrapJoin(r.observation);
          if (!observation) continue;

          // Only include published observations
          if ((observation.status as string) !== "published") continue;

          // Date filtering
          const publishedAt = observation.published_at as string;
          if (options?.from_date && publishedAt < options.from_date) continue;
          if (options?.to_date && publishedAt > options.to_date) continue;

          const students =
            (observation.observation_students as Array<
              Record<string, unknown>
            >) ?? [];

          for (const studentRow of students) {
            const student = unwrapJoin(studentRow.student);
            if (!student) continue;

            // Student filtering
            if (
              options?.student_id &&
              (student.id as string) !== options.student_id
            )
              continue;

            if (!observationEvidence.has(nodeId))
              observationEvidence.set(nodeId, []);
            observationEvidence.get(nodeId)!.push({
              type: "observation",
              id: observation.id as string,
              summary: truncate((observation.content as string) ?? "", 120),
              student_name:
                `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim(),
              student_id: student.id as string,
              date: publishedAt,
              source_outcome: null, // Will be filled below
            });
          }
        }
      }
    }

    // 7. Fetch mastery evidence
    const masteryEvidence = new Map<string, ComplianceEvidence[]>();

    if (instanceNodeIds.length > 0) {
      let masteryQuery = supabase
        .from("student_mastery")
        .select(
          `
          id, curriculum_node_id, status, date_achieved,
          student:students!student_mastery_student_id_fkey(id, first_name, last_name)
        `,
        )
        .in("curriculum_node_id", instanceNodeIds)
        .in("status", ["practicing", "mastered"]);

      const { data: masteryData } = await masteryQuery;

      if (masteryData) {
        for (const row of masteryData) {
          const r = row as Record<string, unknown>;
          const nodeId = r.curriculum_node_id as string;
          const student = unwrapJoin(r.student);
          if (!student) continue;

          if (
            options?.student_id &&
            (student.id as string) !== options.student_id
          )
            continue;

          const dateAchieved = (r.date_achieved as string) ?? (r.id as string);
          if (options?.from_date && dateAchieved < options.from_date) continue;
          if (options?.to_date && dateAchieved > options.to_date) continue;

          if (!masteryEvidence.has(nodeId)) masteryEvidence.set(nodeId, []);
          masteryEvidence.get(nodeId)!.push({
            type: "mastery",
            id: r.id as string,
            summary: `Status: ${r.status as string}`,
            student_name:
              `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim(),
            student_id: student.id as string,
            date: dateAchieved,
            source_outcome: null,
          });
        }
      }
    }

    // 8. Assemble the report - one item per compliance outcome
    const outcomes: ComplianceReportItem[] = [];
    let totalEvidence = 0;
    let withEvidence = 0;
    let withoutEvidence = 0;

    for (const complianceNode of complianceNodes) {
      const cn = complianceNode as Record<string, unknown>;
      const complianceNodeId = cn.id as string;

      const evidence: ComplianceEvidence[] = [];

      // Get all pedagogical nodes mapped to this compliance node
      const pedagogicalNodeIds =
        complianceToSource.get(complianceNodeId) ?? new Set();

      for (const pedNodeId of pedagogicalNodeIds) {
        // Find the instance node ID for this pedagogical template node
        const instanceNodeId = instanceNodeMap.get(pedNodeId);
        if (!instanceNodeId) continue;

        // Collect observation evidence
        const obsEvidence = observationEvidence.get(instanceNodeId) ?? [];
        evidence.push(...obsEvidence);

        // Collect mastery evidence
        const masEvidence = masteryEvidence.get(instanceNodeId) ?? [];
        evidence.push(...masEvidence);
      }

      // Sort evidence by date, newest first
      evidence.sort((a, b) => b.date.localeCompare(a.date));

      totalEvidence += evidence.length;
      if (evidence.length > 0) {
        withEvidence++;
      } else {
        withoutEvidence++;
      }

      outcomes.push({
        outcome_id: complianceNodeId,
        outcome_title: cn.title as string,
        outcome_code: (cn.code as string) ?? null,
        evidence_count: evidence.length,
        evidence,
      });
    }

    return success({
      framework,
      template_id: complianceTemplateId,
      template_name: templateName,
      generated_at: new Date().toISOString(),
      outcomes,
      total_evidence: totalEvidence,
      outcomes_with_evidence: withEvidence,
      outcomes_without_evidence: withoutEvidence,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to generate compliance report";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// READ: Get prerequisite chain for a curriculum node
// ============================================================
// WHY: The prerequisite visualization feature shows directed
// dependencies between outcomes. Guides use this to understand
// what a child should have mastered before presenting a new work.
// ============================================================

export async function getPrerequisiteChain(
  nodeId: string,
  instanceId: string,
): Promise<ActionResponse<EnhancedCurriculumNode[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch the starting node
    const { data: startNode, error: startError } = await supabase
      .from("curriculum_nodes")
      .select("*")
      .eq("id", nodeId)
      .eq("instance_id", instanceId)
      .is("deleted_at", null)
      .single();

    if (startError || !startNode) {
      return failure("Node not found", ErrorCodes.NOT_FOUND);
    }

    const typedStart = startNode as Record<string, unknown>;
    const prerequisites = (typedStart.prerequisites as string[]) ?? [];

    if (prerequisites.length === 0) {
      return success([]);
    }

    // Walk the prerequisite chain (max 10 levels to prevent infinite loops)
    const visited = new Set<string>();
    const chain: EnhancedCurriculumNode[] = [];
    let currentIds = [...prerequisites];
    let depth = 0;
    const maxDepth = 10;

    while (currentIds.length > 0 && depth < maxDepth) {
      const unvisited = currentIds.filter((id) => !visited.has(id));
      if (unvisited.length === 0) break;

      for (const id of unvisited) {
        visited.add(id);
      }

      const { data: nodes, error: nodesError } = await supabase
        .from("curriculum_nodes")
        .select("*")
        .in("id", unvisited)
        .eq("instance_id", instanceId)
        .is("deleted_at", null);

      if (nodesError || !nodes) break;

      const nextIds: string[] = [];
      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        chain.push(n as unknown as EnhancedCurriculumNode);
        const nodePrereqs = (n.prerequisites as string[]) ?? [];
        nextIds.push(...nodePrereqs);
      }

      currentIds = nextIds;
      depth++;
    }

    return success(chain);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get prerequisite chain";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// READ: Get enriched node details with Module 14 columns
// ============================================================
// WHY: The existing getCurriculumTree returns basic node data.
// This returns a single node with all the enriched Module 14
// fields: materials, aims, prerequisites, assessment criteria.
// ============================================================

export async function getEnrichedNode(
  nodeId: string,
): Promise<ActionResponse<EnhancedCurriculumNode>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("curriculum_nodes")
      .select("*")
      .eq("id", nodeId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return failure("Node not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as EnhancedCurriculumNode);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get enriched node";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// UPDATE: Set Module 14 enrichment fields on a curriculum node
// ============================================================
// WHY: Allows guides and curriculum managers to add/edit the
// Montessori-specific metadata: materials, aims, prerequisites.
// ============================================================

export interface UpdateNodeEnrichmentInput {
  code?: string | null;
  description?: string | null;
  materials?: string[] | null;
  direct_aims?: string[] | null;
  indirect_aims?: string[] | null;
  age_range?: string | null;
  prerequisites?: string[] | null;
  assessment_criteria?: string | null;
  content_url?: string | null;
}

export async function updateNodeEnrichment(
  nodeId: string,
  input: UpdateNodeEnrichmentInput,
): Promise<ActionResponse<EnhancedCurriculumNode>> {
  try {
    await requirePermission("manage_curriculum");
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.materials !== undefined) updateData.materials = input.materials;
    if (input.direct_aims !== undefined)
      updateData.direct_aims = input.direct_aims;
    if (input.indirect_aims !== undefined)
      updateData.indirect_aims = input.indirect_aims;
    if (input.age_range !== undefined) updateData.age_range = input.age_range;
    if (input.prerequisites !== undefined)
      updateData.prerequisites = input.prerequisites;
    if (input.assessment_criteria !== undefined)
      updateData.assessment_criteria = input.assessment_criteria;
    if (input.content_url !== undefined)
      updateData.content_url = input.content_url;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("curriculum_nodes")
      .update(updateData)
      .eq("id", nodeId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.INTERNAL_ERROR);
    }

    if (!data) {
      return failure("Node not found", ErrorCodes.NOT_FOUND);
    }

    return success(data as EnhancedCurriculumNode);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update node enrichment";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// IMPORT: Import a JSON curriculum template with nodes and
// cross-mappings
// ============================================================
// WHY: Curriculum data is curated as JSON files in
// /packages/curriculum-templates/. This function takes a JSON
// template (matching the format in the design doc) and creates
// the template + all nodes + all cross-mappings in one operation.
//
// This is an admin-only operation - only Ecodia staff can
// import global templates.
// ============================================================

export interface ImportResult {
  template_id: string;
  nodes_created: number;
  cross_mappings_created: number;
  cross_mappings_skipped: number;
}

export async function importJsonTemplate(
  json: JsonTemplateImport,
): Promise<ActionResponse<ImportResult>> {
  try {
    const context = await requirePermission(PERM_MANAGE_TEMPLATES);
    const adminClient = createSupabaseAdminClient();

    // 1. Create or update the template
    const { data: existingTemplate } = await adminClient
      .from("curriculum_templates")
      .select("id")
      .eq("slug", json.slug)
      .single();

    let templateId: string;

    if (existingTemplate) {
      // Update existing template metadata
      const { error: updateError } = await adminClient
        .from("curriculum_templates")
        .update({
          name: json.name,
          framework: json.framework,
          age_range: json.age_range,
          country: json.country ?? "AU",
          state: json.state ?? null,
          version: json.version,
          is_compliance_framework: json.is_compliance_framework ?? false,
          is_active: true,
        })
        .eq("id", (existingTemplate as Record<string, unknown>).id as string);

      if (updateError) {
        return failure(
          `Failed to update template: ${updateError.message}`,
          ErrorCodes.INTERNAL_ERROR,
        );
      }

      templateId = (existingTemplate as Record<string, unknown>).id as string;

      // Soft-delete existing template nodes (will re-create)
      const { error: deleteError } = await adminClient
        .from("curriculum_template_nodes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("template_id", templateId);

      if (deleteError) {
        return failure(
          `Failed to clear existing nodes: ${deleteError.message}`,
          ErrorCodes.INTERNAL_ERROR,
        );
      }
    } else {
      // Create new template
      const { data: newTemplate, error: createError } = await adminClient
        .from("curriculum_templates")
        .insert({
          slug: json.slug,
          name: json.name,
          framework: json.framework,
          age_range: json.age_range,
          country: json.country ?? "AU",
          state: json.state ?? null,
          version: json.version,
          is_compliance_framework: json.is_compliance_framework ?? false,
          is_active: true,
        })
        .select()
        .single();

      if (createError || !newTemplate) {
        return failure(
          `Failed to create template: ${createError?.message}`,
          ErrorCodes.INTERNAL_ERROR,
        );
      }

      templateId = (newTemplate as Record<string, unknown>).id as string;
    }

    // 2. Recursively insert nodes, collecting code → nodeId mappings for cross-mapping resolution
    const codeToNodeId = new Map<string, string>();
    let nodesCreated = 0;

    // Collect deferred cross-mappings (code-based references that need resolution)
    const deferredCrossMappings: Array<{
      source_node_id: string;
      target_framework: string;
      target_code: string;
      mapping_type: string;
    }> = [];

    async function insertNodes(
      nodes: JsonTemplateNode[],
      parentId: string | null,
      sequenceStart: number,
    ): Promise<void> {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        const { data: insertedNode, error: insertError } = await adminClient
          .from("curriculum_template_nodes")
          .insert({
            template_id: templateId,
            parent_id: parentId,
            level: node.level,
            title: node.title,
            code: node.code ?? null,
            description: node.description ?? null,
            materials: node.materials ?? null,
            direct_aims: node.direct_aims ?? null,
            indirect_aims: node.indirect_aims ?? null,
            age_range: node.age_range ?? null,
            assessment_criteria: node.assessment_criteria ?? null,
            content_url: node.content_url ?? null,
            sequence_order: sequenceStart + i,
          })
          .select()
          .single();

        if (insertError || !insertedNode) continue;

        const insertedId = (insertedNode as Record<string, unknown>)
          .id as string;
        nodesCreated++;

        // Map code to node ID for cross-mapping resolution
        if (node.code) {
          codeToNodeId.set(node.code, insertedId);
        }

        // Collect cross-mapping references for deferred resolution
        if (node.cross_mappings) {
          for (const mapping of node.cross_mappings) {
            deferredCrossMappings.push({
              source_node_id: insertedId,
              target_framework: mapping.framework,
              target_code: mapping.code,
              mapping_type: mapping.type,
            });
          }
        }

        // Recurse into children
        if (node.children && node.children.length > 0) {
          await insertNodes(node.children, insertedId, 0);
        }
      }
    }

    await insertNodes(json.nodes, null, 0);

    // 3. Resolve deferred cross-mappings
    let crossMappingsCreated = 0;
    let crossMappingsSkipped = 0;

    if (deferredCrossMappings.length > 0) {
      // Collect all target codes we need to look up
      const targetCodes = [
        ...new Set(deferredCrossMappings.map((m) => m.target_code)),
      ];

      // Look up target nodes across all templates by code
      const { data: targetNodes } = await adminClient
        .from("curriculum_template_nodes")
        .select("id, code, template_id")
        .in("code", targetCodes)
        .not("code", "is", null);

      // Build code → {nodeId, templateId} map
      const codeToTarget = new Map<
        string,
        { nodeId: string; templateId: string }
      >();
      if (targetNodes) {
        for (const tn of targetNodes) {
          const t = tn as Record<string, unknown>;
          const code = t.code as string;
          // If multiple nodes have the same code, prefer the first one
          if (!codeToTarget.has(code)) {
            codeToTarget.set(code, {
              nodeId: t.id as string,
              templateId: t.template_id as string,
            });
          }
        }
      }

      // Create cross-mappings
      const crossMappingRows: Array<Record<string, unknown>> = [];

      for (const dm of deferredCrossMappings) {
        const target = codeToTarget.get(dm.target_code);
        if (!target) {
          crossMappingsSkipped++;
          continue;
        }

        crossMappingRows.push({
          tenant_id: null, // Global mapping
          source_template_id: templateId,
          source_node_id: dm.source_node_id,
          target_template_id: target.templateId,
          target_node_id: target.nodeId,
          mapping_type: dm.mapping_type || "aligned",
          confidence: "verified",
          notes: null,
          created_by: context.user.id,
        });
      }

      if (crossMappingRows.length > 0) {
        const { data: created } = await adminClient
          .from("curriculum_cross_mappings")
          .upsert(crossMappingRows, {
            onConflict: "source_node_id,target_node_id",
            ignoreDuplicates: true,
          })
          .select();

        crossMappingsCreated = (created ?? []).length;
        crossMappingsSkipped += crossMappingRows.length - crossMappingsCreated;
      }
    }

    return success({
      template_id: templateId,
      nodes_created: nodesCreated,
      cross_mappings_created: crossMappingsCreated,
      cross_mappings_skipped: crossMappingsSkipped,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to import template";
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

/** Truncate a string to a max length, adding ellipsis if needed */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
