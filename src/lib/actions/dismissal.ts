"use server";

// src/lib/actions/dismissal.ts
//
// ============================================================
// WattleOS V2 - End-of-Day Dismissal & Pickup Actions (Module V)
// ============================================================
// Manages the end-of-day dismissal workflow for schools:
//   - Bus route configuration
//   - Per-student pickup authorizations (who may collect a child)
//   - Per-student dismissal method preferences (bus vs parent etc.)
//   - Daily dismissal confirmation records with exception flags
//
// SAFETY NOTE: This module controls who physically takes a child
// off school grounds. All writes are audit-logged. RLS ensures
// tenant isolation at the database layer.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  confirmDismissalSchema,
  createBusRouteSchema,
  createPickupAuthorizationSchema,
  flagExceptionSchema,
  listDismissalHistorySchema,
  seedDismissalRecordsSchema,
  setDismissalMethodSchema,
  updateBusRouteSchema,
  updatePickupAuthorizationSchema,
  type ConfirmDismissalInput,
  type CreateBusRouteInput,
  type CreatePickupAuthorizationInput,
  type FlagExceptionInput,
  type ListDismissalHistoryInput,
  type SeedDismissalRecordsInput,
  type SetDismissalMethodInput,
  type UpdateBusRouteInput,
  type UpdatePickupAuthorizationInput,
} from "@/lib/validations/dismissal";
import {
  type ActionResponse,
  ErrorCodes,
  failure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  BusRoute,
  DismissalDashboardData,
  DismissalRecord,
  DismissalRecordWithStudent,
  PickupAuthorization,
  StudentDismissalMethod,
  StudentDismissalSetup,
} from "@/types/domain";

// ============================================================
// BUS ROUTES
// ============================================================

export async function getBusRoutes(): Promise<ActionResponse<BusRoute[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("bus_routes")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("route_name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as BusRoute[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load bus routes",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createBusRoute(
  input: CreateBusRouteInput,
): Promise<ActionResponse<BusRoute>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = createBusRouteSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const { data: route, error } = await supabase
      .from("bus_routes")
      .insert({
        tenant_id: context.tenant.id,
        route_name: d.route_name,
        operator_name: d.operator_name,
        vehicle_registration: d.vehicle_registration,
        driver_name: d.driver_name,
        driver_phone: d.driver_phone,
        depart_time: d.depart_time,
        days_of_operation: d.days_of_operation,
        notes: d.notes,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.BUS_ROUTE_CREATED,
      entityType: "bus_route",
      entityId: (route as BusRoute).id,
      metadata: { route_name: d.route_name, operator_name: d.operator_name },
    });

    return success(route as BusRoute);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create bus route",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateBusRoute(
  id: string,
  input: UpdateBusRouteInput,
): Promise<ActionResponse<BusRoute>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = updateBusRouteSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const { data: route, error } = await supabase
      .from("bus_routes")
      .update({ ...d, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.BUS_ROUTE_UPDATED,
      entityType: "bus_route",
      entityId: id,
      metadata: { changes: Object.keys(d) },
    });

    return success(route as BusRoute);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update bus route",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteBusRoute(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    // Soft-delete: mark inactive so historical records retain the route name
    const { error } = await supabase
      .from("bus_routes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.BUS_ROUTE_DELETED,
      entityType: "bus_route",
      entityId: id,
      metadata: {},
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete bus route",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// PICKUP AUTHORIZATIONS
// ============================================================

export async function getPickupAuthorizations(
  studentId: string,
): Promise<ActionResponse<PickupAuthorization[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("pickup_authorizations")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("is_active", true)
      .order("authorized_name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as PickupAuthorization[]);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to load pickup authorizations",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function createPickupAuthorization(
  input: CreatePickupAuthorizationInput,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = createPickupAuthorizationSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const { data: auth, error } = await supabase
      .from("pickup_authorizations")
      .insert({
        tenant_id: context.tenant.id,
        student_id: d.student_id,
        authorized_name: d.authorized_name,
        relationship: d.relationship,
        phone: d.phone,
        photo_url: d.photo_url,
        id_verified: d.id_verified,
        is_permanent: d.is_permanent,
        valid_from: d.valid_from,
        valid_until: d.valid_until,
        notes: d.notes,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PICKUP_AUTH_CREATED,
      entityType: "pickup_authorization",
      entityId: (auth as PickupAuthorization).id,
      metadata: {
        student_id: d.student_id,
        authorized_name: d.authorized_name,
        relationship: d.relationship,
        is_permanent: d.is_permanent,
      },
    });

    return success(auth as PickupAuthorization);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add pickup authorization",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updatePickupAuthorization(
  id: string,
  input: UpdatePickupAuthorizationInput,
): Promise<ActionResponse<PickupAuthorization>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = updatePickupAuthorizationSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const { data: auth, error } = await supabase
      .from("pickup_authorizations")
      .update({ ...d, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PICKUP_AUTH_UPDATED,
      entityType: "pickup_authorization",
      entityId: id,
      metadata: { changes: Object.keys(d) },
    });

    return success(auth as PickupAuthorization);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to update pickup authorization",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function revokePickupAuthorization(
  id: string,
): Promise<ActionResponse<void>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    // Get the record for audit log metadata before revoking
    const { data: existing } = await supabase
      .from("pickup_authorizations")
      .select("student_id, authorized_name")
      .eq("id", id)
      .eq("tenant_id", context.tenant.id)
      .single();

    const { error } = await supabase
      .from("pickup_authorizations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.PICKUP_AUTH_REVOKED,
      entityType: "pickup_authorization",
      entityId: id,
      metadata: {
        student_id: existing?.student_id ?? null,
        authorized_name: existing?.authorized_name ?? null,
      },
    });

    return success(undefined);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to revoke pickup authorization",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STUDENT DISMISSAL METHOD PREFERENCES
// ============================================================

export async function getStudentDismissalSetup(
  studentId: string,
): Promise<ActionResponse<StudentDismissalSetup>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const [studentRes, methodsRes, authsRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("id", studentId)
        .eq("tenant_id", context.tenant.id)
        .single(),
      supabase
        .from("student_dismissal_methods")
        .select("*, bus_route:bus_routes(id, route_name, depart_time)")
        .eq("student_id", studentId)
        .eq("tenant_id", context.tenant.id)
        .order("day_of_week"),
      supabase
        .from("pickup_authorizations")
        .select("*")
        .eq("student_id", studentId)
        .eq("tenant_id", context.tenant.id)
        .eq("is_active", true)
        .order("authorized_name"),
    ]);

    if (studentRes.error)
      return failure(studentRes.error.message, ErrorCodes.DATABASE_ERROR);

    return success({
      student: studentRes.data,
      methods: (methodsRes.data ?? []) as StudentDismissalMethod[],
      authorizations: (authsRes.data ?? []) as PickupAuthorization[],
    } as StudentDismissalSetup);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to load student dismissal setup",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function setStudentDismissalMethod(
  input: SetDismissalMethodInput,
): Promise<ActionResponse<StudentDismissalMethod>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = setDismissalMethodSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    // Upsert so re-setting a day replaces the existing preference
    const { data: method, error } = await supabase
      .from("student_dismissal_methods")
      .upsert(
        {
          tenant_id: context.tenant.id,
          student_id: d.student_id,
          day_of_week: d.day_of_week,
          dismissal_method: d.dismissal_method,
          bus_route_id: d.bus_route_id,
          notes: d.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,day_of_week" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DISMISSAL_METHOD_SET,
      entityType: "student_dismissal_method",
      entityId: d.student_id,
      metadata: {
        day_of_week: d.day_of_week,
        dismissal_method: d.dismissal_method,
        bus_route_id: d.bus_route_id,
      },
    });

    return success(method as StudentDismissalMethod);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to set dismissal method",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DAILY DISMISSAL RECORDS
// ============================================================

// Seed records for all active students (or a single class).
// Called when staff opens the dismissal dashboard for a given day.
// Pre-populates expected_method from stored preferences.
export async function seedDismissalRecords(
  input: SeedDismissalRecordsInput,
): Promise<ActionResponse<{ seeded: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = seedDismissalRecordsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const { dismissal_date, class_id } = parsed.data;

    // Determine day of week for preference lookup
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayOfWeek = dayNames[new Date(dismissal_date).getDay()];

    // Fetch active enrolled students
    let studentsQuery = supabase
      .from("enrollments")
      .select("student_id")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    if (class_id) studentsQuery = studentsQuery.eq("class_id", class_id);

    const { data: enrollments, error: enrollErr } = await studentsQuery;
    if (enrollErr) return failure(enrollErr.message, ErrorCodes.DATABASE_ERROR);

    const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
    if (studentIds.length === 0) return success({ seeded: 0 });

    // Fetch dismissal preferences for these students (day-specific first, then default)
    const { data: prefs } = await supabase
      .from("student_dismissal_methods")
      .select("student_id, day_of_week, dismissal_method, bus_route_id")
      .eq("tenant_id", context.tenant.id)
      .in("student_id", studentIds)
      .in("day_of_week", [dayOfWeek, "default"]);

    // Build preference map: prefer day-specific over default
    const prefMap = new Map<
      string,
      { dismissal_method: string; bus_route_id: string | null }
    >();
    for (const p of prefs ?? []) {
      const sid = p.student_id as string;
      if (!prefMap.has(sid) || p.day_of_week === dayOfWeek) {
        prefMap.set(sid, {
          dismissal_method: p.dismissal_method as string,
          bus_route_id: (p.bus_route_id as string | null) ?? null,
        });
      }
    }

    // Upsert records (skip if already exists for this day)
    const rows = studentIds.map((sid) => {
      const pref = prefMap.get(sid);
      return {
        tenant_id: context.tenant.id,
        student_id: sid,
        dismissal_date,
        expected_method: pref?.dismissal_method ?? null,
        bus_route_id: pref?.bus_route_id ?? null,
        status: "pending",
      };
    });

    const { error: insertErr } = await supabase
      .from("dismissal_records")
      .upsert(rows, {
        onConflict: "student_id,dismissal_date",
        ignoreDuplicates: true,
      });

    if (insertErr) return failure(insertErr.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DISMISSAL_RECORDS_SEEDED,
      entityType: "dismissal_record",
      entityId: null,
      metadata: { dismissal_date, class_id, student_count: rows.length },
    });

    return success({ seeded: rows.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to seed dismissal records",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getDismissalDashboard(
  date: string,
  classId?: string,
): Promise<ActionResponse<DismissalDashboardData>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    let recordsQuery = supabase
      .from("dismissal_records")
      .select(
        `*,
        student:students(id, first_name, last_name, dob),
        confirmer:confirmed_by(id, first_name, last_name),
        bus_route:bus_routes(id, route_name),
        pickup_authorization:authorization_id(id, authorized_name, relationship)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("dismissal_date", date)
      .order("student(last_name)", { ascending: true });

    if (classId) {
      // Filter by class via enrollments join
      const { data: enrolled } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", classId)
        .eq("tenant_id", context.tenant.id)
        .eq("status", "active");
      const ids = (enrolled ?? []).map((e) => e.student_id as string);
      if (ids.length > 0) {
        recordsQuery = recordsQuery.in("student_id", ids);
      }
    }

    const { data: records, error } = await recordsQuery;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const { data: routes } = await supabase
      .from("bus_routes")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("route_name");

    const allRecords = (records ?? []) as DismissalRecordWithStudent[];
    const pending = allRecords.filter((r) => r.status === "pending").length;
    const confirmed = allRecords.filter((r) => r.status === "confirmed").length;
    const exceptions = allRecords.filter(
      (r) => r.status === "exception",
    ).length;

    return success({
      date,
      summary: { total: allRecords.length, pending, confirmed, exceptions },
      records: allRecords,
      bus_routes: (routes ?? []) as BusRoute[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dismissal dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function confirmDismissal(
  input: ConfirmDismissalInput,
): Promise<ActionResponse<DismissalRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = confirmDismissalSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const now = new Date().toISOString();

    const { data: record, error } = await supabase
      .from("dismissal_records")
      .upsert(
        {
          tenant_id: context.tenant.id,
          student_id: d.student_id,
          dismissal_date: d.dismissal_date,
          actual_method: d.actual_method,
          bus_route_id: d.bus_route_id,
          authorization_id: d.authorization_id,
          collected_by_name: d.collected_by_name,
          status: "confirmed",
          confirmed_by: context.user.id,
          confirmed_at: now,
          notes: d.notes,
          // Clear any prior exception flags
          exception_reason: null,
          exception_notes: null,
          updated_at: now,
        },
        { onConflict: "student_id,dismissal_date" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DISMISSAL_CONFIRMED,
      entityType: "dismissal_record",
      entityId: (record as DismissalRecord).id,
      metadata: {
        student_id: d.student_id,
        dismissal_date: d.dismissal_date,
        actual_method: d.actual_method,
      },
    });

    return success(record as DismissalRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to confirm dismissal",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function flagDismissalException(
  input: FlagExceptionInput,
): Promise<ActionResponse<DismissalRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = flagExceptionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const now = new Date().toISOString();

    const { data: record, error } = await supabase
      .from("dismissal_records")
      .upsert(
        {
          tenant_id: context.tenant.id,
          student_id: d.student_id,
          dismissal_date: d.dismissal_date,
          status: "exception",
          exception_reason: d.exception_reason,
          exception_notes: d.exception_notes,
          confirmed_by: context.user.id,
          confirmed_at: now,
          updated_at: now,
        },
        { onConflict: "student_id,dismissal_date" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.DISMISSAL_EXCEPTION_FLAGGED,
      entityType: "dismissal_record",
      entityId: (record as DismissalRecord).id,
      metadata: {
        student_id: d.student_id,
        dismissal_date: d.dismissal_date,
        exception_reason: d.exception_reason,
      },
    });

    return success(record as DismissalRecord);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to flag dismissal exception",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// HISTORY
// ============================================================

export async function listDismissalHistory(
  input: ListDismissalHistoryInput,
): Promise<ActionResponse<PaginatedResponse<DismissalRecordWithStudent>>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DISMISSAL);
    const supabase = await createSupabaseServerClient();

    const parsed = listDismissalHistorySchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }
    const d = parsed.data;

    const from = (d.page - 1) * d.per_page;
    const to = from + d.per_page - 1;

    let query = supabase
      .from("dismissal_records")
      .select(
        `*,
        student:students(id, first_name, last_name, dob),
        confirmer:confirmed_by(id, first_name, last_name),
        bus_route:bus_routes(id, route_name),
        pickup_authorization:authorization_id(id, authorized_name, relationship)`,
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .order("dismissal_date", { ascending: false })
      .order("student(last_name)", { ascending: true })
      .range(from, to);

    if (d.student_id) query = query.eq("student_id", d.student_id);
    if (d.from_date) query = query.gte("dismissal_date", d.from_date);
    if (d.to_date) query = query.lte("dismissal_date", d.to_date);
    if (d.status) query = query.eq("status", d.status);

    const { data: records, error, count } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success({
      data: (records ?? []) as DismissalRecordWithStudent[],
      total: count ?? 0,
      page: d.page,
      per_page: d.per_page,
      total_pages: Math.ceil((count ?? 0) / d.per_page),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dismissal history",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
