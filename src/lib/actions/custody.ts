"use server";

// ============================================================
// WattleOS V2 - Custody Restriction Server Actions
// ============================================================
// HIGH-SENSITIVITY TABLE. Tracks court orders and access
// restrictions. Only accessible by users with
// 'manage_safety_records' permission (enforced by RLS).
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import {
  createCustodyRestrictionSchema,
  updateCustodyRestrictionSchema,
  validate,
} from "@/lib/validations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { CustodyRestriction } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Input Types (kept for backward-compat re-exports)
// ============================================================

export type { CreateCustodyRestrictionInput } from "@/lib/validations";
export type { UpdateCustodyRestrictionInput } from "@/lib/validations";

// ============================================================
// LIST CUSTODY RESTRICTIONS FOR A STUDENT
// ============================================================

export async function listCustodyRestrictions(
  studentId: string,
): Promise<ActionResponse<CustodyRestriction[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("custody_restrictions")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("effective_date", { ascending: false });

    if (error) {
      // RLS will deny access if user lacks 'manage_safety_records' permission
      if (error.code === "42501" || error.message.includes("policy")) {
        return failure(
          "You do not have permission to view custody restrictions",
          "FORBIDDEN",
        );
      }
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as CustodyRestriction[]);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to list custody restrictions";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CREATE CUSTODY RESTRICTION
// ============================================================

export async function createCustodyRestriction(
  input: unknown,
): Promise<ActionResponse<CustodyRestriction>> {
  try {
    const parsed = validate(createCustodyRestrictionSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("custody_restrictions")
      .insert({
        tenant_id: context.tenant.id,
        student_id: v.student_id,
        restricted_person_name: v.restricted_person_name,
        restriction_type: v.restriction_type,
        court_order_reference: v.court_order_reference,
        court_order_doc_url: v.court_order_doc_url,
        effective_date: v.effective_date,
        expiry_date: v.expiry_date,
        notes: v.notes,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.CUSTODY_CREATED,
      entityType: "custody_restriction",
      entityId: (data as CustodyRestriction).id,
      metadata: {
        student_id: v.student_id,
        restriction_type: v.restriction_type,
        restricted_person: v.restricted_person_name,
      },
    });

    return success(data as CustodyRestriction);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create custody restriction";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// UPDATE CUSTODY RESTRICTION
// ============================================================

export async function updateCustodyRestriction(
  restrictionId: string,
  input: unknown,
): Promise<ActionResponse<CustodyRestriction>> {
  try {
    const parsed = validate(updateCustodyRestrictionSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (v.restricted_person_name !== undefined)
      updateData.restricted_person_name = v.restricted_person_name;
    if (v.restriction_type !== undefined)
      updateData.restriction_type = v.restriction_type;
    if (v.court_order_reference !== undefined)
      updateData.court_order_reference = v.court_order_reference;
    if (v.court_order_doc_url !== undefined)
      updateData.court_order_doc_url = v.court_order_doc_url;
    if (v.effective_date !== undefined)
      updateData.effective_date = v.effective_date;
    if (v.expiry_date !== undefined)
      updateData.expiry_date = v.expiry_date;
    if (v.notes !== undefined)
      updateData.notes = v.notes;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("custody_restrictions")
      .update(updateData)
      .eq("id", restrictionId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure("Custody restriction not found", "NOT_FOUND");
    }

    await logAudit({
      context,
      action: AuditActions.CUSTODY_UPDATED,
      entityType: "custody_restriction",
      entityId: restrictionId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as CustodyRestriction);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update custody restriction";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// DELETE CUSTODY RESTRICTION (soft delete)
// ============================================================

export async function deleteCustodyRestriction(
  restrictionId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch before delete for audit
    const { data: existing } = await supabase
      .from("custody_restrictions")
      .select("student_id, restricted_person_name")
      .eq("id", restrictionId)
      .is("deleted_at", null)
      .single();

    const { error } = await supabase
      .from("custody_restrictions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", restrictionId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (existing) {
      await logAudit({
        context,
        action: AuditActions.CUSTODY_DELETED,
        entityType: "custody_restriction",
        entityId: restrictionId,
        metadata: {
          student_id: existing.student_id,
          restricted_person: existing.restricted_person_name,
        },
      });
    }

    return success({ id: restrictionId });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to delete custody restriction";
    return failure(message, "UNEXPECTED_ERROR");
  }
}