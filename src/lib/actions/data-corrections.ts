"use server";

// src/lib/actions/data-corrections.ts
//
// ============================================================
// WattleOS V2 - Data Correction Workflow (Prompt 48 / APP 13)
// ============================================================
// APP 13 (Australian Privacy Principles) requires mechanisms
// for correcting personal information within 30 days of request.
//
// CRITICAL fields that route through this approval workflow:
//   students: first_name, last_name, dob, medicare_number, crn
//   medical_conditions: condition_name, severity, details
//
// Non-critical fields (notes, address, demographics) can be
// edited directly — those changes appear in audit_logs only.
//
// FLOW:
//   1. Any authenticated staff member calls requestCorrection()
//   2. An admin/owner reviews via approveCorrection() or rejectCorrection()
//   3. On approval, applyCorrection() writes the change to the DB
//      and logs it to audit_logs with sensitivity='high'
//
// Values are encrypted at rest using encryptField()/decryptField()
// to match the existing encryption pattern in sms-gateway.ts.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { decryptField, encryptField } from "@/lib/utils/encryption";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface DataCorrection {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string | null;     // Decrypted display value
  new_value: string;            // Decrypted display value
  requested_by: string;
  requested_at: string;
  reason: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  applied_at: string | null;
}

export interface RequestCorrectionInput {
  entity_type: "student" | "medical_condition";
  entity_id: string;
  field_name: string;
  new_value: string;
  reason: string;
}

// Fields that require the approval workflow
const CRITICAL_FIELDS: Record<string, string[]> = {
  student: ["first_name", "last_name", "dob", "medicare_number", "crn", "usi"],
  medical_condition: ["condition_name", "severity", "details", "treatment_plan"],
};

export function isCriticalField(entityType: string, fieldName: string): boolean {
  return (CRITICAL_FIELDS[entityType] ?? []).includes(fieldName);
}

// ============================================================
// REQUEST: Submit a correction request
// ============================================================

export async function requestCorrection(
  input: RequestCorrectionInput,
): Promise<ActionResponse<DataCorrection>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    if (!input.reason.trim()) {
      return failure("Reason is required for correction requests.", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isCriticalField(input.entity_type, input.field_name)) {
      return failure(
        `Field '${input.field_name}' on '${input.entity_type}' does not require a correction request — edit it directly.`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch current value for the old_value record
    let oldValueRaw: string | null = null;
    if (input.entity_type === "student") {
      const { data } = await supabase
        .from("students")
        .select(input.field_name as "first_name")
        .eq("id", input.entity_id)
        .eq("tenant_id", context.tenant.id)
        .single();
      oldValueRaw = data ? String((data as Record<string, unknown>)[input.field_name] ?? "") : null;
    } else if (input.entity_type === "medical_condition") {
      const { data } = await supabase
        .from("medical_conditions")
        .select(input.field_name as "condition_name")
        .eq("id", input.entity_id)
        .eq("tenant_id", context.tenant.id)
        .single();
      oldValueRaw = data ? String((data as Record<string, unknown>)[input.field_name] ?? "") : null;
    }

    // Encrypt both values at rest
    const encryptedOld = oldValueRaw ? encryptField(oldValueRaw) : null;
    const encryptedNew = encryptField(input.new_value.trim());

    const { data, error } = await supabase
      .from("data_corrections")
      .insert({
        tenant_id: context.tenant.id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        field_name: input.field_name,
        old_value: encryptedOld,
        new_value: encryptedNew,
        requested_by: context.user.id,
        reason: input.reason.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DATA_CORRECTION_REQUESTED,
      entityType: input.entity_type,
      entityId: input.entity_id,
      metadata: {
        _sensitivity: "high",
        field_name: input.field_name,
        reason: input.reason,
        correction_id: data.id,
      },
    });

    return success(deserializeCorrection(data));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to submit correction request",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST: Pending corrections for review
// ============================================================

export async function listPendingCorrections(): Promise<
  ActionResponse<DataCorrection[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_STUDENTS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("data_corrections")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []).map(deserializeCorrection));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list corrections",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST: Correction history for an entity
// ============================================================

export async function listEntityCorrections(
  entityType: string,
  entityId: string,
): Promise<ActionResponse<DataCorrection[]>> {
  try {
    await requirePermission(Permissions.MANAGE_STUDENTS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("data_corrections")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("requested_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []).map(deserializeCorrection));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list corrections",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// APPROVE: Approve and apply a correction
// ============================================================
// Requires manage_students permission. Applies the change
// directly to the entity table and marks the correction applied.
// ============================================================

export async function approveCorrection(
  correctionId: string,
  reviewNotes?: string,
): Promise<ActionResponse<DataCorrection>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const admin = createSupabaseAdminClient();

    // Fetch the correction
    const { data: correction, error: fetchError } = await admin
      .from("data_corrections")
      .select("*")
      .eq("id", correctionId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !correction) {
      return failure("Correction request not found or already reviewed.", ErrorCodes.NOT_FOUND);
    }

    const now = new Date().toISOString();

    // Decrypt the new value
    const newValue = decryptField(correction.new_value);

    // Apply the change to the target table
    const applyError = await applyFieldChange(
      admin,
      correction.entity_type,
      correction.entity_id,
      context.tenant.id,
      correction.field_name,
      newValue,
    );

    if (applyError) {
      return failure(`Failed to apply correction: ${applyError}`, ErrorCodes.DATABASE_ERROR);
    }

    // Mark correction as approved and applied
    const { data: updated, error: updateError } = await admin
      .from("data_corrections")
      .update({
        status: "approved",
        reviewed_by: context.user.id,
        reviewed_at: now,
        review_notes: reviewNotes ?? null,
        applied_at: now,
      })
      .eq("id", correctionId)
      .select()
      .single();

    if (updateError) return failure(updateError.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DATA_CORRECTION_APPROVED,
      entityType: correction.entity_type,
      entityId: correction.entity_id,
      metadata: {
        _sensitivity: "high",
        correction_id: correctionId,
        field_name: correction.field_name,
        review_notes: reviewNotes ?? null,
      },
    });

    return success(deserializeCorrection(updated));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to approve correction",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// REJECT: Reject a correction request
// ============================================================

export async function rejectCorrection(
  correctionId: string,
  reviewNotes: string,
): Promise<ActionResponse<DataCorrection>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const admin = createSupabaseAdminClient();

    if (!reviewNotes.trim()) {
      return failure("Review notes are required when rejecting a correction.", ErrorCodes.VALIDATION_ERROR);
    }

    const { data: correction, error: fetchError } = await admin
      .from("data_corrections")
      .select("entity_type, entity_id, field_name")
      .eq("id", correctionId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "pending")
      .single();

    if (fetchError || !correction) {
      return failure("Correction request not found or already reviewed.", ErrorCodes.NOT_FOUND);
    }

    const { data: updated, error } = await admin
      .from("data_corrections")
      .update({
        status: "rejected",
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim(),
      })
      .eq("id", correctionId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DATA_CORRECTION_REJECTED,
      entityType: correction.entity_type,
      entityId: correction.entity_id,
      metadata: {
        _sensitivity: "high",
        correction_id: correctionId,
        field_name: correction.field_name,
        review_notes: reviewNotes,
      },
    });

    return success(deserializeCorrection(updated));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to reject correction",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Internal helpers
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function applyFieldChange(
  admin: AdminClient,
  entityType: string,
  entityId: string,
  tenantId: string,
  fieldName: string,
  newValue: string,
): Promise<string | null> {
  const tableMap: Record<string, string> = {
    student: "students",
    medical_condition: "medical_conditions",
  };

  const table = tableMap[entityType];
  if (!table) return `Unknown entity type: ${entityType}`;

  const { error } = await admin
    .from(table as "students")
    .update({ [fieldName]: newValue, updated_at: new Date().toISOString() })
    .eq("id", entityId)
    .eq("tenant_id", tenantId);

  return error ? error.message : null;
}

// Deserialize DB row → DataCorrection (decrypts values for display)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeCorrection(row: Record<string, any>): DataCorrection {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    field_name: row.field_name,
    old_value: row.old_value ? decryptField(row.old_value) : null,
    new_value: decryptField(row.new_value),
    requested_by: row.requested_by,
    requested_at: row.requested_at,
    reason: row.reason,
    status: row.status as CorrectionStatus,
    reviewed_by: row.reviewed_by ?? null,
    reviewed_at: row.reviewed_at ?? null,
    review_notes: row.review_notes ?? null,
    applied_at: row.applied_at ?? null,
  };
}
