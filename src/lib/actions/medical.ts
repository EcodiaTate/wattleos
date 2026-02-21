"use server";

// ============================================================
// WattleOS V2 - Medical Conditions Server Actions
// ============================================================
// Normalized medical records. Requires 'view_medical_records'
// permission (enforced by RLS). Parents can view their own
// children's records via is_guardian_of() check.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import {
  createMedicalConditionSchema,
  updateMedicalConditionSchema,
  validate,
} from "@/lib/validations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { MedicalCondition } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Input Types (kept for backward-compat re-exports)
// ============================================================

export type { CreateMedicalConditionInput } from "@/lib/validations";
export type { UpdateMedicalConditionInput } from "@/lib/validations";

// ============================================================
// LIST MEDICAL CONDITIONS FOR A STUDENT
// ============================================================

export async function listMedicalConditions(
  studentId: string,
): Promise<ActionResponse<MedicalCondition[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medical_conditions")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("severity", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as MedicalCondition[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list medical conditions";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LIST ALL STUDENTS WITH SEVERE/LIFE-THREATENING CONDITIONS
// ============================================================
// Used for the school-wide medical alerts dashboard.

export async function listCriticalMedicalConditions(): Promise<
  ActionResponse<MedicalCondition[]>
> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medical_conditions")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
      )
      .in("severity", ["severe", "life_threatening"])
      .is("deleted_at", null)
      .order("severity", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as MedicalCondition[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list critical conditions";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CREATE MEDICAL CONDITION
// ============================================================

export async function createMedicalCondition(
  input: unknown,
): Promise<ActionResponse<MedicalCondition>> {
  try {
    const parsed = validate(createMedicalConditionSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("medical_conditions")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        condition_type: v.condition_type,
        condition_name: v.condition_name,
        severity: v.severity,
        description: v.description,
        action_plan: v.action_plan,
        action_plan_doc_url: v.action_plan_doc_url,
        requires_medication: v.requires_medication,
        medication_name: v.medication_name,
        medication_location: v.medication_location,
        expiry_date: v.expiry_date,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.MEDICAL_CREATED,
      entityType: "medical_condition",
      entityId: (data as MedicalCondition).id,
      metadata: {
        student_id: v.student_id,
        condition_name: v.condition_name,
        severity: v.severity,
      },
    });

    return success(data as MedicalCondition);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create medical condition";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// UPDATE MEDICAL CONDITION
// ============================================================

export async function updateMedicalCondition(
  conditionId: string,
  input: unknown,
): Promise<ActionResponse<MedicalCondition>> {
  try {
    const parsed = validate(updateMedicalConditionSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (v.condition_type !== undefined)
      updateData.condition_type = v.condition_type;
    if (v.condition_name !== undefined)
      updateData.condition_name = v.condition_name;
    if (v.severity !== undefined) updateData.severity = v.severity;
    if (v.description !== undefined)
      updateData.description = v.description;
    if (v.action_plan !== undefined)
      updateData.action_plan = v.action_plan;
    if (v.action_plan_doc_url !== undefined)
      updateData.action_plan_doc_url = v.action_plan_doc_url;
    if (v.requires_medication !== undefined)
      updateData.requires_medication = v.requires_medication;
    if (v.medication_name !== undefined)
      updateData.medication_name = v.medication_name;
    if (v.medication_location !== undefined)
      updateData.medication_location = v.medication_location;
    if (v.expiry_date !== undefined)
      updateData.expiry_date = v.expiry_date;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("medical_conditions")
      .update(updateData)
      .eq("id", conditionId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure("Medical condition not found", "NOT_FOUND");
    }

    await logAudit({
      context,
      action: AuditActions.MEDICAL_UPDATED,
      entityType: "medical_condition",
      entityId: conditionId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as MedicalCondition);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update medical condition";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// DELETE MEDICAL CONDITION (soft delete)
// ============================================================

export async function deleteMedicalCondition(
  conditionId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch before delete for audit trail
    const { data: existing } = await supabase
      .from("medical_conditions")
      .select("student_id, condition_name, severity")
      .eq("id", conditionId)
      .is("deleted_at", null)
      .single();

    const { error } = await supabase
      .from("medical_conditions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", conditionId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (existing) {
      await logAudit({
        context,
        action: AuditActions.MEDICAL_DELETED,
        entityType: "medical_condition",
        entityId: conditionId,
        metadata: {
          student_id: existing.student_id,
          condition_name: existing.condition_name,
          severity: existing.severity,
        },
      });
    }

    return success({ id: conditionId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete medical condition";
    return failure(message, "UNEXPECTED_ERROR");
  }
}