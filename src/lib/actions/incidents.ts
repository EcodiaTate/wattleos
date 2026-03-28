"use server";

// src/lib/actions/incidents.ts
//
// ============================================================
// WattleOS V2 - Module A: IITI Incident Register (Reg 87)
// ============================================================
// Every incident, injury, trauma or illness that occurs on
// premises must be recorded before end of day. Serious incidents
// (hospital attendance, missing child, abuse allegation) must
// be notified to the regulatory authority within 24 hours via
// NQA ITS. All mutations are audit-logged - the record is
// immutable from a forensic standpoint.
//
// Serious incident definition (Reg 12):
//   - Child requires medical attention at hospital
//   - Child is missing
//   - Child involved in a serious accident/injury
//   - Abuse allegation involving a staff member
//   - Natural disaster / emergency requiring evacuation
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  ActionResponse,
  ErrorCodes,
  PaginatedResponse,
  failure,
  paginated,
  paginatedFailure,
  success,
} from "@/types/api";
import type { Incident, IncidentWithStudents } from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  createIncidentSchema,
  updateIncidentSchema,
  recordParentNotificationSchema,
  recordRegulatorNotificationSchema,
  listIncidentsFilterSchema,
} from "@/lib/validations/incidents";

// Re-export types so callers can import from here (backwards-compatible)
export type {
  CreateIncidentInput,
  UpdateIncidentInput,
  RecordParentNotificationInput,
  RecordRegulatorNotificationInput,
  ListIncidentsFilter,
} from "@/lib/validations/incidents";

// ============================================================
// CREATE INCIDENT
// ============================================================

export async function createIncident(
  input: unknown,
): Promise<ActionResponse<Incident>> {
  try {
    const parsed = createIncidentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.CREATE_INCIDENT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        tenant_id: context.tenant.id,
        student_ids: parsed.data.student_ids,
        occurred_at: parsed.data.occurred_at,
        location: parsed.data.location,
        incident_type: parsed.data.incident_type,
        description: parsed.data.description,
        first_aid_administered: parsed.data.first_aid_administered ?? null,
        first_aid_by: parsed.data.first_aid_by ?? null,
        witness_names: parsed.data.witness_names ?? [],
        severity: parsed.data.severity,
        is_serious_incident: parsed.data.is_serious_incident,
        serious_incident_reason: parsed.data.serious_incident_reason ?? null,
        status: "open",
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.CREATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.INCIDENT_CREATED,
      entityType: "incident",
      entityId: data.id,
      metadata: {
        incident_type: parsed.data.incident_type,
        severity: parsed.data.severity,
        is_serious_incident: parsed.data.is_serious_incident,
        student_count: parsed.data.student_ids.length,
      },
    });

    return success(data as Incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE INCIDENT
// ============================================================

export async function updateIncident(
  incidentId: string,
  input: unknown,
): Promise<ActionResponse<Incident>> {
  try {
    const parsed = updateIncidentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("incidents")
      .update({
        ...parsed.data,
        witness_names: parsed.data.witness_names ?? undefined,
      })
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);
    if (!data) return failure("Incident not found", ErrorCodes.NOT_FOUND);

    await logAudit({
      context,
      action: AuditActions.INCIDENT_UPDATED,
      entityType: "incident",
      entityId: incidentId,
      metadata: parsed.data as Record<string, unknown>,
    });

    return success(data as Incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RECORD PARENT NOTIFICATION
// ============================================================
// Marks the incident as parent-notified. Reg 87 requires this
// within 24 hours of the incident. Advances the status.
// ============================================================

export async function recordParentNotification(
  incidentId: string,
  input: unknown,
): Promise<ActionResponse<Incident>> {
  try {
    const parsed = recordParentNotificationSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("incidents")
      .select("id, status, parent_notified_at")
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return failure("Incident not found", ErrorCodes.NOT_FOUND);
    if (existing.parent_notified_at)
      return failure(
        "Parent has already been notified",
        ErrorCodes.VALIDATION_ERROR,
      );
    if (existing.status === "closed")
      return failure(
        "Cannot modify a closed incident",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("incidents")
      .update({
        parent_notified_at: new Date().toISOString(),
        parent_notified_by: context.user.id,
        parent_notification_method: parsed.data.method,
        parent_notification_notes: parsed.data.notes ?? null,
        status: "parent_notified",
      })
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("parent_notified_at", null) // Guard: only if not already notified
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.INCIDENT_PARENT_NOTIFIED,
      entityType: "incident",
      entityId: incidentId,
      metadata: { method: parsed.data.method },
    });

    return success(data as Incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// RECORD REGULATOR NOTIFICATION
// ============================================================
// For serious incidents only. Records the NQA ITS notification
// with reference number. Advances status to regulator_notified.
// ============================================================

export async function recordRegulatorNotification(
  incidentId: string,
  input: unknown,
): Promise<ActionResponse<Incident>> {
  try {
    const parsed = recordRegulatorNotificationSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.MANAGE_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    // Validate preconditions: must be serious + parent notified first
    const { data: existing } = await supabase
      .from("incidents")
      .select(
        "id, is_serious_incident, parent_notified_at, regulator_notified_at, status",
      )
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return failure("Incident not found", ErrorCodes.NOT_FOUND);
    if (!existing.is_serious_incident)
      return failure(
        "Regulatory notification only applies to serious incidents",
        ErrorCodes.VALIDATION_ERROR,
      );
    if (existing.regulator_notified_at)
      return failure(
        "Regulator has already been notified",
        ErrorCodes.VALIDATION_ERROR,
      );
    if (existing.status === "closed")
      return failure(
        "Cannot modify a closed incident",
        ErrorCodes.VALIDATION_ERROR,
      );

    const { data, error } = await supabase
      .from("incidents")
      .update({
        regulator_notified_at: parsed.data.notified_at,
        regulator_notified_by: context.user.id,
        regulator_notification_ref: parsed.data.reference,
        regulator_notification_notes: parsed.data.notes ?? null,
        status: "regulator_notified",
      })
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("regulator_notified_at", null) // Guard: only if not already notified
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.INCIDENT_REGULATOR_NOTIFIED,
      entityType: "incident",
      entityId: incidentId,
      metadata: {
        reference: parsed.data.reference,
        notified_at: parsed.data.notified_at,
      },
    });

    return success(data as Incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CLOSE INCIDENT
// ============================================================

export async function closeIncident(
  incidentId: string,
): Promise<ActionResponse<Incident>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    // Validate: parent must be notified; serious incidents must also have regulator notified
    const { data: existing } = await supabase
      .from("incidents")
      .select(
        "id, is_serious_incident, parent_notified_at, regulator_notified_at, status",
      )
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return failure("Incident not found", ErrorCodes.NOT_FOUND);
    if (existing.status === "closed")
      return failure("Incident is already closed", ErrorCodes.VALIDATION_ERROR);
    if (!existing.parent_notified_at) {
      return failure(
        "Parent must be notified before closing an incident",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (existing.is_serious_incident && !existing.regulator_notified_at) {
      return failure(
        "Serious incidents must be reported to the regulatory authority before closing",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("incidents")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: context.user.id,
      })
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .neq("status", "closed") // Guard: don't close twice
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.INCIDENT_CLOSED,
      entityType: "incident",
      entityId: incidentId,
      metadata: {},
    });

    return success(data as Incident);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET INCIDENT
// ============================================================

export async function getIncident(
  incidentId: string,
): Promise<ActionResponse<IncidentWithStudents>> {
  try {
    const context = await requirePermission(Permissions.VIEW_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.NOT_FOUND);
    if (!data) return failure("Incident not found", ErrorCodes.NOT_FOUND);

    // Resolve student names from student_ids array
    const studentIds: string[] = data.student_ids ?? [];
    let students: { id: string; first_name: string; last_name: string }[] = [];

    if (studentIds.length > 0) {
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds)
        .eq("tenant_id", context.tenant.id);
      students = studentData ?? [];
    }

    // Resolve recorded_by user separately (avoid fragile FK join naming)
    let recordedByUser: {
      id: string;
      first_name: string;
      last_name: string;
    } | null = null;
    if (data.recorded_by) {
      const { data: userData } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("id", data.recorded_by)
        .single();
      recordedByUser = userData ?? null;
    }

    return success({
      ...data,
      students,
      recorded_by_user: recordedByUser,
    } as IncidentWithStudents);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST INCIDENTS (paginated)
// ============================================================

export async function listIncidents(
  filter: unknown = {},
): Promise<PaginatedResponse<Incident>> {
  try {
    const parsed = listIncidentsFilterSchema.safeParse(filter);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const context = await requirePermission(Permissions.VIEW_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    const page = parsed.data.page;
    const perPage = parsed.data.per_page;
    const offset = (page - 1) * perPage;

    let query = supabase
      .from("incidents")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.incident_type)
      query = query.eq("incident_type", parsed.data.incident_type);
    if (parsed.data.is_serious_incident !== undefined)
      query = query.eq("is_serious_incident", parsed.data.is_serious_incident);
    if (parsed.data.student_id)
      query = query.contains("student_ids", [parsed.data.student_id]);
    if (parsed.data.from_date)
      query = query.gte("occurred_at", parsed.data.from_date);
    if (parsed.data.to_date)
      query = query.lte("occurred_at", parsed.data.to_date);

    const { data, error, count } = await query;

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      data as Incident[],
      count ?? 0,
      parsed.data.page,
      parsed.data.per_page,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET OPEN SERIOUS INCIDENTS (for dashboard alerts)
// ============================================================
// Returns all serious incidents where regulator has not yet
// been notified, ordered by occurred_at ascending so the
// oldest (most urgent) appear first.
// ============================================================

export async function getOpenSeriousIncidents(): Promise<
  ActionResponse<Incident[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_INCIDENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("is_serious_incident", true)
      .is("regulator_notified_at", null)
      .is("deleted_at", null)
      .neq("status", "closed")
      .order("occurred_at", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success(data as Incident[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
