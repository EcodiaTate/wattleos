"use server";

// src/lib/actions/emergency-drills.ts
//
// ============================================================
// WattleOS V2 - Emergency Drill Server Actions (Reg 97)
// ============================================================
// Regulation 97 - Emergency and evacuation procedures
// Services must practise emergency/evacuation procedures
// regularly (monthly recommended) and maintain records.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  DrillComplianceStatus,
  DrillComplianceSummary,
  DrillParticipantWithStudent,
  DrillType,
  EmergencyDrill,
  EmergencyDrillDashboardData,
  EmergencyDrillWithDetails,
} from "@/types/domain";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  bulkAccountSchema,
  completeDrillSchema,
  createDrillSchema,
  debriefSchema,
  listDrillsFilterSchema,
  updateDrillSchema,
  updateParticipantSchema,
  type BulkAccountInput,
  type CompleteDrillInput,
  type CreateDrillInput,
  type DebriefInput,
  type ListDrillsFilter,
  type UpdateDrillInput,
  type UpdateParticipantInput,
} from "@/lib/validations/emergency-drills";

// ── Standard drill types for compliance tracking ─────────────
const STANDARD_DRILL_TYPES: DrillType[] = [
  "fire_evacuation",
  "lockdown",
  "shelter_in_place",
  "medical_emergency",
];

// ============================================================
// CREATE DRILL
// ============================================================

export async function createDrill(
  input: CreateDrillInput,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = createDrillSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("emergency_drills")
      .insert({
        tenant_id: context.tenant.id,
        drill_type: v.drill_type,
        drill_type_other: v.drill_type_other,
        scenario_description: v.scenario_description,
        scheduled_date: v.scheduled_date,
        scheduled_time: v.scheduled_time,
        assembly_point: v.assembly_point,
        location_notes: v.location_notes,
        is_whole_of_service: v.is_whole_of_service,
        participating_class_ids: v.participating_class_ids,
        staff_participant_ids: v.staff_participant_ids,
        notes: v.notes,
        initiated_by: context.user.id,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to create drill",
        ErrorCodes.CREATE_FAILED,
      );
    }

    // Auto-seed participant rows from class enrollments
    let studentIds: string[] = [];

    if (v.is_whole_of_service) {
      // All active students in tenant
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("tenant_id", context.tenant.id)
        .eq("status", "active");
      studentIds = (students ?? []).map((s) => s.id);
    } else if (v.participating_class_ids.length > 0) {
      // Students enrolled in selected classes
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("tenant_id", context.tenant.id)
        .in("class_id", v.participating_class_ids)
        .eq("status", "active");
      // De-duplicate (student may be in multiple classes)
      studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id))];
    }

    if (studentIds.length > 0) {
      const participantRows = studentIds.map((studentId) => ({
        tenant_id: context.tenant.id,
        drill_id: data.id,
        student_id: studentId,
      }));
      const { error: participantError } = await supabase
        .from("emergency_drill_participants")
        .insert(participantRows);

      if (participantError) {
        // Rollback drill creation - can't have a drill without participants
        await supabase.from("emergency_drills").delete().eq("id", data.id);
        return failure(
          "Failed to add drill participants",
          ErrorCodes.CREATE_FAILED,
        );
      }
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_CREATED,
      entityType: "emergency_drill",
      entityId: data.id,
      metadata: {
        drill_type: v.drill_type,
        scheduled_date: v.scheduled_date,
        is_whole_of_service: v.is_whole_of_service,
        class_count: v.participating_class_ids.length,
        student_count: studentIds.length,
      },
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE DRILL (only when scheduled)
// ============================================================

export async function updateDrill(
  drillId: string,
  input: UpdateDrillInput,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = updateDrillSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Only editable while scheduled
    const { data: existing } = await supabase
      .from("emergency_drills")
      .select("status")
      .eq("id", drillId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return failure("Drill not found", ErrorCodes.DRILL_NOT_FOUND);
    }

    if (existing.status !== "scheduled") {
      return failure(
        "Only scheduled drills can be edited",
        ErrorCodes.DRILL_NOT_EDITABLE,
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (v.drill_type !== undefined) updatePayload.drill_type = v.drill_type;
    if (v.drill_type_other !== undefined)
      updatePayload.drill_type_other = v.drill_type_other;
    if (v.scenario_description !== undefined)
      updatePayload.scenario_description = v.scenario_description;
    if (v.scheduled_date !== undefined)
      updatePayload.scheduled_date = v.scheduled_date;
    if (v.scheduled_time !== undefined)
      updatePayload.scheduled_time = v.scheduled_time;
    if (v.assembly_point !== undefined)
      updatePayload.assembly_point = v.assembly_point;
    if (v.location_notes !== undefined)
      updatePayload.location_notes = v.location_notes;
    if (v.is_whole_of_service !== undefined)
      updatePayload.is_whole_of_service = v.is_whole_of_service;
    if (v.participating_class_ids !== undefined)
      updatePayload.participating_class_ids = v.participating_class_ids;
    if (v.staff_participant_ids !== undefined)
      updatePayload.staff_participant_ids = v.staff_participant_ids;
    if (v.notes !== undefined) updatePayload.notes = v.notes;

    const { data, error } = await supabase
      .from("emergency_drills")
      .update(updatePayload)
      .eq("id", drillId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        error?.message ?? "Failed to update drill",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_UPDATED,
      entityType: "emergency_drill",
      entityId: drillId,
      metadata: { updated_fields: Object.keys(updatePayload) },
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET DRILL (with details)
// ============================================================

export async function getDrill(
  drillId: string,
): Promise<ActionResponse<EmergencyDrillWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_EMERGENCY_DRILLS);
    const supabase = await createSupabaseServerClient();

    const { data: drill, error } = await supabase
      .from("emergency_drills")
      .select("*")
      .eq("id", drillId)
      .is("deleted_at", null)
      .single();

    if (error || !drill) {
      return failure("Drill not found", ErrorCodes.DRILL_NOT_FOUND);
    }

    // Fetch participants and user names in parallel
    const [participantsResult, initiatorResult, debriefUserResult] =
      await Promise.all([
        supabase
          .from("emergency_drill_participants")
          .select("*")
          .eq("drill_id", drillId)
          .order("created_at", { ascending: true }),
        drill.initiated_by
          ? supabase
              .from("users")
              .select("id, first_name, last_name")
              .eq("id", drill.initiated_by)
              .single()
          : Promise.resolve({ data: null }),
        drill.debrief_conducted_by
          ? supabase
              .from("users")
              .select("id, first_name, last_name")
              .eq("id", drill.debrief_conducted_by)
              .single()
          : Promise.resolve({ data: null }),
      ]);

    return success({
      ...(drill as EmergencyDrill),
      participants: (participantsResult.data ??
        []) as EmergencyDrillWithDetails["participants"],
      initiated_by_user:
        initiatorResult.data as EmergencyDrillWithDetails["initiated_by_user"],
      debrief_user:
        debriefUserResult.data as EmergencyDrillWithDetails["debrief_user"],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST DRILLS
// ============================================================

export async function listDrills(
  filters?: ListDrillsFilter,
): Promise<ActionResponse<EmergencyDrill[]>> {
  try {
    await requirePermission(Permissions.VIEW_EMERGENCY_DRILLS);
    const supabase = await createSupabaseServerClient();

    const parsed = listDrillsFilterSchema.safeParse(filters ?? {});
    const f = parsed.success ? parsed.data : {};

    let query = supabase
      .from("emergency_drills")
      .select("*")
      .is("deleted_at", null)
      .order("scheduled_date", { ascending: false });

    if (f.drill_type) query = query.eq("drill_type", f.drill_type);
    if (f.status) query = query.eq("status", f.status);
    if (f.from_date) query = query.gte("scheduled_date", f.from_date);
    if (f.to_date) query = query.lte("scheduled_date", f.to_date);

    const { data, error } = await query;

    if (error) {
      return failure(
        error.message ?? "Failed to list drills",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    return success((data ?? []) as EmergencyDrill[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// START DRILL (scheduled → in_progress)
// ============================================================

export async function startDrill(
  drillId: string,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_drills")
      .update({
        status: "in_progress",
        actual_start_at: new Date().toISOString(),
      })
      .eq("id", drillId)
      .eq("status", "scheduled")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Drill not found or not in scheduled status",
        ErrorCodes.DRILL_NOT_EDITABLE,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_STARTED,
      entityType: "emergency_drill",
      entityId: drillId,
      metadata: { drill_type: data.drill_type },
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COMPLETE DRILL (in_progress → completed)
// ============================================================

export async function completeDrill(
  drillId: string,
  input?: CompleteDrillInput,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = completeDrillSchema.safeParse(input ?? {});
    const v = parsed.success ? parsed.data : { evacuation_time_seconds: null };

    const { data, error } = await supabase
      .from("emergency_drills")
      .update({
        status: "completed",
        actual_end_at: new Date().toISOString(),
        evacuation_time_seconds: v.evacuation_time_seconds,
      })
      .eq("id", drillId)
      .eq("status", "in_progress")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Drill not found or not in progress",
        ErrorCodes.DRILL_NOT_EDITABLE,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_COMPLETED,
      entityType: "emergency_drill",
      entityId: drillId,
      metadata: {
        drill_type: data.drill_type,
        evacuation_time_seconds: v.evacuation_time_seconds,
      },
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CANCEL DRILL (scheduled → cancelled)
// ============================================================

export async function cancelDrill(
  drillId: string,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_drills")
      .update({ status: "cancelled" })
      .eq("id", drillId)
      .eq("status", "scheduled")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Drill not found or cannot be cancelled",
        ErrorCodes.DRILL_NOT_EDITABLE,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_CANCELLED,
      entityType: "emergency_drill",
      entityId: drillId,
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// SUBMIT DEBRIEF (only when completed)
// ============================================================

export async function submitDebrief(
  drillId: string,
  input: DebriefInput,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = debriefSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("emergency_drills")
      .update({
        effectiveness_rating: v.effectiveness_rating,
        issues_observed: v.issues_observed,
        corrective_actions: v.corrective_actions,
        follow_up_required: v.follow_up_required,
        follow_up_notes: v.follow_up_notes,
        debrief_notes: v.debrief_notes,
        debrief_conducted_by: context.user.id,
      })
      .eq("id", drillId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Drill not found or not completed",
        ErrorCodes.DRILL_NOT_EDITABLE,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_DEBRIEF_SUBMITTED,
      entityType: "emergency_drill",
      entityId: drillId,
      metadata: {
        effectiveness_rating: v.effectiveness_rating,
        follow_up_required: v.follow_up_required,
      },
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE PARTICIPANT (headcount verification)
// ============================================================

export async function updateParticipant(
  drillId: string,
  input: UpdateParticipantInput,
): Promise<ActionResponse<{ updated: boolean }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = updateParticipantSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { error } = await supabase
      .from("emergency_drill_participants")
      .update({
        accounted_for: v.accounted_for,
        accounted_at: v.accounted_for ? new Date().toISOString() : null,
        assembly_time_seconds: v.assembly_time_seconds,
        response_notes: v.response_notes,
        needed_assistance: v.needed_assistance,
      })
      .eq("drill_id", drillId)
      .eq("student_id", v.student_id)
      .eq("tenant_id", context.tenant.id);

    if (error) {
      return failure(
        error.message ?? "Failed to update participant",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_PARTICIPANT_UPDATED,
      entityType: "emergency_drill_participant",
      entityId: drillId,
      metadata: {
        student_id: v.student_id,
        accounted_for: v.accounted_for,
        needed_assistance: v.needed_assistance,
      },
    });

    return success({ updated: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// BULK ACCOUNT STUDENTS
// ============================================================

export async function bulkAccountStudents(
  drillId: string,
  input: BulkAccountInput,
): Promise<ActionResponse<{ count: number }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = bulkAccountSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("emergency_drill_participants")
      .update({
        accounted_for: true,
        accounted_at: now,
      })
      .eq("drill_id", drillId)
      .eq("tenant_id", context.tenant.id)
      .in("student_id", v.student_ids);

    if (error) {
      return failure(
        error.message ?? "Failed to update participants",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_PARTICIPANT_UPDATED,
      entityType: "emergency_drill_participant",
      entityId: drillId,
      metadata: { bulk: true, student_count: v.student_ids.length },
    });

    return success({ count: v.student_ids.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET DRILL PARTICIPANTS (with student names)
// ============================================================

export async function getDrillParticipants(
  drillId: string,
): Promise<ActionResponse<DrillParticipantWithStudent[]>> {
  try {
    await requirePermission(Permissions.VIEW_EMERGENCY_DRILLS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_drill_participants")
      .select(
        `
        *,
        student:students!student_id (
          id, first_name, last_name, preferred_name, photo_url
        )
      `,
      )
      .eq("drill_id", drillId)
      .order("created_at", { ascending: true });

    if (error) {
      return failure(
        error.message ?? "Failed to load participants",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    return success((data ?? []) as DrillParticipantWithStudent[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COMPLETE FOLLOW-UP
// ============================================================

export async function completeFollowUp(
  drillId: string,
): Promise<ActionResponse<EmergencyDrill>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_EMERGENCY_DRILLS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("emergency_drills")
      .update({
        follow_up_completed_at: new Date().toISOString(),
      })
      .eq("id", drillId)
      .eq("follow_up_required", true)
      .is("follow_up_completed_at", null)
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure(
        "Follow-up not found or already completed",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DRILL_FOLLOW_UP_COMPLETED,
      entityType: "emergency_drill",
      entityId: drillId,
    });

    return success(data as EmergencyDrill);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET DRILL DASHBOARD
// ============================================================

export async function getDrillDashboard(): Promise<
  ActionResponse<EmergencyDrillDashboardData>
> {
  try {
    await requirePermission(Permissions.VIEW_EMERGENCY_DRILLS);
    const supabase = await createSupabaseServerClient();
    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;

    // Fetch data in parallel
    const [completedResult, scheduledResult, recentResult, followUpsResult] =
      await Promise.all([
        // All completed drills (for compliance calculations)
        supabase
          .from("emergency_drills")
          .select("id, drill_type, scheduled_date, evacuation_time_seconds")
          .eq("status", "completed")
          .is("deleted_at", null)
          .order("scheduled_date", { ascending: false }),
        // Upcoming scheduled drills
        supabase
          .from("emergency_drills")
          .select("*")
          .eq("status", "scheduled")
          .is("deleted_at", null)
          .gte("scheduled_date", today.toISOString().slice(0, 10))
          .order("scheduled_date", { ascending: true })
          .limit(5),
        // Recent 10 drills (any status)
        supabase
          .from("emergency_drills")
          .select("*")
          .is("deleted_at", null)
          .neq("status", "cancelled")
          .order("scheduled_date", { ascending: false })
          .limit(10),
        // Pending follow-ups
        supabase
          .from("emergency_drills")
          .select("id", { count: "exact" })
          .eq("status", "completed")
          .eq("follow_up_required", true)
          .is("follow_up_completed_at", null)
          .is("deleted_at", null),
      ]);

    const completed = (completedResult.data ?? []) as Array<{
      id: string;
      drill_type: DrillType;
      scheduled_date: string;
      evacuation_time_seconds: number | null;
    }>;

    // ── Compliance by type ──────────────────────────────────
    const todayMs = today.getTime();
    const complianceByType: DrillComplianceSummary[] = STANDARD_DRILL_TYPES.map(
      (drillType) => {
        const drillsOfType = completed.filter(
          (d) => d.drill_type === drillType,
        );
        const thisYear = drillsOfType.filter(
          (d) => d.scheduled_date >= yearStart,
        );
        const latest = drillsOfType[0]; // already sorted DESC

        const daysSince = latest
          ? Math.floor(
              (todayMs - new Date(latest.scheduled_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        const evacTimes = drillsOfType
          .filter((d) => d.evacuation_time_seconds != null)
          .map((d) => d.evacuation_time_seconds!);
        const avgEvac =
          evacTimes.length > 0
            ? Math.round(
                evacTimes.reduce((a, b) => a + b, 0) / evacTimes.length,
              )
            : null;

        return {
          drill_type: drillType,
          last_drill_date: latest?.scheduled_date ?? null,
          days_since_last: daysSince,
          is_overdue: daysSince !== null ? daysSince > 31 : true,
          is_at_risk:
            daysSince !== null ? daysSince >= 25 && daysSince <= 31 : false,
          drills_this_year: thisYear.length,
          average_evacuation_seconds: avgEvac,
        };
      },
    );

    // ── Overall status ──────────────────────────────────────
    let overallStatus: DrillComplianceStatus = "compliant";
    if (complianceByType.some((c) => c.is_overdue)) {
      overallStatus = "overdue";
    } else if (complianceByType.some((c) => c.is_at_risk)) {
      overallStatus = "at_risk";
    }

    // ── Monthly counts (last 12 months) ──────────────────────
    const monthlyCounts: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = completed.filter((drill) =>
        drill.scheduled_date.startsWith(monthStr),
      ).length;
      monthlyCounts.push({ month: monthStr, count });
    }

    // ── Total this year ─────────────────────────────────────
    const totalThisYear = completed.filter(
      (d) => d.scheduled_date >= yearStart,
    ).length;

    return success({
      compliance_by_type: complianceByType,
      overall_status: overallStatus,
      next_scheduled: (scheduledResult.data ?? []) as EmergencyDrill[],
      recent_drills: (recentResult.data ?? []) as EmergencyDrill[],
      total_this_year: totalThisYear,
      follow_ups_pending: followUpsResult.count ?? 0,
      monthly_counts: monthlyCounts,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
