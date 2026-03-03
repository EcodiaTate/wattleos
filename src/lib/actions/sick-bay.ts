"use server";

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
  SickBayVisit,
  SickBayVisitWithStudent,
  SickBayDashboardData,
} from "@/types/domain";

// Raw Supabase join shape for sick_bay_visits with student + recorder joins.
type RawSickBayRow = SickBayVisit & {
  students: { id: string; first_name: string; last_name: string; dob: string } | null;
  users: { id: string; first_name: string | null; last_name: string | null } | null;
};
import { AuditAction, AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createSickBayVisitSchema,
  type CreateSickBayVisitInput,
  updateSickBayVisitSchema,
  type UpdateSickBayVisitInput,
  listSickBayVisitFilterSchema,
  type ListSickBayVisitFilter,
} from "@/lib/validations/sick-bay";

// ============================================================
// READ: Dashboard
// ============================================================

export async function getSickBayDashboard(): Promise<
  ActionResponse<SickBayDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Fetch today's visits and open visits
    const { data, error } = await supabase
      .from("sick_bay_visits")
      .select("*, students!inner(id, first_name, last_name, dob), users!recorded_by(id, first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("arrived_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const visits = (data ?? []) as RawSickBayRow[];

    // Reshape to SickBayVisitWithStudent
    const reshaped: SickBayVisitWithStudent[] = visits.map((row) => ({
      ...row,
      student: row.students!,
      recorder: row.users
        ? {
            id: row.users.id,
            first_name: row.users.first_name ?? "",
            last_name: row.users.last_name ?? "",
          }
        : null,
    }));

    const todayVisits = reshaped.filter((v) => v.visit_date === today);
    const openVisits = reshaped.filter((v) => v.status === "open");

    const summary = {
      total_today: todayVisits.length,
      open: reshaped.filter((v) => v.status === "open").length,
      resolved: reshaped.filter((v) => v.status === "resolved").length,
      referred: reshaped.filter((v) => v.status === "referred").length,
    };

    return success({
      summary,
      visits_today: todayVisits,
      open_visits: openVisits,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Single Visit
// ============================================================

export async function getSickBayVisit(
  visitId: string,
): Promise<ActionResponse<SickBayVisitWithStudent | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("sick_bay_visits")
      .select("*, students!inner(id, first_name, last_name, dob), users!recorded_by(id, first_name, last_name)")
      .eq("id", visitId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    if (!data) return success(null);

    const row = data as RawSickBayRow;
    const reshaped: SickBayVisitWithStudent = {
      ...row,
      student: row.students!,
      recorder: row.users
        ? {
            id: row.users.id,
            first_name: row.users.first_name ?? "",
            last_name: row.users.last_name ?? "",
          }
        : null,
    };

    return success(reshaped);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// READ: Paginated List with Filters
// ============================================================

export async function listSickBayVisits(
  filterInput: ListSickBayVisitFilter,
): Promise<PaginatedResponse<SickBayVisitWithStudent>> {
  try {
    const context = await requirePermission(Permissions.VIEW_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    const parsed = listSickBayVisitFilterSchema.safeParse(filterInput);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const filter = parsed.data;

    let query = supabase
      .from("sick_bay_visits")
      .select(
        "*, students!inner(id, first_name, last_name, dob), users!recorded_by(id, first_name, last_name)",
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.visit_type) query = query.eq("visit_type", filter.visit_type);
    if (filter.student_id) query = query.eq("student_id", filter.student_id);

    if (filter.date_from) {
      query = query.gte("visit_date", filter.date_from);
    }
    if (filter.date_to) {
      query = query.lte("visit_date", filter.date_to);
    }

    // Full-text search on student name (if search provided)
    if (filter.search) {
      const searchTerm = `%${filter.search}%`;
      query = query.or(
        `students.first_name.ilike.${searchTerm},students.last_name.ilike.${searchTerm}`,
      );
    }

    const from = (filter.page - 1) * filter.perPage;
    const { data, error, count } = await query
      .order("visit_date", { ascending: false })
      .range(from, from + filter.perPage - 1);

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const records: SickBayVisitWithStudent[] = ((data ?? []) as RawSickBayRow[]).map(
      (row) => ({
        ...row,
        student: row.students!,
        recorder: row.users
          ? {
              id: row.users.id,
              first_name: row.users.first_name ?? "",
              last_name: row.users.last_name ?? "",
            }
          : null,
      }),
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
// WRITE: Create
// ============================================================

export async function createSickBayVisit(
  input: CreateSickBayVisitInput,
): Promise<ActionResponse<SickBayVisit>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    const parsed = createSickBayVisitSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("sick_bay_visits")
      .insert({
        tenant_id: context.tenant.id,
        recorded_by: context.user.id,
        ...parsed.data,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    logAudit({
      context,
      action: AuditActions.SICK_BAY_VISIT_CREATED,
      entityType: "sick_bay_visit",
      entityId: data.id,
      metadata: {
        student_id: parsed.data.student_id,
        visit_type: parsed.data.visit_type,
      },
    });

    return success(data as SickBayVisit);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Update
// ============================================================

export async function updateSickBayVisit(
  visitId: string,
  input: UpdateSickBayVisitInput,
): Promise<ActionResponse<SickBayVisit>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    const parsed = updateSickBayVisitSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Fetch existing visit for audit
    const { data: existing, error: fetchErr } = await supabase
      .from("sick_bay_visits")
      .select("id, student_id, status, parent_notified")
      .eq("id", visitId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Sick bay visit not found", ErrorCodes.NOT_FOUND);
    }

    // Update the visit
    const { data, error } = await supabase
      .from("sick_bay_visits")
      .update({
        ...parsed.data,
        updated_by: context.user.id,
      })
      .eq("id", visitId)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    // Log audit with action based on status change
    let auditAction: AuditAction = AuditActions.SICK_BAY_VISIT_UPDATED;
    if (parsed.data.status && parsed.data.status !== existing.status) {
      if (parsed.data.status === "resolved") {
        auditAction = AuditActions.SICK_BAY_VISIT_RESOLVED;
      } else if (parsed.data.status === "referred") {
        auditAction = AuditActions.SICK_BAY_VISIT_REFERRED;
      }
    }

    logAudit({
      context,
      action: auditAction,
      entityType: "sick_bay_visit",
      entityId: visitId,
      metadata: { student_id: existing.student_id },
    });

    // Fire separate audit when parent notification is first recorded
    if (parsed.data.parent_notified && !existing.parent_notified) {
      logAudit({
        context,
        action: AuditActions.SICK_BAY_PARENT_NOTIFIED,
        entityType: "sick_bay_visit",
        entityId: visitId,
        metadata: {
          student_id: existing.student_id,
          notified_at: parsed.data.parent_notified_at ?? null,
        },
      });
    }

    return success(data as SickBayVisit);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// WRITE: Delete (Soft Delete)
// ============================================================

export async function deleteSickBayVisit(visitId: string): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_SICK_BAY);
    const supabase = await createSupabaseServerClient();

    // Fetch existing visit for audit
    const { data: existing, error: fetchErr } = await supabase
      .from("sick_bay_visits")
      .select("id, student_id")
      .eq("id", visitId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !existing) {
      return failure("Sick bay visit not found", ErrorCodes.NOT_FOUND);
    }

    // Soft delete
    const { error } = await supabase
      .from("sick_bay_visits")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", visitId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    logAudit({
      context,
      action: AuditActions.SICK_BAY_VISIT_DELETED,
      entityType: "sick_bay_visit",
      entityId: visitId,
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
