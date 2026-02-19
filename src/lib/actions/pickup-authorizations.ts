// src/lib/actions/pickup-authorizations.ts
//
// ============================================================
// WattleOS V2 - Pickup Authorization Server Actions
// ============================================================
// Manages who is authorized to pick up each student.
// Separate from guardians - covers grandparents, nannies,
// family friends, etc.
//
// WHY separate file: Pickup is managed on the student detail
// page (SIS context), not the daily attendance workflow.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import type { PickupAuthorization } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreatePickupAuthorizationInput {
  studentId: string;
  authorizedName: string;
  relationship?: string;
  phone?: string;
  photoUrl?: string;
  isPermanent?: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdatePickupAuthorizationInput {
  authorizedName?: string;
  relationship?: string;
  phone?: string;
  photoUrl?: string;
  isPermanent?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

// ============================================================
// LIST: All pickup authorizations for a student
// ============================================================

export async function listPickupAuthorizations(
  studentId: string,
): Promise<ActionResponse<PickupAuthorization[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pickup_authorizations")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("is_permanent", { ascending: false })
      .order("authorized_name", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as PickupAuthorization[]);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to list pickup authorizations";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CREATE
// ============================================================

export async function createPickupAuthorization(
  input: CreatePickupAuthorizationInput,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.studentId)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.authorizedName?.trim())
      return failure("Name is required", "VALIDATION_ERROR");

    const { data, error } = await supabase
      .from("pickup_authorizations")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.studentId,
        authorized_name: input.authorizedName.trim(),
        relationship: input.relationship?.trim() || null,
        phone: input.phone?.trim() || null,
        photo_url: input.photoUrl || null,
        is_permanent: input.isPermanent ?? true,
        valid_from: input.validFrom || null,
        valid_until: input.validUntil || null,
        authorized_by: context.user.id,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as PickupAuthorization);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create pickup authorization";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// UPDATE
// ============================================================

export async function updatePickupAuthorization(
  id: string,
  input: UpdatePickupAuthorizationInput,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (input.authorizedName !== undefined)
      updates.authorized_name = input.authorizedName.trim();
    if (input.relationship !== undefined)
      updates.relationship = input.relationship?.trim() || null;
    if (input.phone !== undefined) updates.phone = input.phone?.trim() || null;
    if (input.photoUrl !== undefined)
      updates.photo_url = input.photoUrl || null;
    if (input.isPermanent !== undefined)
      updates.is_permanent = input.isPermanent;
    if (input.validFrom !== undefined) updates.valid_from = input.validFrom;
    if (input.validUntil !== undefined) updates.valid_until = input.validUntil;

    if (Object.keys(updates).length === 0) {
      return failure("No fields to update", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("pickup_authorizations")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as PickupAuthorization);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update pickup authorization";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// DELETE (soft delete)
// ============================================================

export async function deletePickupAuthorization(
  id: string,
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("pickup_authorizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success({ success: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to delete pickup authorization";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
