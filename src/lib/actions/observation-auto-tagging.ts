// src/lib/actions/observation-auto-tagging.ts
//
// ============================================================
// WattleOS V2 - Observation Auto-Tagging Server Actions
// ============================================================
// AI suggests EYLF/NQF curriculum outcomes and Montessori area
// tags for an observation. Suggestions are stored as
// observation_tag_suggestions rows with status='pending'.
//
// Workflow:
//   1. After createObservation(), call generateTagSuggestions()
//   2. Client renders pending chips; educator confirms/dismisses
//   3. reviewTagSuggestion() persists decision; 'confirmed'
//      chips call applyConfirmedTag() → inserts into
//      observation_outcomes so they appear in the feed.
// ============================================================
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ActionResponse } from "@/types/api";
import { success, failure, ErrorCodes } from "@/types/api";
import type {
  ObservationTagSuggestion,
  ObservationTagSuggestionWithNode,
  ObservationTagSuggestionsResult,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import OpenAI from "openai";

// ============================================================
// OpenAI client (lazy singleton, same pattern as ask-wattle)
// ============================================================

function getOpenAIClient(): OpenAI {
  return new OpenAI(); // reads OPENAI_API_KEY from env
}

const TAG_MODEL = "gpt-4o-mini"; // fast + cheap for structured extraction

// ============================================================
// GENERATE: Produce AI suggestions for an observation
// ============================================================

export async function generateTagSuggestions(
  observationId: string,
): Promise<ActionResponse<ObservationTagSuggestionsResult>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  // 1. Load the observation content
  const { data: obs, error: obsError } = await supabase
    .from("observations")
    .select("id, content, tenant_id")
    .eq("id", observationId)
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .single();

  if (obsError || !obs) {
    return failure("Observation not found", ErrorCodes.NOT_FOUND);
  }

  const content = (
    obs as { id: string; content: string | null; tenant_id: string }
  ).content;
  if (!content || content.trim().length < 20) {
    return failure(
      "Observation content is too short to tag",
      ErrorCodes.VALIDATION_ERROR,
    );
  }

  // 2. Load active curriculum nodes (outcomes + activities only)
  const { data: nodes, error: nodesError } = await supabase
    .from("curriculum_nodes")
    .select("id, title, level, code")
    .eq("tenant_id", context.tenant.id)
    .in("level", ["outcome", "activity"])
    .eq("is_active", true)
    .limit(200);

  if (nodesError) {
    return failure(nodesError.message, ErrorCodes.DATABASE_ERROR);
  }

  // 3. Fetch already-applied outcome ids for this observation
  //    (so we don't re-suggest tags already applied)
  const { data: existingOutcomes } = await supabase
    .from("observation_outcomes")
    .select("curriculum_node_id")
    .eq("observation_id", observationId);

  const alreadyApplied = new Set(
    (existingOutcomes ?? []).map(
      (r: Record<string, unknown>) => r.curriculum_node_id as string,
    ),
  );

  // 4. Build curriculum reference list for the prompt
  const curriculumRef = (nodes ?? [])
    .filter((n: Record<string, unknown>) => !alreadyApplied.has(n.id as string))
    .slice(0, 150)
    .map((n: Record<string, unknown>) => {
      const code = n.code ? ` (${n.code})` : "";
      return `${n.id}|${n.title}${code}|${n.level}`;
    })
    .join("\n");

  const montessoriAreas = [
    "Practical Life",
    "Sensorial",
    "Language",
    "Mathematics",
    "Cultural",
    "Science",
    "Art",
    "Music",
    "Physical Education",
    "Social Emotional Learning",
  ];

  // 5. Call GPT to produce structured suggestions
  let rawResponse: string;
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: TAG_MODEL,
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `You are an expert early-childhood educator assistant. Your task is to analyse an observation narrative written by an educator and suggest the most relevant curriculum outcome tags and Montessori area tags.

Return ONLY a JSON object with this exact shape - no markdown, no prose:
{
  "curriculum_outcomes": [
    { "node_id": "<uuid>", "display_label": "<title>", "confidence": 0.0–1.0, "rationale": "<one-sentence why>" }
  ],
  "montessori_areas": [
    { "area_label": "<area>", "display_label": "<area>", "confidence": 0.0–1.0, "rationale": "<one-sentence why>" }
  ]
}

Rules:
- Suggest at most 5 curriculum outcomes and 3 Montessori areas
- Only suggest outcomes where confidence ≥ 0.6
- node_id must be one of the UUIDs in the provided curriculum list
- area_label must be from the provided Montessori areas list exactly
- rationale must reference specific observable behaviour from the observation
- If no outcomes apply with ≥ 0.6 confidence, return empty arrays`,
        },
        {
          role: "user",
          content: `## Observation narrative
${content}

## Available curriculum outcomes (format: uuid|title|level)
${curriculumRef || "(none available)"}

## Available Montessori areas
${montessoriAreas.join(", ")}`,
        },
      ],
    });

    rawResponse = response.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service unavailable";
    return failure(
      `Failed to generate suggestions: ${msg}`,
      ErrorCodes.INTERNAL_ERROR,
    );
  }

  // 6. Parse the AI response
  let parsed: {
    curriculum_outcomes: Array<{
      node_id: string;
      display_label: string;
      confidence: number;
      rationale: string;
    }>;
    montessori_areas: Array<{
      area_label: string;
      display_label: string;
      confidence: number;
      rationale: string;
    }>;
  };

  try {
    // Strip markdown code fences if present
    const cleaned = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return failure(
      "AI returned an unparseable response",
      ErrorCodes.INTERNAL_ERROR,
    );
  }

  // 7. Validate node ids exist in our list
  const nodeMap = new Map(
    (nodes ?? []).map((n: Record<string, unknown>) => [n.id as string, n]),
  );

  const validCurriculumSuggestions = (parsed.curriculum_outcomes ?? [])
    .filter((s) => nodeMap.has(s.node_id) && s.confidence >= 0.6)
    .slice(0, 5);

  const validAreaSuggestions = (parsed.montessori_areas ?? [])
    .filter(
      (s) => montessoriAreas.includes(s.area_label) && s.confidence >= 0.6,
    )
    .slice(0, 3);

  if (
    validCurriculumSuggestions.length === 0 &&
    validAreaSuggestions.length === 0
  ) {
    // No quality suggestions - return empty result (not an error)
    return success({
      observation_id: observationId,
      suggestions: [],
      confirmed_count: 0,
      pending_count: 0,
      dismissed_count: 0,
    });
  }

  // 8. Delete any previous pending suggestions for this observation
  //    (e.g. if regenerating) - keep confirmed/dismissed history intact
  await supabase
    .from("observation_tag_suggestions")
    .delete()
    .eq("observation_id", observationId)
    .eq("tenant_id", context.tenant.id)
    .eq("status", "pending");

  // 9. Insert new suggestions
  const inserts: Array<Record<string, unknown>> = [];

  for (const s of validCurriculumSuggestions) {
    const node = nodeMap.get(s.node_id) as Record<string, unknown>;
    inserts.push({
      tenant_id: context.tenant.id,
      observation_id: observationId,
      tag_type: "curriculum_outcome",
      curriculum_node_id: s.node_id,
      area_label: null,
      display_label: (node.title as string) ?? s.display_label,
      confidence: Math.min(1, Math.max(0, s.confidence)),
      rationale: s.rationale ?? null,
      status: "pending",
    });
  }

  for (const s of validAreaSuggestions) {
    inserts.push({
      tenant_id: context.tenant.id,
      observation_id: observationId,
      tag_type: "montessori_area",
      curriculum_node_id: null,
      area_label: s.area_label,
      display_label: s.display_label,
      confidence: Math.min(1, Math.max(0, s.confidence)),
      rationale: s.rationale ?? null,
      status: "pending",
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("observation_tag_suggestions")
    .insert(inserts)
    .select("*, curriculum_node:curriculum_nodes(id, title, level)");

  if (insertError) {
    return failure(insertError.message, ErrorCodes.DATABASE_ERROR);
  }

  await logAudit({
    context,
    action: AuditActions.OBSERVATION_TAGS_GENERATED,
    entityType: "observation",
    entityId: observationId,
    metadata: {
      curriculum_count: validCurriculumSuggestions.length,
      area_count: validAreaSuggestions.length,
    },
  });

  const suggestions = mapSuggestions(inserted ?? []);

  return success({
    observation_id: observationId,
    suggestions,
    confirmed_count: 0,
    pending_count: suggestions.length,
    dismissed_count: 0,
  });
}

// ============================================================
// GET: Load suggestions for an observation
// ============================================================

export async function getTagSuggestions(
  observationId: string,
): Promise<ActionResponse<ObservationTagSuggestionsResult>> {
  await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("observation_tag_suggestions")
    .select("*, curriculum_node:curriculum_nodes(id, title, level)")
    .eq("observation_id", observationId)
    .order("confidence", { ascending: false });

  if (error) {
    return failure(error.message, ErrorCodes.DATABASE_ERROR);
  }

  const suggestions = mapSuggestions(data ?? []);

  return success({
    observation_id: observationId,
    suggestions,
    confirmed_count: suggestions.filter((s) => s.status === "confirmed").length,
    pending_count: suggestions.filter((s) => s.status === "pending").length,
    dismissed_count: suggestions.filter((s) => s.status === "dismissed").length,
  });
}

// ============================================================
// REVIEW: Confirm or dismiss a single suggestion
// ============================================================

export async function reviewTagSuggestion(
  suggestionId: string,
  status: "confirmed" | "dismissed",
): Promise<ActionResponse<ObservationTagSuggestion>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  // Load suggestion to get observation_id + node_id for apply step
  const { data: existing, error: fetchError } = await supabase
    .from("observation_tag_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("tenant_id", context.tenant.id)
    .single();

  if (fetchError || !existing) {
    return failure("Suggestion not found", ErrorCodes.NOT_FOUND);
  }

  const suggestion = existing as ObservationTagSuggestion;

  if (suggestion.status !== "pending") {
    return failure(
      "Suggestion has already been reviewed",
      ErrorCodes.VALIDATION_ERROR,
    );
  }

  // Mark the suggestion as reviewed
  const { data: updated, error: updateError } = await supabase
    .from("observation_tag_suggestions")
    .update({
      status,
      reviewed_by: context.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", suggestionId)
    .select()
    .single();

  if (updateError || !updated) {
    return failure(
      updateError?.message ?? "Update failed",
      ErrorCodes.DATABASE_ERROR,
    );
  }

  // If confirmed + curriculum_outcome → apply to observation_outcomes
  if (
    status === "confirmed" &&
    suggestion.tag_type === "curriculum_outcome" &&
    suggestion.curriculum_node_id
  ) {
    const { error: applyError } = await supabase
      .from("observation_outcomes")
      .upsert(
        {
          tenant_id: context.tenant.id,
          observation_id: suggestion.observation_id,
          curriculum_node_id: suggestion.curriculum_node_id,
        },
        {
          onConflict: "observation_id,curriculum_node_id",
          ignoreDuplicates: true,
        },
      );

    if (applyError) {
      // Log but don't fail - suggestion is already marked confirmed
      console.error(
        "Failed to apply confirmed tag to observation_outcomes:",
        applyError.message,
      );
    }
  }

  await logAudit({
    context,
    action:
      status === "confirmed"
        ? AuditActions.OBSERVATION_TAG_CONFIRMED
        : AuditActions.OBSERVATION_TAG_DISMISSED,
    entityType: "observation_tag_suggestion",
    entityId: suggestionId,
    metadata: {
      observation_id: suggestion.observation_id,
      tag_type: suggestion.tag_type,
      display_label: suggestion.display_label,
    },
  });

  return success(updated as ObservationTagSuggestion);
}

// ============================================================
// BULK REVIEW: Accept/dismiss all pending at once
// ============================================================

export async function bulkReviewTagSuggestions(
  observationId: string,
  action: "confirm_all" | "dismiss_all",
): Promise<ActionResponse<{ updated: number }>> {
  const context = await requirePermission(Permissions.CREATE_OBSERVATION);
  const supabase = await createSupabaseServerClient();

  const newStatus = action === "confirm_all" ? "confirmed" : "dismissed";
  const now = new Date().toISOString();

  // Load pending suggestions before bulk-updating
  const { data: pending } = await supabase
    .from("observation_tag_suggestions")
    .select("*")
    .eq("observation_id", observationId)
    .eq("tenant_id", context.tenant.id)
    .eq("status", "pending");

  const pendingRows = (pending ?? []) as ObservationTagSuggestion[];
  if (pendingRows.length === 0) {
    return success({ updated: 0 });
  }

  const { error: bulkError } = await supabase
    .from("observation_tag_suggestions")
    .update({
      status: newStatus,
      reviewed_by: context.user.id,
      reviewed_at: now,
    })
    .eq("observation_id", observationId)
    .eq("tenant_id", context.tenant.id)
    .eq("status", "pending");

  if (bulkError) {
    return failure(bulkError.message, ErrorCodes.DATABASE_ERROR);
  }

  // Apply all confirmed curriculum_outcome tags
  if (action === "confirm_all") {
    const toApply = pendingRows.filter(
      (s) => s.tag_type === "curriculum_outcome" && s.curriculum_node_id,
    );

    if (toApply.length > 0) {
      await supabase.from("observation_outcomes").upsert(
        toApply.map((s) => ({
          tenant_id: context.tenant.id,
          observation_id: observationId,
          curriculum_node_id: s.curriculum_node_id!,
        })),
        {
          onConflict: "observation_id,curriculum_node_id",
          ignoreDuplicates: true,
        },
      );
    }
  }

  await logAudit({
    context,
    action: AuditActions.OBSERVATION_TAGS_BULK_REVIEWED,
    entityType: "observation",
    entityId: observationId,
    metadata: { action, count: pendingRows.length },
  });

  return success({ updated: pendingRows.length });
}

// ============================================================
// Helpers
// ============================================================

function mapSuggestions(rows: unknown[]): ObservationTagSuggestionWithNode[] {
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const nodeRow = r.curriculum_node as Record<string, unknown> | null;

    return {
      id: r.id as string,
      tenant_id: r.tenant_id as string,
      observation_id: r.observation_id as string,
      tag_type: r.tag_type as ObservationTagSuggestion["tag_type"],
      curriculum_node_id: (r.curriculum_node_id as string | null) ?? null,
      area_label: (r.area_label as string | null) ?? null,
      display_label: r.display_label as string,
      confidence: Number(r.confidence),
      rationale: (r.rationale as string | null) ?? null,
      status: r.status as ObservationTagSuggestion["status"],
      reviewed_by: (r.reviewed_by as string | null) ?? null,
      reviewed_at: (r.reviewed_at as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      curriculum_node: nodeRow
        ? {
            id: nodeRow.id as string,
            title: nodeRow.title as string,
            level: nodeRow.level as string,
          }
        : null,
    } satisfies ObservationTagSuggestionWithNode;
  });
}
