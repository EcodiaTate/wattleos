"use server";

// src/lib/actions/immunisation.ts
//
// ============================================================
// WattleOS V2 - Module F: Immunisation Compliance
// (No Jab No Pay / No Jab No Play)
// ============================================================
// IHS record management per enrolled child: create, update,
// soft-delete, dashboard summary, and overdue AIR check alerts.
//
// Permissions:
//   VIEW_IMMUNISATION   - read records, dashboard, AIR alerts
//   MANAGE_IMMUNISATION - create, update, delete records
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
  ImmunisationDashboardData,
  ImmunisationRecord,
  ImmunisationRecordWithStudent,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createImmunisationRecordSchema,
  type CreateImmunisationRecordInput,
  updateImmunisationRecordSchema,
  type UpdateImmunisationRecordInput,
  listImmunisationFilterSchema,
  type ListImmunisationFilter,
} from "@/lib/validations/immunisation";
import { computeSupportPeriodEnd } from "@/lib/constants/immunisation-rules";

// ============================================================
// READ: Single Record
// ============================================================

export async function getImmunisationRecord(
  studentId: string,
): Promise<ActionResponse<ImmunisationRecord | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_IMMUNISATION);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("immunisation_records")
      .select(
        "id, tenant_id, student_id, ihs_date, status, document_url, support_period_start, support_period_end, next_air_check_due, exemption_noted_by, exemption_noted_at, recorded_by, notes, created_at, updated_at, deleted_at",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as ImmunisationRecord | null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Paginated List
// ============================================================

export async function listImmunisationRecords(
  filterInput: ListImmunisationFilter,
): Promise<PaginatedResponse<ImmunisationRecordWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_IMMUNISATION);
    const supabase = await createSupabaseServerClient();

    const parsed = listImmunisationFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const filter = parsed.data;

    // Build query
    let query = supabase
      .from("immunisation_records")
      .select(
        "id, tenant_id, student_id, ihs_date, status, document_url, support_period_start, support_period_end, next_air_check_due, exemption_noted_by, exemption_noted_at, recorded_by, notes, created_at, updated_at, deleted_at, students!inner(id, first_name, last_name, dob)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (filter.status) {
      query = query.eq("status", filter.status);
    }

    if (filter.search) {
      // Search by student name (first or last)
      query = query.or(
        `first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%`,
        { referencedTable: "students" },
      );
    }

    const from = (filter.page - 1) * filter.perPage;
    const to = from + filter.perPage - 1;

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    // Reshape: Supabase returns students as object, we need it as `student`
    const records: ImmunisationRecordWithStudent[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        return {
          ...rest,
          student: students,
        } as unknown as ImmunisationRecordWithStudent;
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
// READ: Dashboard Summary
// ============================================================

export async function getImmunisationDashboard(): Promise<
  ActionResponse<ImmunisationDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_IMMUNISATION);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;
    const today = new Date().toISOString().split("T")[0];

    // Count total enrolled (active) students
    const { count: totalEnrolled } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("enrollment_status", "active")
      .is("deleted_at", null);

    // Count by immunisation status
    const { data: statusCounts } = await supabase
      .from("immunisation_records")
      .select("status")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const counts = {
      up_to_date: 0,
      catch_up_schedule: 0,
      medical_exemption: 0,
      pending: 0,
    };
    for (const row of statusCounts ?? []) {
      const s = row.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    // Overdue AIR checks (next_air_check_due < today)
    const { data: overdueRaw } = await supabase
      .from("immunisation_records")
      .select(
        "id, tenant_id, student_id, ihs_date, status, document_url, support_period_start, support_period_end, next_air_check_due, exemption_noted_by, exemption_noted_at, recorded_by, notes, created_at, updated_at, deleted_at, students!inner(id, first_name, last_name, dob)",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("next_air_check_due", "is", null)
      .lt("next_air_check_due", today)
      .order("next_air_check_due", { ascending: true });

    const overdueAirChecks: ImmunisationRecordWithStudent[] = (
      overdueRaw ?? []
    ).map((row: Record<string, unknown>) => {
      const { students, ...rest } = row as Record<string, unknown> & {
        students: Record<string, unknown>;
      };
      return {
        ...rest,
        student: students,
      } as unknown as ImmunisationRecordWithStudent;
    });

    // Non-compliant: pending or catch-up (not up_to_date or exemption)
    const { data: nonCompliantRaw } = await supabase
      .from("immunisation_records")
      .select(
        "id, tenant_id, student_id, ihs_date, status, document_url, support_period_start, support_period_end, next_air_check_due, exemption_noted_by, exemption_noted_at, recorded_by, notes, created_at, updated_at, deleted_at, students!inner(id, first_name, last_name, dob)",
      )
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["pending", "catch_up_schedule"])
      .order("created_at", { ascending: true });

    const nonCompliant: ImmunisationRecordWithStudent[] = (
      nonCompliantRaw ?? []
    ).map((row: Record<string, unknown>) => {
      const { students, ...rest } = row as Record<string, unknown> & {
        students: Record<string, unknown>;
      };
      return {
        ...rest,
        student: students,
      } as unknown as ImmunisationRecordWithStudent;
    });

    return success({
      summary: {
        total_enrolled: totalEnrolled ?? 0,
        ...counts,
      },
      overdue_air_checks: overdueAirChecks,
      non_compliant: nonCompliant,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Overdue AIR Checks
// ============================================================

export async function getOverdueAirChecks(): Promise<
  ActionResponse<ImmunisationRecordWithStudent[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_IMMUNISATION);
    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("immunisation_records")
      .select(
        "id, tenant_id, student_id, ihs_date, status, document_url, support_period_start, support_period_end, next_air_check_due, exemption_noted_by, exemption_noted_at, recorded_by, notes, created_at, updated_at, deleted_at, students!inner(id, first_name, last_name, dob)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .not("next_air_check_due", "is", null)
      .lt("next_air_check_due", today)
      .order("next_air_check_due", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const records: ImmunisationRecordWithStudent[] = (data ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        return {
          ...rest,
          student: students,
        } as unknown as ImmunisationRecordWithStudent;
      },
    );

    return success(records);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Create Record
// ============================================================

export async function createImmunisationRecord(
  input: CreateImmunisationRecordInput,
): Promise<ActionResponse<ImmunisationRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_IMMUNISATION);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = createImmunisationRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const record = parsed.data;

    // Check for existing record for this student
    const { data: existing } = await supabase
      .from("immunisation_records")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("student_id", record.student_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return failure(
        "An immunisation record already exists for this student. Update the existing record instead.",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    // Auto-compute support period end if catch-up and start is provided
    let supportPeriodEnd = record.support_period_end;
    let nextAirCheckDue = record.next_air_check_due;
    if (
      record.status === "catch_up_schedule" &&
      record.support_period_start &&
      !supportPeriodEnd
    ) {
      supportPeriodEnd = computeSupportPeriodEnd(record.support_period_start);
      if (!nextAirCheckDue) {
        nextAirCheckDue = supportPeriodEnd;
      }
    }

    const { data, error } = await supabase
      .from("immunisation_records")
      .insert({
        tenant_id: tenantId,
        student_id: record.student_id,
        ihs_date: record.ihs_date,
        status: record.status,
        document_url: record.document_url,
        support_period_start: record.support_period_start,
        support_period_end: supportPeriodEnd,
        next_air_check_due: nextAirCheckDue,
        exemption_noted_by:
          record.status === "medical_exemption" ? context.user.id : null,
        exemption_noted_at:
          record.status === "medical_exemption"
            ? new Date().toISOString()
            : null,
        recorded_by: context.user.id,
        notes: record.notes,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    logAudit({
      context,
      action: AuditActions.IMMUNISATION_RECORD_CREATED,
      entityType: "immunisation_record",
      entityId: data.id,
      metadata: {
        student_id: record.student_id,
        status: record.status,
      },
    });

    if (record.status === "medical_exemption") {
      logAudit({
        context,
        action: AuditActions.IMMUNISATION_EXEMPTION_RECORDED,
        entityType: "immunisation_record",
        entityId: data.id,
        metadata: { student_id: record.student_id },
      });
    }

    return success(data as ImmunisationRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Update Record
// ============================================================

export async function updateImmunisationRecord(
  recordId: string,
  input: UpdateImmunisationRecordInput,
): Promise<ActionResponse<ImmunisationRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_IMMUNISATION);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = updateImmunisationRecordSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch existing record
    const { data: existing, error: fetchErr } = await supabase
      .from("immunisation_records")
      .select("id, status, student_id")
      .eq("id", recordId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Immunisation record not found", ErrorCodes.NOT_FOUND);
    }

    const updates: Record<string, unknown> = {};
    const record = parsed.data;

    if (record.ihs_date !== undefined) updates.ihs_date = record.ihs_date;
    if (record.status !== undefined) updates.status = record.status;
    if (record.document_url !== undefined)
      updates.document_url = record.document_url;
    if (record.support_period_start !== undefined)
      updates.support_period_start = record.support_period_start;
    if (record.support_period_end !== undefined)
      updates.support_period_end = record.support_period_end;
    if (record.next_air_check_due !== undefined)
      updates.next_air_check_due = record.next_air_check_due;
    if (record.notes !== undefined) updates.notes = record.notes;

    // Auto-compute support period end when switching to catch-up
    if (
      record.status === "catch_up_schedule" &&
      record.support_period_start &&
      !record.support_period_end
    ) {
      updates.support_period_end = computeSupportPeriodEnd(
        record.support_period_start,
      );
      if (!record.next_air_check_due) {
        updates.next_air_check_due = updates.support_period_end;
      }
    }

    // Track exemption recording
    const isNewExemption =
      record.status === "medical_exemption" &&
      existing.status !== "medical_exemption";
    if (isNewExemption) {
      updates.exemption_noted_by = context.user.id;
      updates.exemption_noted_at = new Date().toISOString();
    }

    // Clear support period fields when no longer catch-up
    if (
      record.status &&
      record.status !== "catch_up_schedule" &&
      existing.status === "catch_up_schedule"
    ) {
      updates.support_period_start = null;
      updates.support_period_end = null;
      updates.next_air_check_due = null;
    }

    const { data, error } = await supabase
      .from("immunisation_records")
      .update(updates)
      .eq("id", recordId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    logAudit({
      context,
      action: AuditActions.IMMUNISATION_RECORD_UPDATED,
      entityType: "immunisation_record",
      entityId: recordId,
      metadata: {
        student_id: existing.student_id,
        changes: updates,
      },
    });

    if (isNewExemption) {
      logAudit({
        context,
        action: AuditActions.IMMUNISATION_EXEMPTION_RECORDED,
        entityType: "immunisation_record",
        entityId: recordId,
        metadata: { student_id: existing.student_id },
      });
    }

    return success(data as ImmunisationRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Soft-Delete Record
// ============================================================

export async function deleteImmunisationRecord(
  recordId: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_IMMUNISATION);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Fetch to confirm existence + get student_id for audit
    const { data: existing, error: fetchErr } = await supabase
      .from("immunisation_records")
      .select("id, student_id")
      .eq("id", recordId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Immunisation record not found", ErrorCodes.NOT_FOUND);
    }

    const { error } = await supabase
      .from("immunisation_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("tenant_id", tenantId);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    logAudit({
      context,
      action: AuditActions.IMMUNISATION_RECORD_DELETED,
      entityType: "immunisation_record",
      entityId: recordId,
      metadata: { student_id: existing.student_id },
    });

    return success(undefined as unknown as void);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
