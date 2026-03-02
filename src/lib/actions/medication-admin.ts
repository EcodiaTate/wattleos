"use server";

// src/lib/actions/medication-admin.ts
//
// ============================================================
// WattleOS V2 - Module B: Medication Administration (Reg 93/94)
// ============================================================
// Regulation 93 requires services to have a medical conditions
// policy and ensure medical management plans are on file for
// every child with a diagnosed condition.
//
// Regulation 94 requires a written record of every medication
// administration including: medication name, dose, route,
// time administered, who administered, who witnessed, and
// whether the parent was notified.
//
// Medical management plans must be reviewed at least annually
// (ASCIA plans: annually or sooner if condition changes).
//
// Administration records are IMMUTABLE once created - they
// form part of the legal compliance record and cannot be
// edited or deleted.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ActionResponse,
  ErrorCodes,
  PaginatedResponse,
  failure,
  paginated,
  paginatedFailure,
  success,
} from "@/types/api";
import type {
  MedicalManagementPlan,
  MedicalManagementPlanWithStudent,
  MedicationAuthorisation,
  MedicationAuthorisationWithStudent,
  MedicationAdministration,
  MedicationAdministrationWithDetails,
  StudentMedicationSummary,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  createMedicalPlanSchema,
  updateMedicalPlanSchema,
  createMedicationAuthorisationSchema,
  recordMedicationAdministrationSchema,
  validate,
} from "@/lib/validations";

// ============================================================
// ─── MEDICAL MANAGEMENT PLANS ──────────────────────────────
// ============================================================

// ── CREATE PLAN ─────────────────────────────────────────────

export async function createMedicalPlan(
  input: unknown,
): Promise<ActionResponse<MedicalManagementPlan>> {
  try {
    const parsed = validate(createMedicalPlanSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medical_management_plans")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        plan_type: v.plan_type,
        condition_name: v.condition_name,
        document_url: v.document_url,
        expiry_date: v.expiry_date,
        review_due_date: v.review_due_date,
        notes: v.notes,
        is_active: true,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_PLAN_CREATED,
      entityType: "medical_management_plan",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        plan_type: v.plan_type,
        condition_name: v.condition_name,
      },
    });

    return success(data as MedicalManagementPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── UPDATE PLAN ─────────────────────────────────────────────

export async function updateMedicalPlan(
  planId: string,
  input: unknown,
): Promise<ActionResponse<MedicalManagementPlan>> {
  try {
    const parsed = validate(updateMedicalPlanSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (v.plan_type !== undefined) updateData.plan_type = v.plan_type;
    if (v.condition_name !== undefined)
      updateData.condition_name = v.condition_name;
    if (v.document_url !== undefined) updateData.document_url = v.document_url;
    if (v.expiry_date !== undefined) updateData.expiry_date = v.expiry_date;
    if (v.review_due_date !== undefined)
      updateData.review_due_date = v.review_due_date;
    if (v.is_active !== undefined) updateData.is_active = v.is_active;
    if (v.notes !== undefined) updateData.notes = v.notes;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("medical_management_plans")
      .update(updateData)
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);
    if (!data) return failure("Plan not found", ErrorCodes.PLAN_NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_PLAN_UPDATED,
      entityType: "medical_management_plan",
      entityId: planId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as MedicalManagementPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── MARK PLAN REVIEWED ──────────────────────────────────────
// Annual review is mandatory for ASCIA plans. This updates the
// review date and optionally extends the expiry.

export async function markPlanReviewed(
  planId: string,
  newExpiryDate?: string | null,
  newReviewDueDate?: string | null,
): Promise<ActionResponse<MedicalManagementPlan>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {
      last_reviewed_at: new Date().toISOString().split("T")[0],
      reviewed_by: context.user.id,
    };
    if (newExpiryDate) updateData.expiry_date = newExpiryDate;
    if (newReviewDueDate) updateData.review_due_date = newReviewDueDate;

    const { data, error } = await supabase
      .from("medical_management_plans")
      .update(updateData)
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);
    if (!data) return failure("Plan not found", ErrorCodes.PLAN_NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_PLAN_UPDATED,
      entityType: "medical_management_plan",
      entityId: planId,
      metadata: { action: "reviewed", new_expiry: newExpiryDate },
    });

    return success(data as MedicalManagementPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── DEACTIVATE PLAN (soft delete) ───────────────────────────

export async function deactivateMedicalPlan(
  planId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("medical_management_plans")
      .select("student_id, plan_type, condition_name")
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return failure("Plan not found", ErrorCodes.PLAN_NOT_FOUND);

    const { error } = await supabase
      .from("medical_management_plans")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_PLAN_UPDATED,
      entityType: "medical_management_plan",
      entityId: planId,
      metadata: {
        action: "deactivated",
        student_id: existing.student_id,
        plan_type: existing.plan_type,
        condition_name: existing.condition_name,
      },
    });

    return success({ id: planId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── GET PLAN ────────────────────────────────────────────────

export async function getMedicalPlan(
  planId: string,
): Promise<ActionResponse<MedicalManagementPlanWithStudent>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medical_management_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("id", planId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.PLAN_NOT_FOUND);
    if (!data) return failure("Plan not found", ErrorCodes.PLAN_NOT_FOUND);

    return success(data as unknown as MedicalManagementPlanWithStudent);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── LIST PLANS FOR A STUDENT ────────────────────────────────

export async function listPlansForStudent(
  studentId: string,
  activeOnly: boolean = true,
): Promise<ActionResponse<MedicalManagementPlan[]>> {
  try {
    await requirePermission(Permissions.VIEW_MEDICATION_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("medical_management_plans")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as MedicalManagementPlan[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── LIST ALL PLANS (dashboard) ──────────────────────────────

export async function listAllPlans(
  filter: { active_only?: boolean; expiring_within_days?: number } = {},
): Promise<ActionResponse<MedicalManagementPlanWithStudent[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("medical_management_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (filter.active_only !== false) {
      query = query.eq("is_active", true);
    }

    if (filter.expiring_within_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filter.expiring_within_days);
      query = query.lte("expiry_date", cutoff.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success(
      (data ?? []) as unknown as MedicalManagementPlanWithStudent[],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ─── MEDICATION AUTHORISATIONS ─────────────────────────────
// ============================================================

// ── CREATE AUTHORISATION ────────────────────────────────────

export async function createMedicationAuthorisation(
  input: unknown,
): Promise<ActionResponse<MedicationAuthorisation>> {
  try {
    const parsed = validate(createMedicationAuthorisationSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medication_authorisations")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        medication_name: v.medication_name,
        dose: v.dose,
        route: v.route,
        frequency: v.frequency,
        reason: v.reason,
        authorised_by_user_id: v.authorised_by_user_id,
        authorised_by_name: v.authorised_by_name,
        authorisation_date: v.authorisation_date,
        valid_from: v.valid_from,
        valid_until: v.valid_until,
        storage_instructions: v.storage_instructions,
        is_active: true,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_AUTHORISATION_CREATED,
      entityType: "medication_authorisation",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        medication_name: v.medication_name,
        dose: v.dose,
        route: v.route,
        authorised_by: v.authorised_by_name,
      },
    });

    return success(data as MedicationAuthorisation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── DEACTIVATE AUTHORISATION ────────────────────────────────

export async function deactivateMedicationAuthorisation(
  authorisationId: string,
): Promise<ActionResponse<MedicationAuthorisation>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medication_authorisations")
      .update({ is_active: false })
      .eq("id", authorisationId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);
    if (!data)
      return failure(
        "Authorisation not found",
        ErrorCodes.AUTHORISATION_NOT_FOUND,
      );

    await logAudit({
      context,
      action: AuditActions.MEDICATION_AUTHORISATION_CREATED, // reuse - only created action exists
      entityType: "medication_authorisation",
      entityId: authorisationId,
      metadata: {
        action: "deactivated",
        medication_name: data.medication_name,
      },
    });

    return success(data as MedicationAuthorisation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── GET AUTHORISATION ───────────────────────────────────────

export async function getMedicationAuthorisation(
  authorisationId: string,
): Promise<ActionResponse<MedicationAuthorisationWithStudent>> {
  try {
    await requirePermission(Permissions.VIEW_MEDICATION_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medication_authorisations")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("id", authorisationId)
      .is("deleted_at", null)
      .single();

    if (error)
      return failure(error.message, ErrorCodes.AUTHORISATION_NOT_FOUND);
    if (!data)
      return failure(
        "Authorisation not found",
        ErrorCodes.AUTHORISATION_NOT_FOUND,
      );

    return success(data as unknown as MedicationAuthorisationWithStudent);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── LIST AUTHORISATIONS FOR A STUDENT ───────────────────────

export async function listAuthorisationsForStudent(
  studentId: string,
  activeOnly: boolean = true,
): Promise<ActionResponse<MedicationAuthorisation[]>> {
  try {
    await requirePermission(Permissions.VIEW_MEDICATION_RECORDS);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("medication_authorisations")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as MedicationAuthorisation[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ─── MEDICATION ADMINISTRATIONS ────────────────────────────
// ============================================================
// Immutable records. Once created, they cannot be updated or
// deleted. This is a legal requirement under Reg 94.
// ============================================================

// ── RECORD ADMINISTRATION ───────────────────────────────────

export async function recordMedicationAdministration(
  input: unknown,
): Promise<ActionResponse<MedicationAdministration>> {
  try {
    const parsed = validate(recordMedicationAdministrationSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await requirePermission(Permissions.ADMINISTER_MEDICATION);
    const supabase = await createSupabaseServerClient();

    // If authorisation_id provided, validate it's active and belongs to this student
    if (v.authorisation_id) {
      const { data: auth } = await supabase
        .from("medication_authorisations")
        .select("id, is_active, valid_until, student_id")
        .eq("id", v.authorisation_id)
        .is("deleted_at", null)
        .single();

      if (!auth) {
        return failure(
          "Authorisation not found",
          ErrorCodes.AUTHORISATION_NOT_FOUND,
        );
      }
      if (!auth.is_active) {
        return failure(
          "Authorisation is no longer active",
          ErrorCodes.AUTHORISATION_INACTIVE,
        );
      }
      if (auth.student_id !== v.student_id) {
        return failure(
          "Authorisation does not match the selected student",
          ErrorCodes.VALIDATION_ERROR,
        );
      }
      if (auth.valid_until) {
        const today = new Date().toISOString().split("T")[0];
        if (auth.valid_until < today) {
          return failure(
            "Authorisation has expired",
            ErrorCodes.AUTHORISATION_EXPIRED,
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("medication_administrations")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        authorisation_id: v.authorisation_id,
        administered_at: v.administered_at,
        medication_name: v.medication_name,
        dose_given: v.dose_given,
        route: v.route,
        administrator_id: context.user.id,
        witness_id: v.witness_id,
        parent_notified: v.parent_notified,
        parent_notified_at: v.parent_notified ? new Date().toISOString() : null,
        child_response: v.child_response,
        notes: v.notes,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.MEDICATION_ADMINISTERED,
      entityType: "medication_administration",
      entityId: data.id,
      metadata: {
        student_id: v.student_id,
        medication_name: v.medication_name,
        dose_given: v.dose_given,
        route: v.route,
        witness_id: v.witness_id,
        parent_notified: v.parent_notified,
      },
    });

    return success(data as MedicationAdministration);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── GET ADMINISTRATION ──────────────────────────────────────

export async function getMedicationAdministration(
  administrationId: string,
): Promise<ActionResponse<MedicationAdministrationWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_MEDICATION_RECORDS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medication_administrations")
      .select("*")
      .eq("id", administrationId)
      .single();

    if (error || !data)
      return failure("Administration record not found", ErrorCodes.NOT_FOUND);

    // Resolve related entities
    const { data: student } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("id", data.student_id)
      .single();

    const { data: administrator } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("id", data.administrator_id)
      .single();

    let witness = null;
    if (data.witness_id) {
      const { data: w } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("id", data.witness_id)
        .single();
      witness = w;
    }

    return success({
      ...data,
      student: student!,
      administrator: administrator!,
      witness,
    } as MedicationAdministrationWithDetails);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── LIST ADMINISTRATIONS FOR A STUDENT ──────────────────────

export async function listAdministrationsForStudent(
  studentId: string,
  options: { page?: number; per_page?: number } = {},
): Promise<PaginatedResponse<MedicationAdministration>> {
  try {
    await requirePermission(Permissions.VIEW_MEDICATION_RECORDS);
    const supabase = await createSupabaseServerClient();

    const page = options.page ?? 1;
    const perPage = options.per_page ?? 25;
    const offset = (page - 1) * perPage;

    const { data, error, count } = await supabase
      .from("medication_administrations")
      .select("*", { count: "exact" })
      .eq("student_id", studentId)
      .order("administered_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      data as MedicationAdministration[],
      count ?? 0,
      page,
      perPage,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── LIST TODAY'S ADMINISTRATIONS (dashboard) ────────────────

export async function listTodayAdministrations(): Promise<
  ActionResponse<MedicationAdministrationWithDetails[]>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("medication_administrations")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .gte("administered_at", todayStart.toISOString())
      .order("administered_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    if (!data || data.length === 0) {
      return success([]);
    }

    // Resolve student names + staff in bulk
    const studentIds = [...new Set(data.map((d) => d.student_id))];
    const staffIds = [
      ...new Set([
        ...data.map((d) => d.administrator_id),
        ...data.filter((d) => d.witness_id).map((d) => d.witness_id!),
      ]),
    ];

    const [{ data: students }, { data: staffUsers }] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name")
        .in("id", studentIds),
      supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", staffIds),
    ]);

    const studentMap = new Map((students ?? []).map((s) => [s.id, s]));
    const staffMap = new Map((staffUsers ?? []).map((s) => [s.id, s]));

    const enriched = data.map((admin) => ({
      ...admin,
      student: studentMap.get(admin.student_id) ?? {
        id: admin.student_id,
        first_name: "?",
        last_name: "?",
        preferred_name: null,
      },
      administrator: staffMap.get(admin.administrator_id) ?? {
        id: admin.administrator_id,
        first_name: "?",
        last_name: "?",
      },
      witness: admin.witness_id
        ? (staffMap.get(admin.witness_id) ?? null)
        : null,
    }));

    return success(enriched as MedicationAdministrationWithDetails[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ─── MEDICATION REGISTER (paginated, filtered) ─────────────
// ============================================================
// Full register of all administrations across the service.
// Filterable by student, medication name, date range.
// Used for regulatory reporting and parent access.
// ============================================================

export interface MedicationRegisterFilter {
  student_id?: string;
  medication_name?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

export async function listMedicationRegister(
  filter: MedicationRegisterFilter = {},
): Promise<PaginatedResponse<MedicationAdministrationWithDetails>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 25;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("medication_administrations")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .order("administered_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (filter.student_id) query = query.eq("student_id", filter.student_id);
    if (filter.medication_name)
      query = query.ilike("medication_name", `%${filter.medication_name}%`);
    if (filter.from_date)
      query = query.gte("administered_at", filter.from_date);
    if (filter.to_date) query = query.lte("administered_at", filter.to_date);

    const { data, error, count } = await query;

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    if (!data || data.length === 0) {
      return paginated([], count ?? 0, page, perPage);
    }

    // Bulk resolve
    const studentIds = [...new Set(data.map((d) => d.student_id))];
    const staffIds = [
      ...new Set([
        ...data.map((d) => d.administrator_id),
        ...data.filter((d) => d.witness_id).map((d) => d.witness_id!),
      ]),
    ];

    const [{ data: students }, { data: staffUsers }] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name")
        .in("id", studentIds),
      supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", staffIds),
    ]);

    const studentMap = new Map((students ?? []).map((s) => [s.id, s]));
    const staffMap = new Map((staffUsers ?? []).map((s) => [s.id, s]));

    const enriched = data.map((admin) => ({
      ...admin,
      student: studentMap.get(admin.student_id) ?? {
        id: admin.student_id,
        first_name: "?",
        last_name: "?",
        preferred_name: null,
      },
      administrator: staffMap.get(admin.administrator_id) ?? {
        id: admin.administrator_id,
        first_name: "?",
        last_name: "?",
      },
      witness: admin.witness_id
        ? (staffMap.get(admin.witness_id) ?? null)
        : null,
    }));

    return paginated(
      enriched as MedicationAdministrationWithDetails[],
      count ?? 0,
      page,
      perPage,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ─── DASHBOARD QUERIES ─────────────────────────────────────
// ============================================================

// ── STUDENTS WITH ACTIVE PLANS (summary for dashboard) ──────

export async function getStudentsWithActivePlans(): Promise<
  ActionResponse<StudentMedicationSummary[]>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    // Get all active plans with student info
    const { data: plans, error: plansError } = await supabase
      .from("medical_management_plans")
      .select(
        "student_id, expiry_date, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (plansError)
      return failure(plansError.message, ErrorCodes.DATABASE_ERROR);

    // Get active authorisations count per student
    const { data: auths, error: authsError } = await supabase
      .from("medication_authorisations")
      .select("student_id")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (authsError)
      return failure(authsError.message, ErrorCodes.DATABASE_ERROR);

    // Get latest administration per student
    const { data: admins } = await supabase
      .from("medication_administrations")
      .select("student_id, administered_at")
      .eq("tenant_id", context.tenant.id)
      .order("administered_at", { ascending: false });

    // Build summary map
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const cutoffDate = thirtyDaysFromNow.toISOString().split("T")[0];

    const summaryMap = new Map<string, StudentMedicationSummary>();

    for (const plan of plans ?? []) {
      const student = (plan as Record<string, unknown>).student as {
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
        photo_url: string | null;
      } | null;
      if (!student) continue;

      const existing = summaryMap.get(plan.student_id) ?? {
        student,
        active_plans: 0,
        active_authorisations: 0,
        expiring_plans: 0,
        last_administration_at: null,
      };

      existing.active_plans++;
      if (plan.expiry_date && plan.expiry_date <= cutoffDate) {
        existing.expiring_plans++;
      }

      summaryMap.set(plan.student_id, existing);
    }

    // Count authorisations
    for (const auth of auths ?? []) {
      const existing = summaryMap.get(auth.student_id);
      if (existing) existing.active_authorisations++;
    }

    // Latest administration
    const latestAdminMap = new Map<string, string>();
    for (const admin of admins ?? []) {
      if (!latestAdminMap.has(admin.student_id)) {
        latestAdminMap.set(admin.student_id, admin.administered_at);
      }
    }
    for (const [studentId, summary] of summaryMap) {
      summary.last_administration_at = latestAdminMap.get(studentId) ?? null;
    }

    const results = Array.from(summaryMap.values()).sort((a, b) =>
      a.student.last_name.localeCompare(b.student.last_name),
    );

    return success(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── EXPIRING PLANS ALERT ────────────────────────────────────
// Plans expiring within the next 30 days. Surfaced as a
// prominent alert on the medication dashboard.

export async function getExpiringPlans(
  withinDays: number = 30,
): Promise<ActionResponse<MedicalManagementPlanWithStudent[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("medical_management_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .gte("expiry_date", today)
      .lte("expiry_date", cutoffDate)
      .order("expiry_date", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success(
      (data ?? []) as unknown as MedicalManagementPlanWithStudent[],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ── EXPIRED PLANS (already past due) ────────────────────────

export async function getExpiredPlans(): Promise<
  ActionResponse<MedicalManagementPlanWithStudent[]>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_MEDICATION_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("medical_management_plans")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .lt("expiry_date", today)
      .order("expiry_date", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success(
      (data ?? []) as unknown as MedicalManagementPlanWithStudent[],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SEND MEDICATION EXPIRY ALERT (for cron job)
// ============================================================
// Creates a high-priority announcement for all medication
// admins listing plans expiring within the next 30 days.
// Called daily by the cron job at /api/cron/medication-expiry-check.
// Also callable manually from the medication dashboard.
// ============================================================

interface MedicationAlertResult {
  plans_flagged: number;
  alert_sent: boolean;
}

export async function sendMedicationExpiryAlert(
  withinDays: number = 30,
): Promise<ActionResponse<MedicationAlertResult>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    // Query expiring plans directly (avoids calling another server action)
    const { data: plans, error: plansError } = await supabase
      .from("medical_management_plans")
      .select(
        "id, plan_type, expiry_date, student:students(first_name, last_name)",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .gte("expiry_date", today)
      .lte("expiry_date", cutoffDate)
      .order("expiry_date", { ascending: true });

    if (plansError)
      return failure(plansError.message, ErrorCodes.DATABASE_ERROR);

    const expiringPlans = plans ?? [];

    if (expiringPlans.length === 0) {
      return success({ plans_flagged: 0, alert_sent: false });
    }

    // Build announcement lines
    const lines = expiringPlans.map((plan) => {
      const studentRaw = plan.student as unknown;
      const studentArr = Array.isArray(studentRaw)
        ? (studentRaw as Array<{ first_name: string; last_name: string }>)
        : null;
      const student = studentArr ? studentArr[0] : null;
      const studentName = student
        ? `${student.first_name} ${student.last_name}`
        : "Unknown child";
      const daysLeft = Math.ceil(
        (new Date(plan.expiry_date as string).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return `- **${studentName}** (${plan.plan_type}): expires ${plan.expiry_date} - ${daysLeft <= 0 ? "EXPIRED" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}`;
    });

    const body = [
      `**Medication Plan Expiry Alert**`,
      ``,
      `${expiringPlans.length} medical management plan${expiringPlans.length !== 1 ? "s" : ""} require${expiringPlans.length === 1 ? "s" : ""} renewal (within ${withinDays} days):`,
      ``,
      ...lines,
      ``,
      `View the [Medication Dashboard](/medication) to update plans before they expire.`,
      ``,
      `Expired plans (Reg 93) must be renewed before medication can be administered.`,
    ].join("\n");

    const { error: announceError } = await supabase
      .from("announcements")
      .insert({
        tenant_id: tenantId,
        author_id: context.user.id,
        title: `Medication Plans: ${expiringPlans.length} expiring within ${withinDays} days`,
        body,
        audience: "staff",
        priority: "urgent",
        is_published: true,
        published_at: new Date().toISOString(),
      });

    if (announceError) {
      return failure(
        `Plans identified but announcement failed: ${announceError.message}`,
        ErrorCodes.DATABASE_ERROR,
      );
    }

    return success({ plans_flagged: expiringPlans.length, alert_sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SEND MEDICATION PLAN REVIEW ALERT (for cron job)
// ============================================================
// Creates a high-priority announcement for all medication
// admins listing medical plans whose annual review is due
// within the next 7 days.
//
// Deduplicates: skips plans that already have an alert sent
// within the past 7 days to avoid daily spam.
//
// Called daily by /api/cron/medication-plan-review-check.
// ============================================================

interface MedicationReviewAlertResult {
  plans_checked: number;
  plans_flagged: number;
  alert_sent: boolean;
}

export async function sendMedicationPlanReviewAlert(
  withinDays: number = 7,
): Promise<ActionResponse<MedicationReviewAlertResult>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_MEDICATION_PLANS,
    );
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    // Plans with review due within the window
    const { data: plans, error: plansError } = await supabase
      .from("medical_management_plans")
      .select(
        "id, plan_type, review_due_date, student:students(first_name, last_name)",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .not("review_due_date", "is", null)
      .gte("review_due_date", today)
      .lte("review_due_date", cutoffDate)
      .order("review_due_date", { ascending: true });

    if (plansError)
      return failure(plansError.message, ErrorCodes.DATABASE_ERROR);

    const duePlans = plans ?? [];

    if (duePlans.length === 0) {
      return success({ plans_checked: 0, plans_flagged: 0, alert_sent: false });
    }

    // Deduplicate: find plan IDs already alerted within the past 7 days
    const planIds = duePlans.map((p) => p.id);
    const dedupeWindow = new Date();
    dedupeWindow.setDate(dedupeWindow.getDate() - withinDays);

    const { data: recentAlerts } = await supabase
      .from("medication_plan_review_alerts")
      .select("medication_plan_id")
      .eq("tenant_id", tenantId)
      .in("medication_plan_id", planIds)
      .gte("alert_sent_at", dedupeWindow.toISOString())
      .is("deleted_at", null);

    const alreadyAlerted = new Set(
      (recentAlerts ?? []).map((a) => a.medication_plan_id as string),
    );

    const newPlans = duePlans.filter(
      (p) => !alreadyAlerted.has(p.id as string),
    );

    if (newPlans.length === 0) {
      return success({
        plans_checked: duePlans.length,
        plans_flagged: 0,
        alert_sent: false,
      });
    }

    // Build announcement
    const lines = newPlans.map((plan) => {
      const studentRaw = plan.student as unknown;
      const studentArr = Array.isArray(studentRaw)
        ? (studentRaw as Array<{ first_name: string; last_name: string }>)
        : null;
      const student = studentArr ? studentArr[0] : null;
      const studentName = student
        ? `${student.first_name} ${student.last_name}`
        : "Unknown child";
      const daysUntil = Math.ceil(
        (new Date(plan.review_due_date as string).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      return `- **${studentName}** (${plan.plan_type}): review due ${plan.review_due_date} - ${daysUntil <= 0 ? "OVERDUE" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`;
    });

    const body = [
      `**Medical Plan Annual Review Alert**`,
      ``,
      `${newPlans.length} medical management plan${newPlans.length !== 1 ? "s" : ""} require${newPlans.length === 1 ? "s" : ""} annual review within ${withinDays} days:`,
      ``,
      ...lines,
      ``,
      `View the [Medication Dashboard](/medication) to complete reviews.`,
      ``,
      `Annual reviews are required by Reg 93 and ASCIA/APAP guidelines.`,
    ].join("\n");

    const now = new Date().toISOString();

    const { error: announceError } = await supabase
      .from("announcements")
      .insert({
        tenant_id: tenantId,
        author_id: context.user.id,
        title: `Medical Plans: ${newPlans.length} annual review${newPlans.length !== 1 ? "s" : ""} due within ${withinDays} days`,
        body,
        audience: "staff",
        priority: "urgent",
        is_published: true,
        published_at: now,
      });

    if (announceError) {
      return failure(
        `Plans identified but announcement failed: ${announceError.message}`,
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Record alert log rows to prevent duplicate sends next run
    const alertRows = newPlans.map((plan) => ({
      tenant_id: tenantId,
      medication_plan_id: plan.id as string,
      review_due_date: plan.review_due_date as string,
      alert_sent_at: now,
      alert_recipients: [{ user_id: context.user.id, method: "announcement" }],
    }));

    const { error: logError } = await supabase
      .from("medication_plan_review_alerts")
      .insert(alertRows);

    if (logError) {
      // Alert was sent - don't fail the whole action, just log
      console.error(
        "[sendMedicationPlanReviewAlert] Failed to write alert log:",
        logError.message,
      );
    }

    return success({
      plans_checked: duePlans.length,
      plans_flagged: newPlans.length,
      alert_sent: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
