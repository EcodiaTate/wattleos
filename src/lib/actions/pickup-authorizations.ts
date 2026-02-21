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
import {
  createPickupAuthorizationSchema,
  updatePickupAuthorizationSchema,
  validate,
} from "@/lib/validations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import type { PickupAuthorization } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Input Types (kept for backward-compat re-exports)
// ============================================================

export type { CreatePickupAuthorizationInput } from "@/lib/validations";
export type { UpdatePickupAuthorizationInput } from "@/lib/validations";

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
  input: unknown,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    const parsed = validate(createPickupAuthorizationSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pickup_authorizations")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.studentId,
        authorized_name: v.authorizedName,
        relationship: v.relationship ?? null,
        phone: v.phone ?? null,
        photo_url: v.photoUrl ?? null,
        is_permanent: v.isPermanent,
        valid_from: v.validFrom ?? null,
        valid_until: v.validUntil ?? null,
        authorized_by: context.user.id,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.PICKUP_AUTHORIZED,
      entityType: "pickup_authorization",
      entityId: (data as PickupAuthorization).id,
      metadata: {
        student_id: v.studentId,
        authorized_name: v.authorizedName,
        is_permanent: v.isPermanent,
      },
    });

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
  input: unknown,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    const parsed = validate(updatePickupAuthorizationSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updates: Record<string, unknown> = {};
    if (v.authorizedName !== undefined)
      updates.authorized_name = v.authorizedName;
    if (v.relationship !== undefined)
      updates.relationship = v.relationship ?? null;
    if (v.phone !== undefined) updates.phone = v.phone ?? null;
    if (v.photoUrl !== undefined)
      updates.photo_url = v.photoUrl ?? null;
    if (v.isPermanent !== undefined)
      updates.is_permanent = v.isPermanent;
    if (v.validFrom !== undefined) updates.valid_from = v.validFrom;
    if (v.validUntil !== undefined) updates.valid_until = v.validUntil;

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

    await logAudit({
      context,
      action: AuditActions.PICKUP_AUTHORIZED,
      entityType: "pickup_authorization",
      entityId: id,
      metadata: { updated_fields: Object.keys(updates) },
    });

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
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch before delete for audit trail
    const { data: existing } = await supabase
      .from("pickup_authorizations")
      .select("student_id, authorized_name")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    const { error } = await supabase
      .from("pickup_authorizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (existing) {
      await logAudit({
        context,
        action: AuditActions.PICKUP_REVOKED,
        entityType: "pickup_authorization",
        entityId: id,
        metadata: {
          student_id: existing.student_id,
          authorized_name: existing.authorized_name,
        },
      });
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