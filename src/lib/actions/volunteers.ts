"use server";

// src/lib/actions/volunteers.ts
//
// ============================================================
// Volunteer Coordination - Server Actions
// ============================================================
// All queries and mutations for volunteer profiles and
// excursion/event assignments.
//
// WWCC status is computed in application code from
// wwcc_expiry_date rather than stored in the database.
// This means the status always reflects the current date
// rather than the date of last update.
//
// Threshold: "expiring_soon" = within 30 days of today.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  Volunteer,
  VolunteerAssignment,
  VolunteerAssignmentWithDetails,
  VolunteerDashboardData,
  VolunteerWithWwccStatus,
  VolunteerWwccStatus,
} from "@/types/domain";
import {
  CreateAssignmentSchema,
  CreateVolunteerSchema,
  ListAssignmentsSchema,
  ListVolunteersSchema,
  UpdateAssignmentSchema,
  UpdateVolunteerSchema,
} from "@/lib/validations/volunteers";
import type {
  CreateAssignmentInput,
  CreateVolunteerInput,
  ListAssignmentsInput,
  ListVolunteersInput,
  UpdateAssignmentInput,
  UpdateVolunteerInput,
} from "@/lib/validations/volunteers";

// ============================================================
// Internal helpers
// ============================================================

const EXPIRING_SOON_DAYS = 30;

function computeWwccStatus(volunteer: Volunteer): {
  wwcc_status: VolunteerWwccStatus;
  days_until_expiry: number | null;
} {
  if (!volunteer.wwcc_number || !volunteer.wwcc_expiry_date) {
    return { wwcc_status: "missing", days_until_expiry: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(volunteer.wwcc_expiry_date);
  expiry.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.ceil((expiry.getTime() - today.getTime()) / msPerDay);

  if (days < 0) {
    return { wwcc_status: "expired", days_until_expiry: days };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return { wwcc_status: "expiring_soon", days_until_expiry: days };
  }
  return { wwcc_status: "current", days_until_expiry: days };
}

function withWwccStatus(volunteer: Volunteer): VolunteerWithWwccStatus {
  return { ...volunteer, ...computeWwccStatus(volunteer) };
}

// ============================================================
// Dashboard
// ============================================================

export async function getVolunteerDashboard(): Promise<
  ActionResponse<VolunteerDashboardData>
> {
  const ctx = await requirePermission(Permissions.VIEW_VOLUNTEERS);
  const supabase = await createSupabaseServerClient();

  const today = new Date().toISOString().split("T")[0];
  const soonDate = new Date(
    Date.now() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split("T")[0];

  const [volunteersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("volunteers")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("volunteer_assignments")
      .select(`*, volunteer:volunteers(*)`)
      .eq("tenant_id", ctx.tenantId)
      .gte("event_date", today)
      .in("status", ["invited", "confirmed"])
      .order("event_date"),
  ]);

  if (volunteersResult.error) {
    return failure("DATABASE_ERROR", volunteersResult.error.message);
  }
  if (assignmentsResult.error) {
    return failure("DATABASE_ERROR", assignmentsResult.error.message);
  }

  const volunteers = (volunteersResult.data ?? []) as Volunteer[];
  const withStatus = volunteers.map(withWwccStatus);

  const expiryAlerts = withStatus.filter(
    (v) => v.wwcc_status === "expired" || v.wwcc_status === "expiring_soon",
  );

  const upcomingAssignments = (assignmentsResult.data ?? []).map((row) => {
    const volunteer = Array.isArray(row.volunteer)
      ? row.volunteer[0]
      : row.volunteer;
    return {
      ...row,
      volunteer: withWwccStatus(volunteer as Volunteer),
    } as VolunteerAssignmentWithDetails;
  });

  return success({
    total_active: volunteers.length,
    wwcc_expiring_count: withStatus.filter(
      (v) => v.wwcc_status === "expiring_soon",
    ).length,
    wwcc_expired_count: withStatus.filter((v) => v.wwcc_status === "expired")
      .length,
    upcoming_assignments_count: upcomingAssignments.length,
    expiry_alerts: expiryAlerts,
    upcoming_assignments: upcomingAssignments,
  });
}

// ============================================================
// Volunteer CRUD
// ============================================================

export async function listVolunteers(
  input: ListVolunteersInput,
): Promise<ActionResponse<VolunteerWithWwccStatus[]>> {
  const ctx = await requirePermission(Permissions.VIEW_VOLUNTEERS);
  const parsed = ListVolunteersSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("volunteers")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("last_name")
    .order("first_name");

  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }
  if (parsed.data.search) {
    const term = `%${parsed.data.search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) return failure("DATABASE_ERROR", error.message);

  let result = ((data ?? []) as Volunteer[]).map(withWwccStatus);

  // Client-side WWCC status filter (computed, not stored)
  if (parsed.data.wwcc_status) {
    result = result.filter((v) => v.wwcc_status === parsed.data.wwcc_status);
  }

  return success(result);
}

export async function getVolunteer(id: string): Promise<
  ActionResponse<{
    volunteer: VolunteerWithWwccStatus;
    assignments: VolunteerAssignmentWithDetails[];
  }>
> {
  const ctx = await requirePermission(Permissions.VIEW_VOLUNTEERS);
  const supabase = await createSupabaseServerClient();

  const [volunteerResult, assignmentsResult] = await Promise.all([
    supabase
      .from("volunteers")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenantId)
      .single(),
    supabase
      .from("volunteer_assignments")
      .select(`*, volunteer:volunteers(*)`)
      .eq("volunteer_id", id)
      .eq("tenant_id", ctx.tenantId)
      .order("event_date", { ascending: false }),
  ]);

  if (volunteerResult.error) {
    return failure("NOT_FOUND", "Volunteer not found");
  }
  if (assignmentsResult.error) {
    return failure("DATABASE_ERROR", assignmentsResult.error.message);
  }

  const volunteer = withWwccStatus(volunteerResult.data as Volunteer);
  const assignments = (assignmentsResult.data ?? []).map((row) => {
    const vol = Array.isArray(row.volunteer) ? row.volunteer[0] : row.volunteer;
    return {
      ...row,
      volunteer: withWwccStatus(vol as Volunteer),
    } as VolunteerAssignmentWithDetails;
  });

  return success({ volunteer, assignments });
}

export async function createVolunteer(
  input: CreateVolunteerInput,
): Promise<ActionResponse<Volunteer>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const parsed = CreateVolunteerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteers")
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_CREATED,
    entityType: "volunteer",
    entityId: data.id,
    metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
    },
  });

  return success(data as Volunteer);
}

export async function updateVolunteer(
  id: string,
  input: UpdateVolunteerInput,
): Promise<ActionResponse<Volunteer>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const parsed = UpdateVolunteerSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteers")
    .update({
      ...parsed.data,
      updated_by: ctx.user.id,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select()
    .single();

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_UPDATED,
    entityType: "volunteer",
    entityId: id,
    metadata: { changes: Object.keys(parsed.data) },
  });

  return success(data as Volunteer);
}

export async function deactivateVolunteer(
  id: string,
): Promise<ActionResponse<void>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("volunteers")
    .update({ status: "inactive", updated_by: ctx.user.id })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_DEACTIVATED,
    entityType: "volunteer",
    entityId: id,
  });

  return success(undefined);
}

// ============================================================
// Assignments
// ============================================================

export async function listAssignments(
  input: ListAssignmentsInput,
): Promise<ActionResponse<VolunteerAssignmentWithDetails[]>> {
  const ctx = await requirePermission(Permissions.VIEW_VOLUNTEERS);
  const parsed = ListAssignmentsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("volunteer_assignments")
    .select(`*, volunteer:volunteers(*)`)
    .eq("tenant_id", ctx.tenantId)
    .order("event_date", { ascending: false });

  if (parsed.data.volunteer_id) {
    query = query.eq("volunteer_id", parsed.data.volunteer_id);
  }
  if (parsed.data.excursion_id) {
    query = query.eq("excursion_id", parsed.data.excursion_id);
  }
  if (parsed.data.status) {
    query = query.eq("status", parsed.data.status);
  }
  if (parsed.data.from_date) {
    query = query.gte("event_date", parsed.data.from_date);
  }
  if (parsed.data.to_date) {
    query = query.lte("event_date", parsed.data.to_date);
  }

  const { data, error } = await query;
  if (error) return failure("DATABASE_ERROR", error.message);

  const result = (data ?? []).map((row) => {
    const vol = Array.isArray(row.volunteer) ? row.volunteer[0] : row.volunteer;
    return {
      ...row,
      volunteer: withWwccStatus(vol as Volunteer),
    } as VolunteerAssignmentWithDetails;
  });

  return success(result);
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<ActionResponse<VolunteerAssignment>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const parsed = CreateAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  // Verify volunteer belongs to this tenant
  const supabase = await createSupabaseServerClient();
  const { data: vol, error: volError } = await supabase
    .from("volunteers")
    .select("id, status, wwcc_number, wwcc_expiry_date")
    .eq("id", parsed.data.volunteer_id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (volError || !vol) {
    return failure("NOT_FOUND", "Volunteer not found");
  }
  if (vol.status !== "active") {
    return failure("VALIDATION_ERROR", "Volunteer is not active");
  }

  // Warn via metadata if WWCC is not current (don't block - coordinator decides)
  const { wwcc_status } = computeWwccStatus(vol as unknown as Volunteer);

  const { data, error } = await supabase
    .from("volunteer_assignments")
    .insert({
      tenant_id: ctx.tenantId,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_ASSIGNED,
    entityType: "volunteer_assignment",
    entityId: data.id,
    metadata: {
      volunteer_id: parsed.data.volunteer_id,
      event_name: parsed.data.event_name,
      event_date: parsed.data.event_date,
      role: parsed.data.role,
      wwcc_status,
    },
  });

  return success(data as VolunteerAssignment);
}

export async function updateAssignment(
  id: string,
  input: UpdateAssignmentInput,
): Promise<ActionResponse<VolunteerAssignment>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const parsed = UpdateAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", parsed.error.issues[0].message);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteer_assignments")
    .update({ ...parsed.data, updated_by: ctx.user.id })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select()
    .single();

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_ASSIGNMENT_UPDATED,
    entityType: "volunteer_assignment",
    entityId: id,
    metadata: { status: parsed.data.status },
  });

  return success(data as VolunteerAssignment);
}

export async function cancelAssignment(
  id: string,
): Promise<ActionResponse<void>> {
  const ctx = await requirePermission(Permissions.MANAGE_VOLUNTEERS);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("volunteer_assignments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return failure("DATABASE_ERROR", error.message);

  await logAudit({
    context: ctx,
    action: AuditActions.VOLUNTEER_ASSIGNMENT_CANCELLED,
    entityType: "volunteer_assignment",
    entityId: id,
  });

  return success(undefined);
}
