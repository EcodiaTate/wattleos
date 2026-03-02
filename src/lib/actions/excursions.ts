"use server";

// src/lib/actions/excursions.ts
//
// ============================================================
// WattleOS V2 - Excursion Server Actions (Reg 100-102)
// ============================================================
// Manages the full lifecycle of off-site excursions:
//   Planning → Risk Assessment → Consent Collection →
//   Departure → Headcounts → Return
//
// KEY REGULATIONS:
//   Reg 100: Risk assessment before excursion
//   Reg 101: Informed consent from parents
//   Reg 102: Headcount at regular intervals + on departure/return
//
// AUDIT: All mutations are logged for regulatory compliance.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  Excursion,
  ExcursionRiskAssessment,
  ExcursionConsent,
  ExcursionHeadcount,
  ExcursionStatus,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  createExcursionSchema,
  updateExcursionSchema,
  riskAssessmentSchema,
  consentResponseSchema,
  headcountSchema,
  type CreateExcursionInput,
  type UpdateExcursionInput,
  type RiskAssessmentInput,
  type ConsentResponseInput,
  type HeadcountInput,
} from "@/lib/validations/excursions";

// ============================================================
// COMPOSITE TYPES
// ============================================================

export interface ExcursionWithDetails extends Excursion {
  risk_assessment: ExcursionRiskAssessment | null;
  consents: ExcursionConsent[];
  headcounts: ExcursionHeadcount[];
}

// ============================================================
// CREATE EXCURSION
// ============================================================

export async function createExcursion(
  input: CreateExcursionInput,
): Promise<ActionResponse<Excursion>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const parsed = createExcursionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("excursions")
      .insert({
        tenant_id: context.tenant.id,
        name: v.name,
        description: v.description ?? null,
        excursion_date: v.excursion_date,
        destination: v.destination,
        transport_type: v.transport_type,
        departure_time: v.departure_time ?? null,
        return_time: v.return_time ?? null,
        supervising_educator_ids: v.supervising_educator_ids,
        attending_student_ids: v.attending_student_ids,
        is_regular: v.is_regular,
        regular_review_due: v.regular_review_due,
        status: "planning",
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create excursion",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Auto-create consent rows for each attending student
    if (v.attending_student_ids.length > 0) {
      const consentRows = v.attending_student_ids.map((studentId) => ({
        tenant_id: context.tenant.id,
        excursion_id: data.id,
        student_id: studentId,
        consent_status: "pending",
      }));

      await supabase.from("excursion_consents").insert(consentRows);
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_CREATED,
      entityType: "excursion",
      entityId: data.id,
      metadata: {
        name: v.name,
        destination: v.destination,
        date: v.excursion_date,
        student_count: v.attending_student_ids.length,
        educator_count: v.supervising_educator_ids.length,
      },
    });

    return success(data as Excursion);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE EXCURSION
// ============================================================

export async function updateExcursion(
  id: string,
  input: UpdateExcursionInput,
): Promise<ActionResponse<Excursion>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateExcursionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Only allow edits while in planning stage
    const { data: existing } = await supabase
      .from("excursions")
      .select("status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Excursion not found", ErrorCodes.NOT_FOUND);
    }

    const currentStatus = (existing as { status: string }).status;
    if (
      !["planning", "risk_assessed", "consents_pending"].includes(currentStatus)
    ) {
      return failure(
        "Cannot edit an excursion that has already departed or been cancelled",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const updateData: Record<string, unknown> = {};
    const v = parsed.data;
    if (v.name !== undefined) updateData.name = v.name;
    if (v.description !== undefined)
      updateData.description = v.description ?? null;
    if (v.excursion_date !== undefined)
      updateData.excursion_date = v.excursion_date;
    if (v.destination !== undefined) updateData.destination = v.destination;
    if (v.transport_type !== undefined)
      updateData.transport_type = v.transport_type;
    if (v.departure_time !== undefined)
      updateData.departure_time = v.departure_time ?? null;
    if (v.return_time !== undefined)
      updateData.return_time = v.return_time ?? null;
    if (v.supervising_educator_ids !== undefined)
      updateData.supervising_educator_ids = v.supervising_educator_ids;
    if (v.attending_student_ids !== undefined)
      updateData.attending_student_ids = v.attending_student_ids;
    if (v.is_regular !== undefined) updateData.is_regular = v.is_regular;
    if (v.regular_review_due !== undefined)
      updateData.regular_review_due = v.regular_review_due;

    const { data, error } = await supabase
      .from("excursions")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update excursion",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_UPDATED,
      entityType: "excursion",
      entityId: id,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as Excursion);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET EXCURSION (with all related data)
// ============================================================

export async function getExcursion(
  id: string,
): Promise<ActionResponse<ExcursionWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data: excursion, error } = await supabase
      .from("excursions")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error || !excursion) {
      return failure("Excursion not found", ErrorCodes.NOT_FOUND);
    }

    // Fetch related data in parallel
    const [raResult, consentsResult, headcountsResult] = await Promise.all([
      supabase
        .from("excursion_risk_assessments")
        .select("*")
        .eq("excursion_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("excursion_consents")
        .select("*")
        .eq("excursion_id", id)
        .order("student_id"),
      supabase
        .from("excursion_headcounts")
        .select("*")
        .eq("excursion_id", id)
        .order("recorded_at", { ascending: false }),
    ]);

    return success({
      ...(excursion as Excursion),
      risk_assessment: (raResult.data as ExcursionRiskAssessment) ?? null,
      consents: (consentsResult.data ?? []) as ExcursionConsent[],
      headcounts: (headcountsResult.data ?? []) as ExcursionHeadcount[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST EXCURSIONS
// ============================================================

export async function listExcursions(filters?: {
  status?: ExcursionStatus;
  upcoming?: boolean;
}): Promise<ActionResponse<Excursion[]>> {
  try {
    await requirePermission(Permissions.VIEW_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("excursions")
      .select("*")
      .is("deleted_at", null)
      .order("excursion_date", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.upcoming) {
      query = query
        .gte("excursion_date", new Date().toISOString().split("T")[0])
        .not("status", "in", '("returned","cancelled")');
    }

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as Excursion[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// RISK ASSESSMENT
// ============================================================

export async function upsertRiskAssessment(
  input: RiskAssessmentInput,
): Promise<ActionResponse<ExcursionRiskAssessment>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const parsed = riskAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Check for existing assessment
    const { data: existing } = await supabase
      .from("excursion_risk_assessments")
      .select("id")
      .eq("excursion_id", v.excursion_id)
      .maybeSingle();

    let data;
    let error;

    if (existing) {
      // Update existing
      const result = await supabase
        .from("excursion_risk_assessments")
        .update({
          hazards: v.hazards,
          overall_risk_rating: v.overall_risk_rating,
          notes: v.notes ?? null,
        })
        .eq("id", (existing as { id: string }).id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from("excursion_risk_assessments")
        .insert({
          tenant_id: context.tenant.id,
          excursion_id: v.excursion_id,
          hazards: v.hazards,
          overall_risk_rating: v.overall_risk_rating,
          notes: v.notes ?? null,
          created_by: context.user.id,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to save risk assessment",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Advance excursion status to risk_assessed
    await supabase
      .from("excursions")
      .update({ status: "risk_assessed" })
      .eq("id", v.excursion_id)
      .eq("status", "planning");

    await logAudit({
      context,
      action: AuditActions.EXCURSION_RISK_ASSESSED,
      entityType: "excursion_risk_assessment",
      entityId: data.id,
      metadata: {
        excursion_id: v.excursion_id,
        overall_risk_rating: v.overall_risk_rating,
        hazard_count: v.hazards.length,
      },
    });

    return success(data as ExcursionRiskAssessment);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// APPROVE RISK ASSESSMENT
// ============================================================

export async function approveRiskAssessment(
  assessmentId: string,
): Promise<ActionResponse<ExcursionRiskAssessment>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursion_risk_assessments")
      .update({
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", assessmentId)
      .is("approved_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Risk assessment not found or already approved",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    // Advance excursion to consents_pending
    await supabase
      .from("excursions")
      .update({ status: "consents_pending" })
      .eq("id", (data as ExcursionRiskAssessment).excursion_id)
      .in("status", ["planning", "risk_assessed"]);

    return success(data as ExcursionRiskAssessment);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// SUBMIT CONSENT (parent action)
// ============================================================

export async function submitConsent(
  input: ConsentResponseInput,
): Promise<ActionResponse<ExcursionConsent>> {
  try {
    // Parents can submit consent - no specific permission needed beyond auth
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const parsed = consentResponseSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("excursion_consents")
      .update({
        consent_status: v.consent_status,
        consented_by: context.user.id,
        consented_by_name: `${context.user.first_name} ${context.user.last_name}`,
        consented_at: new Date().toISOString(),
        method: v.method,
        notes: v.notes ?? null,
      })
      .eq("excursion_id", v.excursion_id)
      .eq("student_id", v.student_id)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Consent record not found",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_CONSENT_SUBMITTED,
      entityType: "excursion_consent",
      entityId: data.id,
      metadata: {
        excursion_id: v.excursion_id,
        student_id: v.student_id,
        consent_status: v.consent_status,
        method: v.method,
      },
    });

    // Check if all consents are in - if so, mark as ready_to_depart
    const { data: pendingConsents } = await supabase
      .from("excursion_consents")
      .select("id")
      .eq("excursion_id", v.excursion_id)
      .eq("consent_status", "pending");

    if (!pendingConsents || pendingConsents.length === 0) {
      await supabase
        .from("excursions")
        .update({ status: "ready_to_depart" })
        .eq("id", v.excursion_id)
        .eq("status", "consents_pending");
    }

    return success(data as ExcursionConsent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET CONSENT STATUS (for a specific excursion)
// ============================================================

export async function getConsentStatus(excursionId: string): Promise<
  ActionResponse<{
    total: number;
    consented: number;
    declined: number;
    pending: number;
    consents: ExcursionConsent[];
  }>
> {
  try {
    await requirePermission(Permissions.VIEW_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursion_consents")
      .select("*")
      .eq("excursion_id", excursionId)
      .order("student_id");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const consents = (data ?? []) as ExcursionConsent[];

    return success({
      total: consents.length,
      consented: consents.filter((c) => c.consent_status === "consented")
        .length,
      declined: consents.filter((c) => c.consent_status === "declined").length,
      pending: consents.filter((c) => c.consent_status === "pending").length,
      consents,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DEPART EXCURSION
// ============================================================

export async function departExcursion(
  id: string,
): Promise<ActionResponse<Excursion>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursions")
      .update({
        status: "in_progress" as ExcursionStatus,
        departed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("status", ["ready_to_depart", "consents_pending"])
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Excursion not found or not ready to depart",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_DEPARTED,
      entityType: "excursion",
      entityId: id,
    });

    return success(data as Excursion);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// RECORD HEADCOUNT (Reg 102)
// ============================================================

export async function recordHeadcount(
  input: HeadcountInput,
): Promise<ActionResponse<ExcursionHeadcount>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const parsed = headcountSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("excursion_headcounts")
      .insert({
        tenant_id: context.tenant.id,
        excursion_id: v.excursion_id,
        recorded_at: new Date().toISOString(),
        recorded_by: context.user.id,
        student_ids_present: v.student_ids_present,
        count: v.student_ids_present.length,
        location_note: v.location_note ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to record headcount",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_HEADCOUNT_RECORDED,
      entityType: "excursion_headcount",
      entityId: data.id,
      metadata: {
        excursion_id: v.excursion_id,
        count: v.student_ids_present.length,
        location: v.location_note,
      },
    });

    return success(data as ExcursionHeadcount);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// RETURN EXCURSION
// ============================================================

export async function returnExcursion(
  id: string,
  returnNotes?: string,
): Promise<ActionResponse<Excursion>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursions")
      .update({
        status: "returned" as ExcursionStatus,
        returned_at: new Date().toISOString(),
        return_notes: returnNotes?.trim() || null,
      })
      .eq("id", id)
      .eq("status", "in_progress")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Excursion not found or not in progress",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_RETURNED,
      entityType: "excursion",
      entityId: id,
      metadata: { return_notes: returnNotes },
    });

    return success(data as Excursion);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CANCEL EXCURSION
// ============================================================

export async function cancelExcursion(
  id: string,
): Promise<ActionResponse<Excursion>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_EXCURSIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("excursions")
      .update({ status: "cancelled" as ExcursionStatus })
      .eq("id", id)
      .not("status", "in", '("in_progress","returned")')
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ??
          "Excursion not found or cannot be cancelled (already in progress/returned)",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EXCURSION_CANCELLED,
      entityType: "excursion",
      entityId: id,
    });

    return success(data as Excursion);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
