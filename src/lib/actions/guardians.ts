"use server";

// ============================================================
// WattleOS V2 - Guardian Server Actions
// ============================================================
// Links users (parents/carers) to students.
// Manages consent flags and pickup authorization.
//
// Fix: createGuardian now calls getTenantContext() for tenant_id.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { Guardian, GuardianWithUser } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateGuardianInput {
  user_id: string;
  student_id: string;
  relationship: string;
  is_primary?: boolean;
  is_emergency_contact?: boolean;
  pickup_authorized?: boolean;
  phone?: string | null;
  media_consent?: boolean;
  directory_consent?: boolean;
}

export interface UpdateGuardianInput {
  relationship?: string;
  is_primary?: boolean;
  is_emergency_contact?: boolean;
  pickup_authorized?: boolean;
  phone?: string | null;
  media_consent?: boolean;
  directory_consent?: boolean;
}

// ============================================================
// LIST GUARDIANS FOR A STUDENT
// ============================================================

export async function listGuardians(
  studentId: string,
): Promise<ActionResponse<GuardianWithUser[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("guardians")
      .select("*, user:users(id, email, first_name, last_name, avatar_url)")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as GuardianWithUser[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list guardians";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LINK GUARDIAN TO STUDENT
// ============================================================

export async function createGuardian(
  input: CreateGuardianInput,
): Promise<ActionResponse<Guardian>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.user_id) return failure("User is required", "VALIDATION_ERROR");
    if (!input.student_id)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.relationship?.trim())
      return failure("Relationship is required", "VALIDATION_ERROR");

    const { data, error } = await supabase
      .from("guardians")
      .insert({
        tenant_id: context.tenant.id,
        user_id: input.user_id,
        student_id: input.student_id,
        relationship: input.relationship.trim(),
        is_primary: input.is_primary ?? false,
        is_emergency_contact: input.is_emergency_contact ?? false,
        pickup_authorized: input.pickup_authorized ?? true,
        phone: input.phone?.trim() || null,
        media_consent: input.media_consent ?? false,
        directory_consent: input.directory_consent ?? false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "This user is already linked as a guardian for this student",
          "DUPLICATE",
        );
      }
      return failure(error.message, "DB_ERROR");
    }

    return success(data as Guardian);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create guardian";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// UPDATE GUARDIAN
// ============================================================

export async function updateGuardian(
  guardianId: string,
  input: UpdateGuardianInput,
): Promise<ActionResponse<Guardian>> {
  try {
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.relationship !== undefined)
      updateData.relationship = input.relationship.trim();
    if (input.is_primary !== undefined)
      updateData.is_primary = input.is_primary;
    if (input.is_emergency_contact !== undefined)
      updateData.is_emergency_contact = input.is_emergency_contact;
    if (input.pickup_authorized !== undefined)
      updateData.pickup_authorized = input.pickup_authorized;
    if (input.phone !== undefined)
      updateData.phone = input.phone?.trim() || null;
    if (input.media_consent !== undefined)
      updateData.media_consent = input.media_consent;
    if (input.directory_consent !== undefined)
      updateData.directory_consent = input.directory_consent;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("guardians")
      .update(updateData)
      .eq("id", guardianId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure("Guardian not found", "NOT_FOUND");
    }

    return success(data as Guardian);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update guardian";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// REMOVE GUARDIAN LINK (soft delete)
// ============================================================

export async function removeGuardian(
  guardianId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("guardians")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", guardianId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({ id: guardianId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove guardian";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
