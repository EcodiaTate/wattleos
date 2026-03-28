"use server";

// src/lib/actions/nccd.ts
//
// ============================================================
// WattleOS - NCCD Disability Register Server Actions
// ============================================================
// Manages the Nationally Consistent Collection of Data (NCCD)
// disability register: entries, evidence, and annual collection
// submission.
//
// Permissions:
//   VIEW_NCCD   - read entries, evidence, export
//   MANAGE_NCCD - create, update, delete entries and evidence
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { currentNccdYear } from "@/lib/constants/nccd";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { encryptField, decryptField } from "@/lib/utils/encryption";

const SENSITIVE_NCCD_FIELDS = [
  "disability_subcategory",
  "notes",
] as const;

function decryptNccdRecord<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row };
  for (const field of SENSITIVE_NCCD_FIELDS) {
    if (typeof result[field] === "string") {
      (result as Record<string, unknown>)[field] = decryptField(
        result[field] as string,
      );
    }
  }
  return result;
}
import {
  createNccdEntrySchema,
  updateNccdEntrySchema,
  submitNccdCollectionSchema,
  addNccdEvidenceSchema,
  listNccdEntriesSchema,
  type CreateNccdEntryInput,
  type UpdateNccdEntryInput,
  type SubmitNccdCollectionInput,
  type AddNccdEvidenceInput,
  type ListNccdEntriesInput,
} from "@/lib/validations/nccd";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  NccdRegisterEntry,
  NccdEntryWithStudent,
  NccdEntryWithDetails,
  NccdEvidenceItem,
  NccdDashboardData,
  NccdCollectionSummary,
  NccdAdjustmentLevel,
  NccdDisabilityCategory,
} from "@/types/domain";

// ============================================================
// ENTRY - CREATE
// ============================================================

export async function createNccdEntry(
  input: CreateNccdEntryInput,
): Promise<ActionResponse<NccdRegisterEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const parsed = createNccdEntrySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        collection_year: v.collection_year,
        disability_category: v.disability_category,
        disability_subcategory: v.disability_subcategory ? encryptField(v.disability_subcategory) : null,
        adjustment_level: v.adjustment_level,
        adjustment_types: v.adjustment_types,
        funding_source: v.funding_source || null,
        funding_reference: v.funding_reference || null,
        funding_amount: v.funding_amount || null,
        professional_opinion: v.professional_opinion,
        professional_name: v.professional_name || null,
        professional_title: v.professional_title || null,
        professional_date: v.professional_date || null,
        parental_consent_given: v.parental_consent_given,
        parental_consent_date: v.parental_consent_date || null,
        parental_consent_by: v.parental_consent_given ? context.user.id : null,
        ilp_id: v.ilp_id || null,
        status: v.status,
        notes: v.notes ? encryptField(v.notes) : null,
        review_due_date: v.review_due_date || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      // Unique constraint violation = duplicate entry for this student/year
      if (error?.code === "23505") {
        return failure(
          `An NCCD entry already exists for this student in ${v.collection_year}`,
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(
        error?.message ?? "Failed to create NCCD entry",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.NCCD_ENTRY_CREATED,
      entityType: "nccd_register_entry",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        collection_year: v.collection_year,
        disability_category: v.disability_category,
        adjustment_level: v.adjustment_level,
      },
    });

    return success(decryptNccdRecord(data) as NccdRegisterEntry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ENTRY - UPDATE
// ============================================================

export async function updateNccdEntry(
  input: UpdateNccdEntryInput,
): Promise<ActionResponse<NccdRegisterEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const parsed = updateNccdEntrySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { id, ...v } = parsed.data;

    const updatePayload: Record<string, unknown> = {
      updated_by: context.user.id,
    };
    if (v.disability_category !== undefined)
      updatePayload.disability_category = v.disability_category;
    if (v.disability_subcategory !== undefined)
      updatePayload.disability_subcategory = v.disability_subcategory ? encryptField(v.disability_subcategory) : null;
    if (v.adjustment_level !== undefined)
      updatePayload.adjustment_level = v.adjustment_level;
    if (v.adjustment_types !== undefined)
      updatePayload.adjustment_types = v.adjustment_types;
    if (v.funding_source !== undefined)
      updatePayload.funding_source = v.funding_source || null;
    if (v.funding_reference !== undefined)
      updatePayload.funding_reference = v.funding_reference || null;
    if (v.funding_amount !== undefined)
      updatePayload.funding_amount = v.funding_amount || null;
    if (v.professional_opinion !== undefined)
      updatePayload.professional_opinion = v.professional_opinion;
    if (v.professional_name !== undefined)
      updatePayload.professional_name = v.professional_name || null;
    if (v.professional_title !== undefined)
      updatePayload.professional_title = v.professional_title || null;
    if (v.professional_date !== undefined)
      updatePayload.professional_date = v.professional_date || null;
    if (v.parental_consent_given !== undefined) {
      updatePayload.parental_consent_given = v.parental_consent_given;
      if (v.parental_consent_given) {
        updatePayload.parental_consent_by = context.user.id;
        updatePayload.parental_consent_date =
          v.parental_consent_date || new Date().toISOString().slice(0, 10);
      }
    }
    if (v.parental_consent_date !== undefined)
      updatePayload.parental_consent_date = v.parental_consent_date || null;
    if (v.ilp_id !== undefined) updatePayload.ilp_id = v.ilp_id || null;
    if (v.status !== undefined) updatePayload.status = v.status;
    if (v.notes !== undefined) updatePayload.notes = v.notes ? encryptField(v.notes) : null;
    if (v.review_due_date !== undefined)
      updatePayload.review_due_date = v.review_due_date || null;

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update NCCD entry",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.NCCD_ENTRY_UPDATED,
      entityType: "nccd_register_entry",
      entityId: id,
      metadata: { changes: Object.keys(updatePayload) },
    });

    return success(decryptNccdRecord(data) as NccdRegisterEntry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ENTRY - DELETE (soft)
// ============================================================

export async function deleteNccdEntry(
  entryId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("nccd_register_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    await logAudit({
      context,
      action: AuditActions.NCCD_ENTRY_DELETED,
      entityType: "nccd_register_entry",
      entityId: entryId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ENTRY - GET (single with full detail)
// ============================================================

export async function getNccdEntry(
  entryId: string,
): Promise<ActionResponse<NccdEntryWithDetails>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NCCD);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .select(
        `*,
        student:students(
          id, first_name, last_name, preferred_name, photo_url, dob, enrollment_status
        ),
        evidence:nccd_evidence_items(
          id, tenant_id, entry_id, student_id, evidence_type, description,
          observation_id, ilp_evidence_id, document_url, document_name,
          evidence_date, created_by, created_at, deleted_at
        ),
        ilp:individual_learning_plans(id, plan_status, plan_title),
        consented_by_user:users!parental_consent_by(id, first_name, last_name)`,
      )
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .is("evidence.deleted_at", null)
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "NCCD entry not found",
        ErrorCodes.NOT_FOUND,
      );
    }

    const decrypted = decryptNccdRecord(data);
    const entry: NccdEntryWithDetails = {
      ...(decrypted as NccdRegisterEntry),
      student: Array.isArray(data.student) ? data.student[0] : data.student,
      evidence: (data.evidence as NccdEvidenceItem[]) ?? [],
      ilp: Array.isArray(data.ilp)
        ? data.ilp[0]
          ? {
              id: data.ilp[0].id,
              status: data.ilp[0].plan_status,
              plan_name: data.ilp[0].plan_title,
            }
          : null
        : data.ilp
          ? {
              id: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).id,
              status: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).plan_status,
              plan_name: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).plan_title,
            }
          : null,
      consented_by_user: Array.isArray(data.consented_by_user)
        ? (data.consented_by_user[0] ?? null)
        : (data.consented_by_user ?? null),
    };

    return success(entry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ENTRIES - LIST (with optional filters)
// ============================================================

export async function listNccdEntries(
  filter: ListNccdEntriesInput = {},
): Promise<ActionResponse<NccdEntryWithStudent[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NCCD);
    const supabase = await createSupabaseServerClient();

    const parsed = listNccdEntriesSchema.safeParse(filter);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("nccd_register_entries")
      .select(
        `*,
        student:students(id, first_name, last_name, preferred_name, photo_url, dob),
        evidence_count:nccd_evidence_items(count)`,
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (f.collection_year !== undefined)
      query = query.eq("collection_year", f.collection_year);
    if (f.disability_category !== undefined)
      query = query.eq("disability_category", f.disability_category);
    if (f.adjustment_level !== undefined)
      query = query.eq("adjustment_level", f.adjustment_level);
    if (f.status !== undefined) query = query.eq("status", f.status);
    if (f.submitted !== undefined)
      query = query.eq("submitted_to_collection", f.submitted);

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const entries: NccdEntryWithStudent[] = (data ?? [])
      .map((row) => {
        const evidenceArr = Array.isArray(row.evidence_count)
          ? row.evidence_count
          : [];
        const count =
          typeof evidenceArr[0] === "object" &&
          evidenceArr[0] !== null &&
          "count" in evidenceArr[0]
            ? Number((evidenceArr[0] as { count: number }).count)
            : 0;
        const studentRaw = Array.isArray(row.student)
          ? row.student[0]
          : row.student;

        // Filter by name search client-side (Supabase doesn't support cross-join ilike easily)
        if (f.search && studentRaw) {
          const name =
            `${studentRaw.first_name} ${studentRaw.last_name}`.toLowerCase();
          if (!name.includes(f.search.toLowerCase())) return null;
        }

        return {
          ...(decryptNccdRecord(row) as NccdRegisterEntry),
          student: studentRaw,
          evidence_count: count,
        } as NccdEntryWithStudent;
      })
      .filter((e): e is NccdEntryWithStudent => e !== null);

    return success(entries);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EVIDENCE - ADD
// ============================================================

export async function addNccdEvidence(
  input: AddNccdEvidenceInput,
): Promise<ActionResponse<NccdEvidenceItem>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const parsed = addNccdEvidenceSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Fetch entry to get student_id and verify tenant
    const { data: entry, error: entryError } = await supabase
      .from("nccd_register_entries")
      .select("id, student_id, tenant_id")
      .eq("id", v.entry_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (entryError || !entry) {
      return failure("NCCD entry not found", ErrorCodes.NOT_FOUND);
    }

    const { data, error } = await supabase
      .from("nccd_evidence_items")
      .insert({
        tenant_id: context.tenant.id,
        entry_id: v.entry_id,
        student_id: entry.student_id,
        evidence_type: v.evidence_type,
        description: v.description,
        observation_id: v.observation_id || null,
        ilp_evidence_id: v.ilp_evidence_id || null,
        document_url: v.document_url || null,
        document_name: v.document_name || null,
        evidence_date: v.evidence_date || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to add evidence",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.NCCD_EVIDENCE_ADDED,
      entityType: "nccd_evidence_item",
      entityId: data.id,
      metadata: {
        entry_id: v.entry_id,
        evidence_type: v.evidence_type,
      },
    });

    return success(data as NccdEvidenceItem);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EVIDENCE - DELETE
// ============================================================

export async function deleteNccdEvidence(
  evidenceId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("nccd_evidence_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", evidenceId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    await logAudit({
      context,
      action: AuditActions.NCCD_EVIDENCE_REMOVED,
      entityType: "nccd_evidence_item",
      entityId: evidenceId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COLLECTION - SUBMIT
// ============================================================

export async function submitNccdCollection(
  input: SubmitNccdCollectionInput,
): Promise<ActionResponse<{ submitted_count: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_NCCD);
    const supabase = await createSupabaseServerClient();

    const parsed = submitNccdCollectionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .update({
        submitted_to_collection: true,
        collection_submitted_at: now,
        collection_submitted_by: context.user.id,
        updated_by: context.user.id,
      })
      .in("id", v.entry_ids)
      .eq("tenant_id", context.tenant.id)
      .eq("collection_year", v.collection_year)
      .is("deleted_at", null)
      .select("id");

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    const submittedCount = data?.length ?? 0;

    await logAudit({
      context,
      action: AuditActions.NCCD_COLLECTION_SUBMITTED,
      entityType: "nccd_collection",
      entityId: `${v.collection_year}`,
      metadata: {
        collection_year: v.collection_year,
        submitted_count: submittedCount,
      },
    });

    return success({ submitted_count: submittedCount });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD DATA
// ============================================================

export async function getNccdDashboard(): Promise<
  ActionResponse<NccdDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_NCCD);
    const supabase = await createSupabaseServerClient();

    const currentYear = currentNccdYear();
    const priorYear = currentYear - 1;

    // Fetch entries for current + prior year with student info
    const { data: allEntries, error } = await supabase
      .from("nccd_register_entries")
      .select(
        `*,
        student:students(id, first_name, last_name, preferred_name, photo_url, dob),
        evidence_count:nccd_evidence_items(count)`,
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .in("collection_year", [currentYear, priorYear])
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const entries = (allEntries ?? []).map((row) => {
      const evidenceArr = Array.isArray(row.evidence_count)
        ? row.evidence_count
        : [];
      const count =
        typeof evidenceArr[0] === "object" &&
        evidenceArr[0] !== null &&
        "count" in evidenceArr[0]
          ? Number((evidenceArr[0] as { count: number }).count)
          : 0;
      return {
        ...(row as NccdRegisterEntry),
        student: Array.isArray(row.student) ? row.student[0] : row.student,
        evidence_count: count,
      } as NccdEntryWithStudent;
    });

    const currentEntries = entries.filter(
      (e) => e.collection_year === currentYear,
    );
    const priorEntries = entries.filter((e) => e.collection_year === priorYear);

    const buildSummary = (
      yearEntries: NccdEntryWithStudent[],
      year: number,
    ): NccdCollectionSummary => {
      const byLevel: Record<NccdAdjustmentLevel, number> = {
        qdtp: 0,
        supplementary: 0,
        substantial: 0,
        extensive: 0,
      };
      const byCategory: Record<NccdDisabilityCategory, number> = {
        physical: 0,
        cognitive: 0,
        sensory_hearing: 0,
        sensory_vision: 0,
        social_emotional: 0,
      };
      for (const e of yearEntries) {
        byLevel[e.adjustment_level] = (byLevel[e.adjustment_level] ?? 0) + 1;
        byCategory[e.disability_category] =
          (byCategory[e.disability_category] ?? 0) + 1;
      }
      const submitted = yearEntries.filter(
        (e) => e.submitted_to_collection,
      ).length;
      return {
        year,
        total_students: yearEntries.length,
        submitted,
        pending_submission: yearEntries.length - submitted,
        by_level: byLevel,
        by_category: byCategory,
      };
    };

    return success({
      current_year: currentYear,
      collection_summary: buildSummary(currentEntries, currentYear),
      prior_year_summary:
        priorEntries.length > 0 ? buildSummary(priorEntries, priorYear) : null,
      entries_requiring_review: currentEntries.filter(
        (e) => e.status === "under_review",
      ),
      entries_missing_consent: currentEntries.filter(
        (e) => !e.parental_consent_given && e.status === "active",
      ),
      entries_missing_professional_opinion: currentEntries.filter(
        (e) => !e.professional_opinion && e.status === "active",
      ),
      recent_entries: currentEntries.slice(0, 5),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT - CSV for annual NCCD collection
// ============================================================

export async function exportNccdCollection(
  collectionYear: number,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NCCD);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .select(
        `*,
        student:students(id, first_name, last_name, preferred_name, dob, gender)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("collection_year", collectionYear)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const rows = (data ?? []).map((row) => {
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      return {
        last_name: student?.last_name ?? "",
        first_name: student?.first_name ?? "",
        preferred_name: student?.preferred_name ?? "",
        dob: student?.dob ?? "",
        gender: student?.gender ?? "",
        collection_year: row.collection_year,
        disability_category: row.disability_category,
        disability_subcategory: row.disability_subcategory ?? "",
        adjustment_level: row.adjustment_level,
        adjustment_types: (row.adjustment_types as string[]).join("|"),
        funding_source: row.funding_source ?? "",
        funding_reference: row.funding_reference ?? "",
        professional_opinion: row.professional_opinion ? "Yes" : "No",
        parental_consent: row.parental_consent_given ? "Yes" : "No",
        submitted: row.submitted_to_collection ? "Yes" : "No",
      };
    });

    const headers = Object.keys(rows[0] ?? {}).join(",");
    const csvRows = rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers, ...csvRows].join("\n");

    await logAudit({
      context,
      action: AuditActions.NCCD_COLLECTION_EXPORTED,
      entityType: "nccd_collection",
      entityId: `${collectionYear}`,
      metadata: { collection_year: collectionYear, row_count: rows.length },
    });

    return success(csv);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STUDENT - GET ENTRY FOR YEAR (for student profile integration)
// ============================================================

export async function getStudentNccdEntry(
  studentId: string,
  collectionYear?: number,
): Promise<ActionResponse<NccdEntryWithDetails | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_NCCD);
    const supabase = await createSupabaseServerClient();

    const year = collectionYear ?? currentNccdYear();

    const { data, error } = await supabase
      .from("nccd_register_entries")
      .select(
        `*,
        student:students(
          id, first_name, last_name, preferred_name, photo_url, dob, enrollment_status
        ),
        evidence:nccd_evidence_items(
          id, tenant_id, entry_id, student_id, evidence_type, description,
          observation_id, ilp_evidence_id, document_url, document_name,
          evidence_date, created_by, created_at, deleted_at
        ),
        ilp:individual_learning_plans(id, plan_status, plan_title),
        consented_by_user:users!parental_consent_by(id, first_name, last_name)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("collection_year", year)
      .is("deleted_at", null)
      .is("evidence.deleted_at", null)
      .maybeSingle();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!data) return success(null);

    const decrypted2 = decryptNccdRecord(data);
    const entry: NccdEntryWithDetails = {
      ...(decrypted2 as NccdRegisterEntry),
      student: Array.isArray(data.student) ? data.student[0] : data.student,
      evidence: (data.evidence as NccdEvidenceItem[]) ?? [],
      ilp: Array.isArray(data.ilp)
        ? data.ilp[0]
          ? {
              id: data.ilp[0].id,
              status: data.ilp[0].plan_status,
              plan_name: data.ilp[0].plan_title,
            }
          : null
        : data.ilp
          ? {
              id: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).id,
              status: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).plan_status,
              plan_name: (
                data.ilp as {
                  id: string;
                  plan_status: string;
                  plan_title: string;
                }
              ).plan_title,
            }
          : null,
      consented_by_user: Array.isArray(data.consented_by_user)
        ? (data.consented_by_user[0] ?? null)
        : (data.consented_by_user ?? null),
    };

    return success(entry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
