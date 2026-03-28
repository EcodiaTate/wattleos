"use server";

// src/lib/actions/wellbeing.ts
//
// ============================================================
// WattleOS V2 - Wellbeing & Pastoral Care (Module P)
// ============================================================
// Server actions for all five wellbeing entities.
//
// Permission model:
//   VIEW_WELLBEING         - read flags, referrals, check-ins, pastoral
//   MANAGE_WELLBEING       - write flags, check-ins, pastoral records
//   MANAGE_REFERRALS       - write referrals
//   VIEW_COUNSELLOR_NOTES  - read case notes (restricted)
//   MANAGE_COUNSELLOR_NOTES- write case notes (restricted)
//
// All data is tenant-isolated and soft-deleted.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  success,
  type ActionResponse,
  type PaginatedResponse,
} from "@/types/api";
import type {
  WellbeingFlag,
  WellbeingFlagWithStudent,
  StudentReferral,
  StudentReferralWithStudent,
  CounsellorCaseNote,
  CounsellorCaseNoteWithStudent,
  WellbeingCheckIn,
  WellbeingCheckInWithStudent,
  PastoralCareRecord,
  PastoralCareRecordWithStudent,
  WellbeingDashboardData,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createWellbeingFlagSchema,
  updateWellbeingFlagSchema,
  listWellbeingFlagsSchema,
  createReferralSchema,
  updateReferralSchema,
  updateReferralStatusSchema,
  listReferralsSchema,
  createCaseNoteSchema,
  updateCaseNoteSchema,
  listCaseNotesSchema,
  scheduleCheckInSchema,
  completeCheckInSchema,
  rescheduleCheckInSchema,
  listCheckInsSchema,
  createPastoralRecordSchema,
  updatePastoralRecordSchema,
  listPastoralRecordsSchema,
  type ListWellbeingFlagsInput,
  type ListReferralsInput,
  type ListCaseNotesInput,
  type ListCheckInsInput,
  type ListPastoralRecordsInput,
} from "@/lib/validations/wellbeing";

// ============================================================
// Wellbeing Flags
// ============================================================

const STUDENT_USER_SELECT =
  "students!inner(id, first_name, last_name, preferred_name, dob), " +
  "created_by_user:users!created_by(id, first_name, last_name, email)";

export async function createWellbeingFlag(
  input: unknown,
): Promise<ActionResponse<WellbeingFlag>> {
  try {
    const parsed = createWellbeingFlagSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_flags")
      .insert({
        tenant_id: context.tenant.id,
        student_id: parsed.data.student_id,
        created_by: context.user.id,
        severity: parsed.data.severity,
        status: "open",
        category: parsed.data.category,
        summary: parsed.data.summary,
        context: parsed.data.context ?? null,
        assigned_to: parsed.data.assigned_to ?? null,
        assigned_at: parsed.data.assigned_to ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data)
      return failure("Failed to create flag", ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.WELLBEING_FLAG_CREATED,
      entityType: "wellbeing_flag",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        severity: parsed.data.severity,
        category: parsed.data.category,
      },
    });

    return success(data as WellbeingFlag);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateWellbeingFlag(
  flagId: string,
  input: unknown,
): Promise<ActionResponse<WellbeingFlag>> {
  try {
    const parsed = updateWellbeingFlagSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.status === "resolved" && !updateData.resolved_at) {
      updateData.resolved_at = new Date().toISOString();
    }

    if (
      parsed.data.assigned_to !== undefined &&
      parsed.data.assigned_to !== null
    ) {
      updateData.assigned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("wellbeing_flags")
      .update(updateData)
      .eq("id", flagId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Flag not found", ErrorCodes.NOT_FOUND);

    const action =
      parsed.data.status === "resolved"
        ? AuditActions.WELLBEING_FLAG_RESOLVED
        : parsed.data.assigned_to !== undefined
          ? AuditActions.WELLBEING_FLAG_ASSIGNED
          : AuditActions.WELLBEING_FLAG_UPDATED;

    await logAudit({
      context,
      action,
      entityType: "wellbeing_flag",
      entityId: flagId,
      metadata: { changes: parsed.data },
    });

    return success(data as WellbeingFlag);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteWellbeingFlag(
  flagId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("wellbeing_flags")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", flagId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.WELLBEING_FLAG_DELETED,
      entityType: "wellbeing_flag",
      entityId: flagId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getWellbeingFlag(
  flagId: string,
): Promise<ActionResponse<WellbeingFlagWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_flags")
      .select()
      .eq("id", flagId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Flag not found", ErrorCodes.NOT_FOUND);

    return success(data as unknown as WellbeingFlagWithStudent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listWellbeingFlags(
  filterInput: ListWellbeingFlagsInput,
): Promise<PaginatedResponse<WellbeingFlagWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const parsed = listWellbeingFlagsSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("wellbeing_flags")
      .select("*, students!inner(id, first_name, last_name, preferred_name)", {
        count: "exact",
      })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.severity) query = query.eq("severity", f.severity);
    if (f.status) query = query.eq("status", f.status);
    if (f.category) query = query.eq("category", f.category);

    query = query
      .order("created_at", { ascending: false })
      .range((f.page - 1) * f.per_page, f.page * f.per_page - 1);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      (data ?? []) as unknown as WellbeingFlagWithStudent[],
      count ?? 0,
      f.page,
      f.per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Student Referrals
// ============================================================

export async function createReferral(
  input: unknown,
): Promise<ActionResponse<StudentReferral>> {
  try {
    const parsed = createReferralSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_REFERRALS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_referrals")
      .insert({
        tenant_id: context.tenant.id,
        student_id: parsed.data.student_id,
        created_by: context.user.id,
        referral_type: parsed.data.referral_type,
        specialty: parsed.data.specialty,
        status: "pending",
        referred_to_name: parsed.data.referred_to_name ?? null,
        referred_to_organisation: parsed.data.referred_to_organisation ?? null,
        referral_reason: parsed.data.referral_reason,
        notes: parsed.data.notes ?? null,
        follow_up_date: parsed.data.follow_up_date ?? null,
        linked_flag_id: parsed.data.linked_flag_id ?? null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data)
      return failure("Failed to create referral", ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.REFERRAL_CREATED,
      entityType: "student_referral",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        specialty: parsed.data.specialty,
        referral_type: parsed.data.referral_type,
      },
    });

    return success(data as StudentReferral);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateReferral(
  referralId: string,
  input: unknown,
): Promise<ActionResponse<StudentReferral>> {
  try {
    const parsed = updateReferralSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_REFERRALS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_referrals")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", referralId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Referral not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.REFERRAL_UPDATED,
      entityType: "student_referral",
      entityId: referralId,
    });

    return success(data as StudentReferral);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateReferralStatus(
  referralId: string,
  input: unknown,
): Promise<ActionResponse<StudentReferral>> {
  try {
    const parsed = updateReferralStatusSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_REFERRALS);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.status === "accepted") {
      updateData.accepted_at = new Date().toISOString();
    } else if (
      parsed.data.status === "closed" ||
      parsed.data.status === "declined"
    ) {
      updateData.closed_at = new Date().toISOString();
      updateData.outcome_notes = parsed.data.outcome_notes ?? null;
    }

    const { data, error } = await supabase
      .from("student_referrals")
      .update(updateData)
      .eq("id", referralId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Referral not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.REFERRAL_STATUS_CHANGED,
      entityType: "student_referral",
      entityId: referralId,
      metadata: { new_status: parsed.data.status },
    });

    return success(data as StudentReferral);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteReferral(
  referralId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REFERRALS);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("student_referrals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", referralId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.REFERRAL_DELETED,
      entityType: "student_referral",
      entityId: referralId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getReferral(
  referralId: string,
): Promise<ActionResponse<StudentReferralWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_referrals")
      .select("*, " + STUDENT_USER_SELECT)
      .eq("id", referralId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Referral not found", ErrorCodes.NOT_FOUND);

    return success(data as unknown as StudentReferralWithStudent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listReferrals(
  filterInput: ListReferralsInput,
): Promise<PaginatedResponse<StudentReferralWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const parsed = listReferralsSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("student_referrals")
      .select("*, " + STUDENT_USER_SELECT, { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.status) query = query.eq("status", f.status);
    if (f.specialty) query = query.eq("specialty", f.specialty);
    if (f.referral_type) query = query.eq("referral_type", f.referral_type);

    query = query
      .order("created_at", { ascending: false })
      .range((f.page - 1) * f.per_page, f.page * f.per_page - 1);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      (data ?? []) as unknown as StudentReferralWithStudent[],
      count ?? 0,
      f.page,
      f.per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Counsellor Case Notes (restricted)
// ============================================================

export async function createCaseNote(
  input: unknown,
): Promise<ActionResponse<CounsellorCaseNote>> {
  try {
    const parsed = createCaseNoteSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(
      Permissions.MANAGE_COUNSELLOR_NOTES,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("counsellor_case_notes")
      .insert({
        tenant_id: context.tenant.id,
        student_id: parsed.data.student_id,
        author_id: context.user.id,
        note_type: parsed.data.note_type,
        content: parsed.data.content,
        session_date: parsed.data.session_date,
        duration_minutes: parsed.data.duration_minutes ?? null,
        linked_flag_id: parsed.data.linked_flag_id ?? null,
        linked_referral_id: parsed.data.linked_referral_id ?? null,
        is_confidential: parsed.data.is_confidential,
        follow_up_required: parsed.data.follow_up_required,
        follow_up_notes: parsed.data.follow_up_notes ?? null,
      })
      .select()
      .single();

    if (error) {
      await logAudit({
        context,
        action: AuditActions.CASE_NOTE_CREATED,
        entityType: "counsellor_case_note",
        metadata: { student_id: parsed.data.student_id, error: error.message },
        outcome: "failure",
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!data)
      return failure("Failed to create case note", ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.CASE_NOTE_CREATED,
      entityType: "counsellor_case_note",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        note_type: parsed.data.note_type,
        is_confidential: parsed.data.is_confidential,
      },
    });

    return success(data as CounsellorCaseNote);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateCaseNote(
  noteId: string,
  input: unknown,
): Promise<ActionResponse<CounsellorCaseNote>> {
  try {
    const parsed = updateCaseNoteSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(
      Permissions.MANAGE_COUNSELLOR_NOTES,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("counsellor_case_notes")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      await logAudit({
        context,
        action: AuditActions.CASE_NOTE_UPDATED,
        entityType: "counsellor_case_note",
        entityId: noteId,
        metadata: { error: error.message },
        outcome: "failure",
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!data) return failure("Case note not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.CASE_NOTE_UPDATED,
      entityType: "counsellor_case_note",
      entityId: noteId,
    });

    return success(data as CounsellorCaseNote);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteCaseNote(
  noteId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_COUNSELLOR_NOTES,
    );
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("counsellor_case_notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) {
      await logAudit({
        context,
        action: AuditActions.CASE_NOTE_DELETED,
        entityType: "counsellor_case_note",
        entityId: noteId,
        metadata: { error: error.message },
        outcome: "failure",
      });
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    await logAudit({
      context,
      action: AuditActions.CASE_NOTE_DELETED,
      entityType: "counsellor_case_note",
      entityId: noteId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getCaseNote(
  noteId: string,
): Promise<ActionResponse<CounsellorCaseNoteWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_COUNSELLOR_NOTES);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("counsellor_case_notes")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), author:users!author_id(id, first_name, last_name, email)",
      )
      .eq("id", noteId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Case note not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.CASE_NOTE_VIEWED,
      entityType: "counsellor_case_note",
      entityId: noteId,
      metadata: { student_id: (data as unknown as { student_id: string }).student_id },
    });

    return success(data as unknown as CounsellorCaseNoteWithStudent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listCaseNotes(
  filterInput: ListCaseNotesInput,
): Promise<PaginatedResponse<CounsellorCaseNoteWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_COUNSELLOR_NOTES);
    const supabase = await createSupabaseServerClient();

    const parsed = listCaseNotesSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("counsellor_case_notes")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), author:users!author_id(id, first_name, last_name, email)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.note_type) query = query.eq("note_type", f.note_type);
    if (f.follow_up_required !== null && f.follow_up_required !== undefined) {
      query = query.eq("follow_up_required", f.follow_up_required);
    }

    query = query
      .order("session_date", { ascending: false })
      .range((f.page - 1) * f.per_page, f.page * f.per_page - 1);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    // Log individual student counsellor case note access (not bulk list views)
    if (f.student_id) {
      await logAudit({
        context,
        action: AuditActions.CASE_NOTE_VIEWED,
        entityType: "student",
        entityId: f.student_id,
        metadata: { record_count: count ?? 0, page: f.page },
      });
    }

    return paginated(
      (data ?? []) as unknown as CounsellorCaseNoteWithStudent[],
      count ?? 0,
      f.page,
      f.per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Wellbeing Check-ins
// ============================================================

export async function scheduleCheckIn(
  input: unknown,
): Promise<ActionResponse<WellbeingCheckIn>> {
  try {
    const parsed = scheduleCheckInSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_check_ins")
      .insert({
        tenant_id: context.tenant.id,
        student_id: parsed.data.student_id,
        conducted_by: context.user.id,
        status: "scheduled",
        scheduled_for: parsed.data.scheduled_for,
        linked_flag_id: parsed.data.linked_flag_id ?? null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data)
      return failure("Failed to schedule check-in", ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.CHECKIN_SCHEDULED,
      entityType: "wellbeing_check_in",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        scheduled_for: parsed.data.scheduled_for,
      },
    });

    return success(data as WellbeingCheckIn);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function completeCheckIn(
  checkInId: string,
  input: unknown,
): Promise<ActionResponse<WellbeingCheckIn>> {
  try {
    const parsed = completeCheckInSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_check_ins")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        mood_rating: parsed.data.mood_rating ?? null,
        wellbeing_areas: parsed.data.wellbeing_areas ?? null,
        observations: parsed.data.observations ?? null,
        student_goals: parsed.data.student_goals ?? null,
        action_items: parsed.data.action_items ?? null,
        follow_up_date: parsed.data.follow_up_date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkInId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Check-in not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.CHECKIN_COMPLETED,
      entityType: "wellbeing_check_in",
      entityId: checkInId,
      metadata: { mood_rating: parsed.data.mood_rating },
    });

    return success(data as WellbeingCheckIn);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function rescheduleCheckIn(
  checkInId: string,
  input: unknown,
): Promise<ActionResponse<WellbeingCheckIn>> {
  try {
    const parsed = rescheduleCheckInSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_check_ins")
      .update({
        status: "rescheduled",
        scheduled_for: parsed.data.scheduled_for,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkInId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Check-in not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.CHECKIN_RESCHEDULED,
      entityType: "wellbeing_check_in",
      entityId: checkInId,
    });

    return success(data as WellbeingCheckIn);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteCheckIn(
  checkInId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("wellbeing_check_ins")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", checkInId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.CHECKIN_DELETED,
      entityType: "wellbeing_check_in",
      entityId: checkInId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getCheckIn(
  checkInId: string,
): Promise<ActionResponse<WellbeingCheckInWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("wellbeing_check_ins")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), conducted_by_user:users!conducted_by(id, first_name, last_name, email)",
      )
      .eq("id", checkInId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Check-in not found", ErrorCodes.NOT_FOUND);

    return success(data as unknown as WellbeingCheckInWithStudent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listCheckIns(
  filterInput: ListCheckInsInput,
): Promise<PaginatedResponse<WellbeingCheckInWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const parsed = listCheckInsSchema.safeParse(filterInput);
    if (!parsed.success) {
      return {
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid filter",
          code: ErrorCodes.VALIDATION_ERROR,
        },
        data: [],
        pagination: { page: 1, per_page: 25, total: 0, total_pages: 0 },
      };
    }
    const f = parsed.data;

    let query = supabase
      .from("wellbeing_check_ins")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), conducted_by_user:users!conducted_by(id, first_name, last_name, email)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.status) query = query.eq("status", f.status);
    if (f.from_date) query = query.gte("scheduled_for", f.from_date);
    if (f.to_date) query = query.lte("scheduled_for", f.to_date);

    query = query
      .order("scheduled_for", { ascending: false })
      .range((f.page - 1) * f.per_page, f.page * f.per_page - 1);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      (data ?? []) as unknown as WellbeingCheckInWithStudent[],
      count ?? 0,
      f.page,
      f.per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Pastoral Care Records
// ============================================================

export async function createPastoralRecord(
  input: unknown,
): Promise<ActionResponse<PastoralCareRecord>> {
  try {
    const parsed = createPastoralRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pastoral_care_records")
      .insert({
        tenant_id: context.tenant.id,
        student_id: parsed.data.student_id,
        recorded_by: context.user.id,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        date_of_concern: parsed.data.date_of_concern,
        parent_contacted: parsed.data.parent_contacted,
        parent_contacted_at: parsed.data.parent_contacted_at ?? null,
        parent_contact_notes: parsed.data.parent_contact_notes ?? null,
        action_taken: parsed.data.action_taken ?? null,
        linked_flag_id: parsed.data.linked_flag_id ?? null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data)
      return failure(
        "Failed to create pastoral record",
        ErrorCodes.CREATE_FAILED,
      );

    await logAudit({
      context,
      action: AuditActions.PASTORAL_RECORD_CREATED,
      entityType: "pastoral_care_record",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        category: parsed.data.category,
      },
    });

    return success(data as PastoralCareRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updatePastoralRecord(
  recordId: string,
  input: unknown,
): Promise<ActionResponse<PastoralCareRecord>> {
  try {
    const parsed = updatePastoralRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pastoral_care_records")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Record not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.PASTORAL_RECORD_UPDATED,
      entityType: "pastoral_care_record",
      entityId: recordId,
    });

    return success(data as PastoralCareRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deletePastoralRecord(
  recordId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("pastoral_care_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PASTORAL_RECORD_DELETED,
      entityType: "pastoral_care_record",
      entityId: recordId,
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getPastoralRecord(
  recordId: string,
): Promise<ActionResponse<PastoralCareRecordWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pastoral_care_records")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), recorded_by_user:users!recorded_by(id, first_name, last_name, email)",
      )
      .eq("id", recordId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Record not found", ErrorCodes.NOT_FOUND);

    return success(data as unknown as PastoralCareRecordWithStudent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listPastoralRecords(
  filterInput: ListPastoralRecordsInput,
): Promise<PaginatedResponse<PastoralCareRecordWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();

    const parsed = listPastoralRecordsSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("pastoral_care_records")
      .select(
        "*, students!inner(id, first_name, last_name, preferred_name, dob), recorded_by_user:users!recorded_by(id, first_name, last_name, email)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.category) query = query.eq("category", f.category);
    if (f.parent_contacted !== null && f.parent_contacted !== undefined) {
      query = query.eq("parent_contacted", f.parent_contacted);
    }

    query = query
      .order("date_of_concern", { ascending: false })
      .range((f.page - 1) * f.per_page, f.page * f.per_page - 1);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      (data ?? []) as unknown as PastoralCareRecordWithStudent[],
      count ?? 0,
      f.page,
      f.per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Dashboard
// ============================================================

export async function getWellbeingDashboard(): Promise<
  ActionResponse<WellbeingDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_WELLBEING);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const withStudent =
      "*, students!inner(id, first_name, last_name, preferred_name, dob), created_by_user:users!created_by(id, first_name, last_name, email), assigned_to_user:users!assigned_to(id, first_name, last_name, email)";

    const [flagsRes, referralsRes, checkInsRes, pastoralRes] =
      await Promise.all([
        supabase
          .from("wellbeing_flags")
          .select(withStudent)
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .in("status", ["open", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("student_referrals")
          .select(
            "*, students!inner(id, first_name, last_name, preferred_name, dob), created_by_user:users!created_by(id, first_name, last_name, email)",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .in("status", ["pending", "accepted", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(20),

        supabase
          .from("wellbeing_check_ins")
          .select(
            "*, students!inner(id, first_name, last_name, preferred_name, dob), conducted_by_user:users!conducted_by(id, first_name, last_name, email)",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .eq("status", "scheduled")
          .gte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(10),

        supabase
          .from("pastoral_care_records")
          .select(
            "*, students!inner(id, first_name, last_name, preferred_name, dob), recorded_by_user:users!recorded_by(id, first_name, last_name, email)",
          )
          .eq("tenant_id", tenantId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const allFlags = (flagsRes.data ??
      []) as unknown as WellbeingFlagWithStudent[];

    const criticalFlags = allFlags.filter((f) => f.severity === "critical");
    const openFlagCount = allFlags.length;

    const flagsBySeverity = {
      low: allFlags.filter((f) => f.severity === "low").length,
      medium: allFlags.filter((f) => f.severity === "medium").length,
      high: allFlags.filter((f) => f.severity === "high").length,
      critical: allFlags.filter((f) => f.severity === "critical").length,
    };

    const categoryKeys = [
      "behaviour",
      "emotional",
      "social",
      "family",
      "health",
      "academic",
      "other",
    ] as const;
    const flagsByCategory = Object.fromEntries(
      categoryKeys.map((cat) => [
        cat,
        allFlags.filter((f) => f.category === cat).length,
      ]),
    ) as Record<(typeof categoryKeys)[number], number>;

    const uniqueStudentIds = new Set(allFlags.map((f) => f.student_id));

    return success({
      open_flags: openFlagCount,
      critical_flags: criticalFlags,
      active_referrals: (referralsRes.data ??
        []) as unknown as StudentReferralWithStudent[],
      upcoming_check_ins: (checkInsRes.data ??
        []) as unknown as WellbeingCheckInWithStudent[],
      recent_pastoral_records: (pastoralRes.data ??
        []) as unknown as PastoralCareRecordWithStudent[],
      flags_by_severity: flagsBySeverity,
      flags_by_category: flagsByCategory,
      students_with_open_flags: uniqueStudentIds.size,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
