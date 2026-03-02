"use server";

// src/lib/actions/emergency-coordination.ts
//
// ============================================================
// WattleOS V2 - Live Emergency Coordination Server Actions
// ============================================================
// Real-time emergency coordination system for lockdowns, fire
// evacuations, shelter-in-place, and medical emergencies.
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  EmergencyCoordinationConfigData,
  EmergencyCoordinationLiveData,
  EmergencyEvent,
  EmergencyEventWithActivator,
  EmergencyZone,
  EmergencyZoneWithWarden,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  activateEmergencySchema,
  type ActivateEmergencyInput,
  reportZoneStatusSchema,
  type ReportZoneStatusInput,
  accountStudentSchema,
  type AccountStudentInput,
  bulkAccountStudentsSchema,
  type BulkAccountStudentsInput,
  accountStaffSchema,
  type AccountStaffInput,
  addEventNoteSchema,
  type AddEventNoteInput,
  sendEmergencyAnnouncementSchema,
  type SendEmergencyAnnouncementInput,
  createZoneSchema,
  type CreateZoneInput,
  updateZoneSchema,
  type UpdateZoneInput,
  eventHistoryFilterSchema,
  type EventHistoryFilter,
} from "@/lib/validations/emergency-coordination";

// ============================================================
// ACTIVATE EMERGENCY
// ============================================================

export async function activateEmergency(
  input: ActivateEmergencyInput,
): Promise<ActionResponse<EmergencyEvent>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = activateEmergencySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Check no active event already exists
    const { data: existing } = await supabase
      .from("emergency_events")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding"])
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return failure(
        "An emergency is already active. Resolve it before activating a new one.",
        ErrorCodes.EMERGENCY_ALREADY_ACTIVE,
      );
    }

    // Count expected students (active enrollments)
    const { count: studentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    // Count expected staff (active tenant members)
    const { count: staffCount } = await supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from("emergency_events")
      .insert({
        tenant_id: context.tenant.id,
        event_type: v.event_type,
        event_type_other: v.event_type_other,
        severity: v.severity,
        status: "activated",
        activated_by: context.user.id,
        activated_at: new Date().toISOString(),
        location_description: v.location_description,
        instructions: v.instructions,
        assembly_point: v.assembly_point,
        linked_drill_id: v.linked_drill_id,
        total_students_expected: studentCount ?? 0,
        total_staff_expected: staffCount ?? 0,
      })
      .select()
      .single();

    if (eventError || !event) {
      return failure(
        eventError?.message ?? "Failed to activate emergency",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Seed event zones from active zones
    const { data: zones } = await supabase
      .from("emergency_zones")
      .select("id, primary_warden_id")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (zones && zones.length > 0) {
      await supabase.from("emergency_event_zones").insert(
        zones.map((z) => ({
          tenant_id: context.tenant.id,
          event_id: event.id,
          zone_id: z.id,
          warden_id: z.primary_warden_id,
          status: "pending",
        })),
      );
    }

    // Seed student accountability from active enrollments
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, class_id")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    if (enrollments && enrollments.length > 0) {
      await supabase.from("emergency_student_accountability").insert(
        enrollments.map((e) => ({
          tenant_id: context.tenant.id,
          event_id: event.id,
          student_id: e.student_id,
          class_id: e.class_id,
          accounted_for: false,
        })),
      );
    }

    // Seed staff accountability from active tenant members
    const { data: staff } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "active");

    if (staff && staff.length > 0) {
      await supabase.from("emergency_staff_accountability").insert(
        staff.map((s) => ({
          tenant_id: context.tenant.id,
          event_id: event.id,
          user_id: s.user_id,
          accounted_for: false,
          status: "responding",
        })),
      );
    }

    // Insert timeline entry
    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: event.id,
      user_id: context.user.id,
      action: "event_activated",
      message: `Emergency activated: ${v.event_type.replace(/_/g, " ")} (${v.severity})`,
      metadata: {
        event_type: v.event_type,
        severity: v.severity,
        students_expected: studentCount ?? 0,
        staff_expected: staffCount ?? 0,
        zones_seeded: zones?.length ?? 0,
      },
    });

    // Audit
    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ACTIVATED,
      entityType: "emergency_event",
      entityId: event.id,
      metadata: {
        event_type: v.event_type,
        severity: v.severity,
        students_expected: studentCount ?? 0,
        staff_expected: staffCount ?? 0,
      },
    });

    return success(event as EmergencyEvent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to activate emergency",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DECLARE ALL CLEAR
// ============================================================

export async function declareAllClear(
  eventId: string,
): Promise<ActionResponse<EmergencyEvent>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("emergency_events")
      .update({
        status: "all_clear",
        all_clear_by: context.user.id,
        all_clear_at: now,
      })
      .eq("id", eventId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding"])
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Emergency not found or not in an active state",
        ErrorCodes.EMERGENCY_NOT_ACTIVE,
      );
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "all_clear_declared",
      message: `All clear declared by ${context.user.first_name} ${context.user.last_name}`,
      metadata: {},
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ALL_CLEAR,
      entityType: "emergency_event",
      entityId: eventId,
      metadata: { event_type: data.event_type },
    });

    return success(data as EmergencyEvent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to declare all clear",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// RESOLVE EVENT
// ============================================================

export async function resolveEvent(
  eventId: string,
  notes?: string,
): Promise<ActionResponse<EmergencyEvent>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("emergency_events")
      .update({
        status: "resolved",
        resolved_at: now,
        resolved_by: context.user.id,
        notes: notes?.trim() || null,
      })
      .eq("id", eventId)
      .eq("tenant_id", context.tenant.id)
      .eq("status", "all_clear")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Emergency not found or not in all-clear state",
        ErrorCodes.INVALID_EMERGENCY_STATUS_TRANSITION,
      );
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "event_resolved",
      message: `Emergency resolved by ${context.user.first_name} ${context.user.last_name}`,
      metadata: { notes: notes?.trim() || null },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_RESOLVED,
      entityType: "emergency_event",
      entityId: eventId,
      metadata: { event_type: data.event_type },
    });

    return success(data as EmergencyEvent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to resolve emergency",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CANCEL EVENT
// ============================================================

export async function cancelEvent(
  eventId: string,
  reason?: string,
): Promise<ActionResponse<EmergencyEvent>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("emergency_events")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancelled_by: context.user.id,
        notes: reason?.trim() || null,
      })
      .eq("id", eventId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding", "all_clear"])
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Emergency not found or already resolved",
        ErrorCodes.EMERGENCY_NOT_ACTIVE,
      );
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "event_cancelled",
      message: `Emergency cancelled${reason ? `: ${reason.trim()}` : ""}`,
      metadata: { reason: reason?.trim() || null },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_CANCELLED,
      entityType: "emergency_event",
      entityId: eventId,
      metadata: { event_type: data.event_type, reason: reason?.trim() || null },
    });

    return success(data as EmergencyEvent);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to cancel emergency",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// REPORT ZONE STATUS
// ============================================================

export async function reportZoneStatus(
  eventId: string,
  input: ReportZoneStatusInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.COORDINATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = reportZoneStatusSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("emergency_event_zones")
      .update({
        status: v.status,
        reported_at: new Date().toISOString(),
        notes: v.notes,
        headcount_reported: v.headcount_reported,
        warden_id: context.user.id,
      })
      .eq("id", v.event_zone_id)
      .eq("tenant_id", context.tenant.id)
      .eq("event_id", eventId)
      .select("id, zone_id")
      .single();

    if (error || !data) {
      return failure(
        "Zone not found for this event",
        ErrorCodes.ZONE_NOT_FOUND,
      );
    }

    const action =
      v.status === "clear"
        ? "zone_cleared"
        : v.status === "needs_assistance"
          ? "zone_needs_assistance"
          : "event_status_changed";

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action,
      message: `Zone reported as ${v.status.replace(/_/g, " ")} by ${context.user.first_name} ${context.user.last_name}`,
      metadata: {
        zone_id: data.zone_id,
        status: v.status,
        headcount: v.headcount_reported,
      },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ZONE_REPORTED,
      entityType: "emergency_event_zone",
      entityId: data.id,
      metadata: { event_id: eventId, zone_status: v.status },
    });

    return success({ id: data.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to report zone status",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ACCOUNT STUDENT
// ============================================================

export async function accountStudent(
  eventId: string,
  input: AccountStudentInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.COORDINATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = accountStudentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("emergency_student_accountability")
      .update({
        accounted_for: v.accounted_for,
        accounted_by: v.accounted_for ? context.user.id : null,
        accounted_at: v.accounted_for ? now : null,
        method: v.accounted_for ? (v.method ?? "roll_call") : null,
        zone_id: v.zone_id,
        notes: v.notes,
      })
      .eq("event_id", eventId)
      .eq("student_id", v.student_id)
      .eq("tenant_id", context.tenant.id)
      .select("id")
      .single();

    if (error || !data) {
      return failure("Student not found for this event", ErrorCodes.NOT_FOUND);
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "student_accounted",
      message: v.accounted_for
        ? `Student accounted for via ${(v.method ?? "roll_call").replace(/_/g, " ")}`
        : "Student marked as unaccounted",
      metadata: {
        student_id: v.student_id,
        accounted_for: v.accounted_for,
        method: v.method,
      },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_STUDENT_ACCOUNTED,
      entityType: "emergency_student_accountability",
      entityId: data.id,
      metadata: {
        event_id: eventId,
        student_id: v.student_id,
        accounted_for: v.accounted_for,
      },
    });

    return success({ id: data.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to account student",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// BULK ACCOUNT STUDENTS
// ============================================================

export async function bulkAccountStudents(
  eventId: string,
  input: BulkAccountStudentsInput,
): Promise<ActionResponse<{ count: number }>> {
  try {
    const context = await requirePermission(Permissions.COORDINATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = bulkAccountStudentsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from("emergency_student_accountability")
      .update({
        accounted_for: true,
        accounted_by: context.user.id,
        accounted_at: now,
        method: v.method,
        zone_id: v.zone_id,
      })
      .eq("event_id", eventId)
      .eq("tenant_id", context.tenant.id)
      .in("student_id", v.student_ids)
      .eq("accounted_for", false);

    if (error) {
      return failure(
        error.message ?? "Failed to bulk account students",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "bulk_students_accounted",
      message: `${count ?? v.student_ids.length} students accounted for via ${v.method.replace(/_/g, " ")}`,
      metadata: {
        count: count ?? v.student_ids.length,
        method: v.method,
      },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_STUDENT_ACCOUNTED,
      entityType: "emergency_student_accountability",
      entityId: eventId,
      metadata: {
        event_id: eventId,
        bulk: true,
        count: count ?? v.student_ids.length,
      },
    });

    return success({ count: count ?? v.student_ids.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to bulk account students",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ACCOUNT STAFF
// ============================================================

export async function accountStaff(
  eventId: string,
  input: AccountStaffInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.COORDINATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = accountStaffSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("emergency_staff_accountability")
      .update({
        accounted_for: true,
        accounted_at: now,
        role_during_event: v.role_during_event || null,
        status: v.status,
        zone_id: v.zone_id,
        notes: v.notes,
      })
      .eq("event_id", eventId)
      .eq("user_id", v.user_id)
      .eq("tenant_id", context.tenant.id)
      .select("id")
      .single();

    if (error || !data) {
      return failure(
        "Staff member not found for this event",
        ErrorCodes.NOT_FOUND,
      );
    }

    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "staff_accounted",
      message: `Staff member checked in as ${v.status.replace(/_/g, " ")}`,
      metadata: {
        staff_user_id: v.user_id,
        role: v.role_during_event,
        status: v.status,
      },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_STAFF_ACCOUNTED,
      entityType: "emergency_staff_accountability",
      entityId: data.id,
      metadata: { event_id: eventId, staff_user_id: v.user_id },
    });

    return success({ id: data.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to account staff",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ADD EVENT NOTE
// ============================================================

export async function addEventNote(
  eventId: string,
  input: AddEventNoteInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.COORDINATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = addEventNoteSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify event exists and is active
    const { data: event } = await supabase
      .from("emergency_events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding", "all_clear"])
      .is("deleted_at", null)
      .maybeSingle();

    if (!event) {
      return failure(
        "Emergency not found or not active",
        ErrorCodes.EMERGENCY_NOT_ACTIVE,
      );
    }

    const { data, error } = await supabase
      .from("emergency_event_log")
      .insert({
        tenant_id: context.tenant.id,
        event_id: eventId,
        user_id: context.user.id,
        action: "note_added",
        message: v.message,
        metadata: {},
      })
      .select("id")
      .single();

    if (error || !data) {
      return failure("Failed to add note", ErrorCodes.CREATE_FAILED);
    }

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_NOTE_ADDED,
      entityType: "emergency_event_log",
      entityId: data.id,
      metadata: { event_id: eventId },
    });

    return success({ id: data.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add note",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// SEND EMERGENCY ANNOUNCEMENT
// ============================================================

export async function sendEmergencyAnnouncement(
  eventId: string,
  input: SendEmergencyAnnouncementInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = sendEmergencyAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Insert as urgent announcement
    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .insert({
        tenant_id: context.tenant.id,
        title: v.title,
        body: v.body,
        priority: "urgent",
        scope: "school",
        published_at: new Date().toISOString(),
        created_by: context.user.id,
      })
      .select("id")
      .single();

    if (annError || !announcement) {
      return failure("Failed to send announcement", ErrorCodes.CREATE_FAILED);
    }

    // Insert timeline entry
    await supabase.from("emergency_event_log").insert({
      tenant_id: context.tenant.id,
      event_id: eventId,
      user_id: context.user.id,
      action: "announcement_sent",
      message: `Emergency announcement: ${v.title}`,
      metadata: {
        announcement_id: announcement.id,
        title: v.title,
      },
    });

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ANNOUNCEMENT_SENT,
      entityType: "announcement",
      entityId: announcement.id,
      metadata: { event_id: eventId, title: v.title },
    });

    return success({ id: announcement.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to send announcement",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET ACTIVE EVENT (Live Coordination Data)
// ============================================================

export async function getActiveEvent(): Promise<
  ActionResponse<EmergencyCoordinationLiveData | null>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_EMERGENCY_COORDINATION,
    );
    const supabase = await createSupabaseServerClient();

    // Fetch active event
    const { data: event } = await supabase
      .from("emergency_events")
      .select(
        "*, activated_by_user:users!emergency_events_activated_by_fkey(id, first_name, last_name)",
      )
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding", "all_clear"])
      .is("deleted_at", null)
      .maybeSingle();

    if (!event) {
      return success(null);
    }

    // Fetch all related data in parallel
    const [zonesResult, studentsResult, staffResult, timelineResult] =
      await Promise.all([
        supabase
          .from("emergency_event_zones")
          .select(
            "*, zone:emergency_zones(id, name, zone_type, location_details, capacity), warden:users!emergency_event_zones_warden_id_fkey(id, first_name, last_name, avatar_url)",
          )
          .eq("event_id", event.id)
          .eq("tenant_id", context.tenant.id),

        supabase
          .from("emergency_student_accountability")
          .select(
            "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
          )
          .eq("event_id", event.id)
          .eq("tenant_id", context.tenant.id)
          .order("accounted_for", { ascending: true }),

        supabase
          .from("emergency_staff_accountability")
          .select("*, user:users(id, first_name, last_name, avatar_url)")
          .eq("event_id", event.id)
          .eq("tenant_id", context.tenant.id)
          .order("accounted_for", { ascending: true }),

        supabase
          .from("emergency_event_log")
          .select("*, user:users(id, first_name, last_name)")
          .eq("event_id", event.id)
          .eq("tenant_id", context.tenant.id)
          .order("created_at", { ascending: true }),
      ]);

    const zones = zonesResult.data ?? [];
    const students = studentsResult.data ?? [];
    const staffMembers = staffResult.data ?? [];
    const timeline = timelineResult.data ?? [];

    const summary = {
      students_accounted: students.filter((s) => s.accounted_for).length,
      students_total: students.length,
      staff_accounted: staffMembers.filter((s) => s.accounted_for).length,
      staff_total: staffMembers.length,
      zones_clear: zones.filter((z) => z.status === "clear").length,
      zones_total: zones.length,
      zones_needing_assistance: zones.filter(
        (z) => z.status === "needs_assistance",
      ).length,
    };

    return success({
      event: event as unknown as EmergencyCoordinationLiveData["event"],
      zones: zones as unknown as EmergencyCoordinationLiveData["zones"],
      student_accountability:
        students as unknown as EmergencyCoordinationLiveData["student_accountability"],
      staff_accountability:
        staffMembers as unknown as EmergencyCoordinationLiveData["staff_accountability"],
      timeline:
        timeline as unknown as EmergencyCoordinationLiveData["timeline"],
      summary,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get active event",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET EVENT DETAIL (for post-event reports)
// ============================================================

export async function getEventDetail(
  eventId: string,
): Promise<ActionResponse<EmergencyCoordinationLiveData>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_EMERGENCY_COORDINATION,
    );
    const supabase = await createSupabaseServerClient();

    const { data: event } = await supabase
      .from("emergency_events")
      .select(
        "*, activated_by_user:users!emergency_events_activated_by_fkey(id, first_name, last_name)",
      )
      .eq("id", eventId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!event) {
      return failure(
        "Emergency event not found",
        ErrorCodes.EMERGENCY_EVENT_NOT_FOUND,
      );
    }

    const [zonesResult, studentsResult, staffResult, timelineResult] =
      await Promise.all([
        supabase
          .from("emergency_event_zones")
          .select(
            "*, zone:emergency_zones(id, name, zone_type, location_details, capacity), warden:users!emergency_event_zones_warden_id_fkey(id, first_name, last_name, avatar_url)",
          )
          .eq("event_id", eventId)
          .eq("tenant_id", context.tenant.id),

        supabase
          .from("emergency_student_accountability")
          .select(
            "*, student:students(id, first_name, last_name, preferred_name, photo_url)",
          )
          .eq("event_id", eventId)
          .eq("tenant_id", context.tenant.id)
          .order("accounted_for", { ascending: true }),

        supabase
          .from("emergency_staff_accountability")
          .select("*, user:users(id, first_name, last_name, avatar_url)")
          .eq("event_id", eventId)
          .eq("tenant_id", context.tenant.id)
          .order("accounted_for", { ascending: true }),

        supabase
          .from("emergency_event_log")
          .select("*, user:users(id, first_name, last_name)")
          .eq("event_id", eventId)
          .eq("tenant_id", context.tenant.id)
          .order("created_at", { ascending: true }),
      ]);

    const zones = zonesResult.data ?? [];
    const students = studentsResult.data ?? [];
    const staffMembers = staffResult.data ?? [];
    const timeline = timelineResult.data ?? [];

    const summary = {
      students_accounted: students.filter((s) => s.accounted_for).length,
      students_total: students.length,
      staff_accounted: staffMembers.filter((s) => s.accounted_for).length,
      staff_total: staffMembers.length,
      zones_clear: zones.filter((z) => z.status === "clear").length,
      zones_total: zones.length,
      zones_needing_assistance: zones.filter(
        (z) => z.status === "needs_assistance",
      ).length,
    };

    return success({
      event: event as unknown as EmergencyCoordinationLiveData["event"],
      zones: zones as unknown as EmergencyCoordinationLiveData["zones"],
      student_accountability:
        students as unknown as EmergencyCoordinationLiveData["student_accountability"],
      staff_accountability:
        staffMembers as unknown as EmergencyCoordinationLiveData["staff_accountability"],
      timeline:
        timeline as unknown as EmergencyCoordinationLiveData["timeline"],
      summary,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get event detail",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET EVENT HISTORY
// ============================================================

export async function getEventHistory(
  filter?: EventHistoryFilter,
): Promise<ActionResponse<EmergencyEventWithActivator[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_EMERGENCY_COORDINATION,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = filter
      ? eventHistoryFilterSchema.safeParse(filter)
      : { success: true as const, data: {} as EventHistoryFilter };
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("emergency_events")
      .select(
        "*, activated_by_user:users!emergency_events_activated_by_fkey(id, first_name, last_name)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("activated_at", { ascending: false })
      .limit(50);

    if (f.event_type) query = query.eq("event_type", f.event_type);
    if (f.status) query = query.eq("status", f.status);
    if (f.from_date) query = query.gte("activated_at", f.from_date);
    if (f.to_date) query = query.lte("activated_at", `${f.to_date}T23:59:59`);

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as unknown as EmergencyEventWithActivator[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get event history",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET COORDINATION DASHBOARD
// ============================================================

export async function getCoordinationDashboard(): Promise<
  ActionResponse<EmergencyCoordinationConfigData>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_EMERGENCY_COORDINATION,
    );
    const supabase = await createSupabaseServerClient();

    const [zonesResult, eventsResult, activeResult] = await Promise.all([
      supabase
        .from("emergency_zones")
        .select(
          "*, primary_warden:users!emergency_zones_primary_warden_id_fkey(id, first_name, last_name, avatar_url)",
        )
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("sort_order"),

      supabase
        .from("emergency_events")
        .select(
          "*, activated_by_user:users!emergency_events_activated_by_fkey(id, first_name, last_name)",
        )
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("activated_at", { ascending: false })
        .limit(10),

      supabase
        .from("emergency_events")
        .select("*")
        .eq("tenant_id", context.tenant.id)
        .in("status", ["activated", "responding"])
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    return success({
      zones: (zonesResult.data ?? []) as unknown as EmergencyZoneWithWarden[],
      recent_events: (eventsResult.data ??
        []) as unknown as EmergencyEventWithActivator[],
      active_event: (activeResult.data as EmergencyEvent) ?? null,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET ACTIVE EMERGENCY BANNER (lightweight, no perm check)
// ============================================================

export async function getActiveEmergencyBanner(): Promise<
  ActionResponse<{
    id: string;
    event_type: string;
    severity: string;
    activated_at: string;
    status: string;
    students_unaccounted: number;
    students_total: number;
  } | null>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data: event } = await supabase
      .from("emergency_events")
      .select("id, event_type, severity, activated_at, status")
      .eq("tenant_id", context.tenant.id)
      .in("status", ["activated", "responding"])
      .is("deleted_at", null)
      .maybeSingle();

    if (!event) return success(null);

    // Get unaccounted student count for the active event
    const { count: totalCount } = await supabase
      .from("emergency_student_accountability")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);

    const { count: accountedCount } = await supabase
      .from("emergency_student_accountability")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("accounted_for", true);

    const studentsTotal = totalCount ?? 0;
    const studentsAccounted = accountedCount ?? 0;

    return success({
      ...event,
      students_unaccounted: studentsTotal - studentsAccounted,
      students_total: studentsTotal,
    });
  } catch {
    return success(null);
  }
}

// ============================================================
// ZONE CRUD
// ============================================================

export async function createZone(
  input: CreateZoneInput,
): Promise<ActionResponse<EmergencyZone>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = createZoneSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("emergency_zones")
      .insert({
        tenant_id: context.tenant.id,
        name: v.name,
        description: v.description,
        zone_type: v.zone_type,
        location_details: v.location_details,
        primary_warden_id: v.primary_warden_id,
        backup_warden_ids: v.backup_warden_ids,
        capacity: v.capacity,
        sort_order: v.sort_order,
        is_active: v.is_active,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create zone",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ZONE_CREATED,
      entityType: "emergency_zone",
      entityId: data.id,
      metadata: { name: v.name, zone_type: v.zone_type },
    });

    return success(data as EmergencyZone);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create zone",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateZone(
  zoneId: string,
  input: UpdateZoneInput,
): Promise<ActionResponse<EmergencyZone>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const parsed = updateZoneSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("emergency_zones")
      .update(v)
      .eq("id", zoneId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure("Zone not found", ErrorCodes.ZONE_NOT_FOUND);
    }

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ZONE_UPDATED,
      entityType: "emergency_zone",
      entityId: zoneId,
      metadata: { changes: Object.keys(v) },
    });

    return success(data as EmergencyZone);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update zone",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteZone(
  zoneId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.ACTIVATE_EMERGENCY);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_zones")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", zoneId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select("id, name")
      .single();

    if (error || !data) {
      return failure("Zone not found", ErrorCodes.ZONE_NOT_FOUND);
    }

    await logAudit({
      context,
      action: AuditActions.EMERGENCY_ZONE_DELETED,
      entityType: "emergency_zone",
      entityId: zoneId,
      metadata: { name: data.name },
    });

    return success({ id: data.id });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete zone",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listZones(): Promise<
  ActionResponse<EmergencyZoneWithWarden[]>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_EMERGENCY_COORDINATION,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_zones")
      .select(
        "*, primary_warden:users!emergency_zones_primary_warden_id_fkey(id, first_name, last_name, avatar_url)",
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("sort_order");

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as unknown as EmergencyZoneWithWarden[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list zones",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
