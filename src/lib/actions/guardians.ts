'use server';

// ============================================================
// WattleOS V2 - Guardian Server Actions
// ============================================================
// Links parents/carers to students. Guardians can now exist
// WITHOUT a user account - the guardian record stores email,
// first_name, last_name independently. When the parent accepts
// their invitation and creates an account, user_id is backfilled.
//
// WHY nullable user_id: Enrollment approval creates guardian
// records immediately with all the rich data from the form.
// Without this, guardian data is lost until the parent creates
// an account, breaking the "enter it once" principle.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { Guardian, GuardianWithUser } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Input Types
// ============================================================

export interface CreateGuardianInput {
  student_id: string;
  relationship: string;

  // Provide EITHER user_id (existing account) OR email + name (no account yet)
  user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;

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
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  media_consent?: boolean;
  directory_consent?: boolean;
}

// ============================================================
// LIST GUARDIANS FOR A STUDENT
// ============================================================
// Uses a left join to users - guardian.user may be null if
// the parent hasn't created an account yet.

export async function listGuardians(
  studentId: string,
): Promise<ActionResponse<GuardianWithUser[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("guardians")
      .select("*, user:users!guardians_user_id_fkey(id, email, first_name, last_name, avatar_url)")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Normalize: Supabase returns user as null when user_id is null (LEFT JOIN).
    // Ensure consistent shape for the frontend.
    const normalized: GuardianWithUser[] = (data ?? []).map((row: Record<string, unknown>) => {
      const userRaw = row.user;
      const user = Array.isArray(userRaw)
        ? (userRaw[0] ?? null)
        : (userRaw ?? null);

      return {
        ...row,
        user,
      } as GuardianWithUser;
    });

    return success(normalized);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list guardians";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LINK GUARDIAN TO STUDENT
// ============================================================
// Accepts EITHER a user_id (existing account) or email+name
// (parent hasn't created account yet). If email is provided
// without user_id, we check if a user with that email exists
// and auto-link if found.

export async function createGuardian(
  input: CreateGuardianInput,
): Promise<ActionResponse<Guardian>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.student_id) {
      return failure("Student is required", "VALIDATION_ERROR");
    }
    if (!input.relationship?.trim()) {
      return failure("Relationship is required", "VALIDATION_ERROR");
    }

    // Must have either user_id or email+name
    const hasUserId = !!input.user_id;
    const hasEmail = !!input.email?.trim();

    if (!hasUserId && !hasEmail) {
      return failure(
        "Either a user ID or an email address is required",
        "VALIDATION_ERROR",
      );
    }

    // If email provided without user_id, try to find existing user
    let resolvedUserId = input.user_id ?? null;
    const email = input.email?.trim().toLowerCase() ?? null;

    if (!resolvedUserId && email) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        resolvedUserId = existingUser.id;
      }
    }

    const { data, error } = await supabase
      .from("guardians")
      .insert({
        tenant_id: context.tenant.id,
        user_id: resolvedUserId,
        student_id: input.student_id,
        email,
        first_name: input.first_name?.trim() || null,
        last_name: input.last_name?.trim() || null,
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
          "This person is already linked as a guardian for this student",
          "DUPLICATE",
        );
      }
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.GUARDIAN_CREATED,
      entityType: "guardian",
      entityId: (data as Guardian).id,
      metadata: {
        student_id: input.student_id,
        relationship: input.relationship,
        email: email,
      },
    });

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
    const context = await getTenantContext();
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
    if (input.email !== undefined)
      updateData.email = input.email?.trim().toLowerCase() || null;
    if (input.first_name !== undefined)
      updateData.first_name = input.first_name?.trim() || null;
    if (input.last_name !== undefined)
      updateData.last_name = input.last_name?.trim() || null;
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

    await logAudit({
      context,
      action: AuditActions.GUARDIAN_UPDATED,
      entityType: "guardian",
      entityId: guardianId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

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
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch before delete for audit trail
    const { data: existing } = await supabase
      .from("guardians")
      .select("student_id, email, first_name, last_name, relationship")
      .eq("id", guardianId)
      .is("deleted_at", null)
      .single();

    const { error } = await supabase
      .from("guardians")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", guardianId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (existing) {
      await logAudit({
        context,
        action: AuditActions.GUARDIAN_REMOVED,
        entityType: "guardian",
        entityId: guardianId,
        metadata: {
          student_id: existing.student_id,
          email: existing.email,
          name: `${existing.first_name ?? ""} ${existing.last_name ?? ""}`.trim(),
          relationship: existing.relationship,
        },
      });
    }

    return success({ id: guardianId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove guardian";
    return failure(message, "UNEXPECTED_ERROR");
  }
}