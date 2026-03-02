"use server";

// src/lib/actions/previous-school-records.ts
//
// ============================================================
// WattleOS V2 - Previous School Records
// (Backlog: Student Information > Prior school records)
// ============================================================
// Manages a child's prior schooling history: school name,
// enrollment dates, year levels, key contacts, and transfer
// document references.  Supports multiple records per student.
//
// Permissions:
//   VIEW_PREVIOUS_SCHOOL_RECORDS   - list + read records
//   MANAGE_PREVIOUS_SCHOOL_RECORDS - create, update, delete
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type ActionResponse,
  type PaginatedResponse,
  ErrorCodes,
  failure,
  success,
  paginated,
  paginatedFailure,
} from "@/types/api";
import type {
  PreviousSchoolRecord,
  PreviousSchoolRecordWithStudent,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createPreviousSchoolRecordSchema,
  type CreatePreviousSchoolRecordInput,
  updatePreviousSchoolRecordSchema,
  type UpdatePreviousSchoolRecordInput,
  listPreviousSchoolRecordsFilterSchema,
  type ListPreviousSchoolRecordsFilter,
} from "@/lib/validations/previous-school-records";

// ── Shared select string ──────────────────────────────────────

const RECORD_FIELDS =
  "id, tenant_id, student_id, school_name, school_type, suburb, state, country, start_date, end_date, year_levels, principal_name, contact_phone, contact_email, reason_for_leaving, transfer_document_url, notes, recorded_by, created_at, updated_at, deleted_at";

const RECORD_WITH_STUDENT = `${RECORD_FIELDS}, students!inner(id, first_name, last_name, dob)`;

// ============================================================
// READ: Records for a specific student
// ============================================================

export async function getPreviousSchoolRecords(
  studentId: string,
): Promise<ActionResponse<PreviousSchoolRecord[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("previous_school_records")
      .select(RECORD_FIELDS)
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as PreviousSchoolRecord[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Single record by ID
// ============================================================

export async function getPreviousSchoolRecord(
  recordId: string,
): Promise<ActionResponse<PreviousSchoolRecord | null>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("previous_school_records")
      .select(RECORD_FIELDS)
      .eq("tenant_id", context.tenant.id)
      .eq("id", recordId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as PreviousSchoolRecord | null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Paginated list (all students, for admin/export view)
// ============================================================

export async function listPreviousSchoolRecords(
  filterInput: ListPreviousSchoolRecordsFilter,
): Promise<PaginatedResponse<PreviousSchoolRecordWithStudent>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = listPreviousSchoolRecordsFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const filter = parsed.data;

    let query = supabase
      .from("previous_school_records")
      .select(RECORD_WITH_STUDENT, { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (filter.student_id) {
      query = query.eq("student_id", filter.student_id);
    }

    if (filter.search) {
      query = query.or(`school_name.ilike.%${filter.search}%`);
    }

    const from = (filter.page - 1) * filter.perPage;
    const to = from + filter.perPage - 1;

    const { data, error, count } = await query
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const records: PreviousSchoolRecordWithStudent[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        return {
          ...rest,
          student: students,
        } as unknown as PreviousSchoolRecordWithStudent;
      },
    );

    return paginated(records, count ?? 0, filter.page, filter.perPage);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Create record
// ============================================================

export async function createPreviousSchoolRecord(
  input: CreatePreviousSchoolRecordInput,
): Promise<ActionResponse<PreviousSchoolRecord>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = createPreviousSchoolRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Validation failed",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const d = parsed.data;

    const { data, error } = await supabase
      .from("previous_school_records")
      .insert({
        tenant_id: context.tenant.id,
        student_id: d.student_id,
        school_name: d.school_name,
        school_type: d.school_type ?? null,
        suburb: d.suburb ?? null,
        state: d.state ?? null,
        country: d.country,
        start_date: d.start_date ?? null,
        end_date: d.end_date ?? null,
        year_levels: d.year_levels ?? null,
        principal_name: d.principal_name ?? null,
        contact_phone: d.contact_phone ?? null,
        contact_email: d.contact_email ?? null,
        reason_for_leaving: d.reason_for_leaving ?? null,
        transfer_document_url: d.transfer_document_url ?? null,
        notes: d.notes ?? null,
        recorded_by: context.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(RECORD_FIELDS)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PREVIOUS_SCHOOL_RECORD_CREATED,
      entityType: "student",
      entityId: d.student_id,
      metadata: { record_id: data.id, school_name: d.school_name },
    });

    return success(data as PreviousSchoolRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Update record
// ============================================================

export async function updatePreviousSchoolRecord(
  recordId: string,
  input: UpdatePreviousSchoolRecordInput,
): Promise<ActionResponse<PreviousSchoolRecord>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = updatePreviousSchoolRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Validation failed",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const d = parsed.data;

    const { data, error } = await supabase
      .from("previous_school_records")
      .update({
        ...(d.school_name !== undefined && { school_name: d.school_name }),
        ...(d.school_type !== undefined && {
          school_type: d.school_type ?? null,
        }),
        ...(d.suburb !== undefined && { suburb: d.suburb ?? null }),
        ...(d.state !== undefined && { state: d.state ?? null }),
        ...(d.country !== undefined && { country: d.country }),
        ...(d.start_date !== undefined && { start_date: d.start_date ?? null }),
        ...(d.end_date !== undefined && { end_date: d.end_date ?? null }),
        ...(d.year_levels !== undefined && {
          year_levels: d.year_levels ?? null,
        }),
        ...(d.principal_name !== undefined && {
          principal_name: d.principal_name ?? null,
        }),
        ...(d.contact_phone !== undefined && {
          contact_phone: d.contact_phone ?? null,
        }),
        ...(d.contact_email !== undefined && {
          contact_email: d.contact_email ?? null,
        }),
        ...(d.reason_for_leaving !== undefined && {
          reason_for_leaving: d.reason_for_leaving ?? null,
        }),
        ...(d.transfer_document_url !== undefined && {
          transfer_document_url: d.transfer_document_url ?? null,
        }),
        ...(d.notes !== undefined && { notes: d.notes ?? null }),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", recordId)
      .is("deleted_at", null)
      .select(RECORD_FIELDS)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PREVIOUS_SCHOOL_RECORD_UPDATED,
      entityType: "student",
      entityId: data.student_id,
      metadata: { record_id: recordId, school_name: data.school_name },
    });

    return success(data as PreviousSchoolRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Soft-delete record
// ============================================================

export async function deletePreviousSchoolRecord(
  recordId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
    );
    const supabase = await createSupabaseServerClient();

    // Fetch first to capture student_id + school_name for audit
    const { data: existing, error: fetchErr } = await supabase
      .from("previous_school_records")
      .select("id, student_id, school_name")
      .eq("tenant_id", context.tenant.id)
      .eq("id", recordId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Record not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("previous_school_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", context.tenant.id)
      .eq("id", recordId);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PREVIOUS_SCHOOL_RECORD_DELETED,
      entityType: "student",
      entityId: existing.student_id,
      metadata: { record_id: recordId, school_name: existing.school_name },
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
