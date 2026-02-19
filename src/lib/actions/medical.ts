"use server";

// ============================================================
// WattleOS V2 - Medical Conditions Server Actions
// ============================================================
// Normalized medical records. Requires 'view_medical_records'
// permission (enforced by RLS). Parents can view their own
// children's records via is_guardian_of() check.
//
// Fix: createMedicalCondition now calls getTenantContext()
// for tenant_id on INSERT.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { MedicalCondition, MedicalSeverity } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateMedicalConditionInput {
  student_id: string;
  condition_type: string;
  condition_name: string;
  severity: MedicalSeverity;
  description?: string | null;
  action_plan?: string | null;
  action_plan_doc_url?: string | null;
  requires_medication?: boolean;
  medication_name?: string | null;
  medication_location?: string | null;
  expiry_date?: string | null;
}

export interface UpdateMedicalConditionInput {
  condition_type?: string;
  condition_name?: string;
  severity?: MedicalSeverity;
  description?: string | null;
  action_plan?: string | null;
  action_plan_doc_url?: string | null;
  requires_medication?: boolean;
  medication_name?: string | null;
  medication_location?: string | null;
  expiry_date?: string | null;
}

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
  input: CreateMedicalConditionInput,
): Promise<ActionResponse<MedicalCondition>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.student_id)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.condition_type?.trim())
      return failure("Condition type is required", "VALIDATION_ERROR");
    if (!input.condition_name?.trim())
      return failure("Condition name is required", "VALIDATION_ERROR");
    if (!input.severity)
      return failure("Severity is required", "VALIDATION_ERROR");

    const { data, error } = await supabase
      .from("medical_conditions")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        condition_type: input.condition_type.trim(),
        condition_name: input.condition_name.trim(),
        severity: input.severity,
        description: input.description?.trim() || null,
        action_plan: input.action_plan?.trim() || null,
        action_plan_doc_url: input.action_plan_doc_url || null,
        requires_medication: input.requires_medication ?? false,
        medication_name: input.medication_name?.trim() || null,
        medication_location: input.medication_location?.trim() || null,
        expiry_date: input.expiry_date || null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

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
  input: UpdateMedicalConditionInput,
): Promise<ActionResponse<MedicalCondition>> {
  try {
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.condition_type !== undefined)
      updateData.condition_type = input.condition_type.trim();
    if (input.condition_name !== undefined)
      updateData.condition_name = input.condition_name.trim();
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.description !== undefined)
      updateData.description = input.description?.trim() || null;
    if (input.action_plan !== undefined)
      updateData.action_plan = input.action_plan?.trim() || null;
    if (input.action_plan_doc_url !== undefined)
      updateData.action_plan_doc_url = input.action_plan_doc_url || null;
    if (input.requires_medication !== undefined)
      updateData.requires_medication = input.requires_medication;
    if (input.medication_name !== undefined)
      updateData.medication_name = input.medication_name?.trim() || null;
    if (input.medication_location !== undefined)
      updateData.medication_location =
        input.medication_location?.trim() || null;
    if (input.expiry_date !== undefined)
      updateData.expiry_date = input.expiry_date || null;

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
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("medical_conditions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", conditionId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({ id: conditionId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete medical condition";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
