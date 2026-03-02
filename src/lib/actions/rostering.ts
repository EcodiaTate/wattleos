"use server";

// src/lib/actions/rostering.ts
//
// ============================================================
// WattleOS V2 - Staff Rostering Server Actions (Module N)
// ============================================================
// Forward-looking shift schedule management: templates, weekly
// rosters, shift assignments, leave requests, shift swaps,
// coverage/relief, and staff availability.
//
// WHY separate from timesheets: Shifts are the PLAN (what
// should happen). Time entries are the RECORD (what did
// happen). They are linked by (user_id, date) but managed
// independently.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getWeekDates, getWeekStartDate } from "@/lib/constants/rostering";
import { LEAVE_TYPE_CONFIG } from "@/lib/constants/rostering";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  acceptCoverageRequestSchema,
  cancelShiftSchema,
  createCoverageRequestSchema,
  createLeaveRequestSchema,
  createRosterTemplateSchema,
  createRosterWeekSchema,
  createShiftSchema,
  createTemplateShiftSchema,
  leaveFilterSchema,
  publishRosterWeekSchema,
  requestShiftSwapSchema,
  resolveCoverageRequestSchema,
  respondToSwapSchema,
  reviewLeaveRequestSchema,
  reviewSwapRequestSchema,
  rosterFilterSchema,
  setRecurringAvailabilitySchema,
  setSpecificDateAvailabilitySchema,
  updateRosterTemplateSchema,
  updateShiftSchema,
  type AcceptCoverageRequestInput,
  type CancelShiftInput,
  type CreateCoverageRequestInput,
  type CreateLeaveRequestInput,
  type CreateRosterTemplateInput,
  type CreateRosterWeekInput,
  type CreateShiftInput,
  type CreateTemplateShiftInput,
  type LeaveFilterInput,
  type RequestShiftSwapInput,
  type ResolveCoverageRequestInput,
  type RespondToSwapInput,
  type ReviewLeaveRequestInput,
  type ReviewSwapRequestInput,
  type RosterFilterInput,
  type SetRecurringAvailabilityInput,
  type SetSpecificDateAvailabilityInput,
  type UpdateRosterTemplateInput,
  type UpdateShiftInput,
} from "@/lib/validations/rostering";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  LeaveRequest,
  LeaveRequestWithUser,
  MyScheduleData,
  RosterDashboardData,
  RosterTemplate,
  RosterTemplateShift,
  RosterTemplateWithShifts,
  RosterWeek,
  RosterWeekWithShifts,
  Shift,
  ShiftCoverageRequest,
  ShiftCoverageRequestWithDetails,
  ShiftSwapRequest,
  ShiftSwapRequestWithDetails,
  ShiftWithDetails,
  StaffAvailability,
} from "@/types/domain";

// ============================================================
// ROSTER TEMPLATES
// ============================================================

export async function createRosterTemplate(
  input: CreateRosterTemplateInput,
): Promise<ActionResponse<RosterTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = createRosterTemplateSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("roster_templates")
      .insert({
        tenant_id: context.tenant.id,
        name: v.name,
        description: v.description || null,
        program_id: v.programId || null,
        effective_from: v.effectiveFrom || null,
        effective_until: v.effectiveUntil || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_TEMPLATE_CREATED,
      entityType: "roster_template",
      entityId: (data as RosterTemplate).id,
      metadata: { name: v.name },
    });

    return success(data as RosterTemplate);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create template",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateRosterTemplate(
  input: UpdateRosterTemplateInput,
): Promise<ActionResponse<RosterTemplate>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = updateRosterTemplateSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { templateId, ...updates } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description || null;
    if (updates.programId !== undefined)
      updateData.program_id = updates.programId || null;
    if (updates.effectiveFrom !== undefined)
      updateData.effective_from = updates.effectiveFrom || null;
    if (updates.effectiveUntil !== undefined)
      updateData.effective_until = updates.effectiveUntil || null;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from("roster_templates")
      .update(updateData)
      .eq("id", templateId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_TEMPLATE_UPDATED,
      entityType: "roster_template",
      entityId: templateId,
      metadata: updateData,
    });

    return success(data as RosterTemplate);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update template",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteRosterTemplate(
  templateId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("roster_templates")
      .update({ is_active: false })
      .eq("id", templateId);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_TEMPLATE_DELETED,
      entityType: "roster_template",
      entityId: templateId,
    });

    return success({ deleted: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete template",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listRosterTemplates(): Promise<
  ActionResponse<RosterTemplate[]>
> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("roster_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as RosterTemplate[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list templates",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getRosterTemplateWithShifts(
  templateId: string,
): Promise<ActionResponse<RosterTemplateWithShifts>> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data: template, error: tErr } = await supabase
      .from("roster_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (tErr || !template)
      return failure("Template not found", ErrorCodes.NOT_FOUND);

    const { data: shifts, error: sErr } = await supabase
      .from("roster_template_shifts")
      .select(
        `*, user:users!roster_template_shifts_user_id_fkey(first_name, last_name), class:classes!roster_template_shifts_class_id_fkey(name)`,
      )
      .eq("template_id", templateId)
      .order("day_of_week")
      .order("start_time");

    if (sErr) return failure(sErr.message, ErrorCodes.DATABASE_ERROR);

    const enrichedShifts = (
      (shifts ?? []) as Array<Record<string, unknown>>
    ).map((s) => {
      const user = s.user as { first_name: string; last_name: string } | null;
      const cls = s.class as { name: string } | null;
      return {
        ...s,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        class_name: cls?.name ?? null,
      };
    });

    return success({
      ...(template as RosterTemplate),
      shifts: enrichedShifts,
    } as RosterTemplateWithShifts);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get template",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// TEMPLATE SHIFTS
// ============================================================

export async function addTemplateShift(
  input: CreateTemplateShiftInput,
): Promise<ActionResponse<RosterTemplateShift>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = createTemplateShiftSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("roster_template_shifts")
      .insert({
        tenant_id: context.tenant.id,
        template_id: v.templateId,
        user_id: v.userId,
        day_of_week: v.dayOfWeek,
        start_time: v.startTime,
        end_time: v.endTime,
        break_minutes: v.breakMinutes,
        class_id: v.classId || null,
        shift_role: v.shiftRole,
        notes: v.notes || null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as RosterTemplateShift);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add template shift",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function deleteTemplateShift(
  shiftId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("roster_template_shifts")
      .delete()
      .eq("id", shiftId);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success({ deleted: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete template shift",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ROSTER WEEKS
// ============================================================

export async function createRosterWeek(
  input: CreateRosterWeekInput,
): Promise<ActionResponse<RosterWeek>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = createRosterWeekSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Normalise to Monday
    const weekStart = getWeekStartDate(v.weekStartDate);

    // Check for existing week
    const { data: existing } = await supabase
      .from("roster_weeks")
      .select("id")
      .eq("week_start_date", weekStart)
      .maybeSingle();

    if (existing) {
      return failure(
        "A roster already exists for this week",
        ErrorCodes.ALREADY_EXISTS,
      );
    }

    const { data, error } = await supabase
      .from("roster_weeks")
      .insert({
        tenant_id: context.tenant.id,
        week_start_date: weekStart,
        template_id: v.templateId || null,
        notes: v.notes || null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_WEEK_CREATED,
      entityType: "roster_week",
      entityId: (data as RosterWeek).id,
      metadata: { week_start_date: weekStart },
    });

    return success(data as RosterWeek);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create roster week",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function generateShiftsFromTemplate(
  rosterWeekId: string,
  templateId: string,
): Promise<ActionResponse<{ count: number }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    // Get the roster week
    const { data: week, error: wErr } = await supabase
      .from("roster_weeks")
      .select("*")
      .eq("id", rosterWeekId)
      .single();

    if (wErr || !week)
      return failure("Roster week not found", ErrorCodes.NOT_FOUND);
    const typedWeek = week as RosterWeek;

    if (typedWeek.status !== "draft") {
      return failure(
        "Can only generate shifts for draft rosters",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Get template shifts
    const { data: templateShifts, error: tsErr } = await supabase
      .from("roster_template_shifts")
      .select("*")
      .eq("template_id", templateId);

    if (tsErr) return failure(tsErr.message, ErrorCodes.DATABASE_ERROR);
    if (!templateShifts || templateShifts.length === 0) {
      return failure(
        "Template has no shifts to generate from",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Map template shifts to concrete dates
    const weekDates = getWeekDates(typedWeek.week_start_date);
    const shiftRows = (templateShifts as RosterTemplateShift[]).map((ts) => ({
      tenant_id: context.tenant.id,
      roster_week_id: rosterWeekId,
      user_id: ts.user_id,
      date: weekDates[ts.day_of_week - 1],
      start_time: ts.start_time,
      end_time: ts.end_time,
      break_minutes: ts.break_minutes,
      class_id: ts.class_id,
      shift_role: ts.shift_role,
      notes: ts.notes,
    }));

    const { error: insertErr } = await supabase
      .from("shifts")
      .insert(shiftRows);

    if (insertErr) return failure(insertErr.message, ErrorCodes.DATABASE_ERROR);

    // Link template to the week
    await supabase
      .from("roster_weeks")
      .update({ template_id: templateId })
      .eq("id", rosterWeekId);

    return success({ count: shiftRows.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to generate shifts",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function publishRosterWeek(input: {
  rosterWeekId: string;
}): Promise<ActionResponse<RosterWeek>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = publishRosterWeekSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data: week, error: checkErr } = await supabase
      .from("roster_weeks")
      .select("status")
      .eq("id", parsed.data.rosterWeekId)
      .single();

    if (checkErr || !week)
      return failure("Roster week not found", ErrorCodes.NOT_FOUND);
    if ((week as { status: string }).status !== "draft") {
      return failure(
        "Can only publish draft rosters",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("roster_weeks")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_by: context.user.id,
      })
      .eq("id", parsed.data.rosterWeekId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_WEEK_PUBLISHED,
      entityType: "roster_week",
      entityId: parsed.data.rosterWeekId,
    });

    return success(data as RosterWeek);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to publish roster",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function lockRosterWeek(
  rosterWeekId: string,
): Promise<ActionResponse<RosterWeek>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data: week, error: checkErr } = await supabase
      .from("roster_weeks")
      .select("status")
      .eq("id", rosterWeekId)
      .single();

    if (checkErr || !week)
      return failure("Roster week not found", ErrorCodes.NOT_FOUND);
    if ((week as { status: string }).status !== "published") {
      return failure(
        "Can only lock published rosters",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("roster_weeks")
      .update({ status: "locked" })
      .eq("id", rosterWeekId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.ROSTER_WEEK_LOCKED,
      entityType: "roster_week",
      entityId: rosterWeekId,
    });

    return success(data as RosterWeek);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to lock roster",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getRosterWeekWithShifts(
  rosterWeekId: string,
): Promise<ActionResponse<RosterWeekWithShifts>> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data: week, error: wErr } = await supabase
      .from("roster_weeks")
      .select("*")
      .eq("id", rosterWeekId)
      .single();

    if (wErr || !week)
      return failure("Roster week not found", ErrorCodes.NOT_FOUND);

    const { data: shifts, error: sErr } = await supabase
      .from("shifts")
      .select(
        `
        *,
        user:users!shifts_user_id_fkey(first_name, last_name, avatar_url),
        class:classes!shifts_class_id_fkey(name),
        covers_for:users!shifts_covers_for_user_id_fkey(first_name, last_name)
      `,
      )
      .eq("roster_week_id", rosterWeekId)
      .neq("status", "cancelled")
      .order("date")
      .order("start_time");

    if (sErr) return failure(sErr.message, ErrorCodes.DATABASE_ERROR);

    const enrichedShifts: ShiftWithDetails[] = (
      (shifts ?? []) as Array<Record<string, unknown>>
    ).map((s) => {
      const user = s.user as {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      } | null;
      const cls = s.class as { name: string } | null;
      const coversFor = s.covers_for as {
        first_name: string;
        last_name: string;
      } | null;
      return {
        id: s.id as string,
        tenant_id: s.tenant_id as string,
        roster_week_id: s.roster_week_id as string,
        user_id: s.user_id as string,
        date: s.date as string,
        start_time: s.start_time as string,
        end_time: s.end_time as string,
        break_minutes: s.break_minutes as number,
        class_id: s.class_id as string | null,
        shift_role: s.shift_role as string,
        status: s.status as string,
        covers_for_user_id: s.covers_for_user_id as string | null,
        coverage_request_id: s.coverage_request_id as string | null,
        expected_hours: s.expected_hours as number,
        notes: s.notes as string | null,
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        user_avatar: user?.avatar_url ?? null,
        class_name: cls?.name ?? null,
        covers_for_name: coversFor
          ? `${coversFor.first_name} ${coversFor.last_name}`
          : null,
      } as ShiftWithDetails;
    });

    const totalHours = enrichedShifts.reduce(
      (sum, s) => sum + s.expected_hours,
      0,
    );
    const uniqueStaff = new Set(enrichedShifts.map((s) => s.user_id));

    return success({
      ...(week as RosterWeek),
      shifts: enrichedShifts,
      total_staff_count: uniqueStaff.size,
      total_shift_hours: Math.round(totalHours * 100) / 100,
    } as RosterWeekWithShifts);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get roster week",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listRosterWeeks(
  filter?: RosterFilterInput,
): Promise<ActionResponse<RosterWeek[]>> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = rosterFilterSchema.safeParse(filter ?? {});
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("roster_weeks")
      .select("*")
      .order("week_start_date", { ascending: false })
      .limit(20);

    if (f.weekStartDate) query = query.eq("week_start_date", f.weekStartDate);
    if (f.status) query = query.eq("status", f.status);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as RosterWeek[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list roster weeks",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getCurrentRosterWeek(): Promise<
  ActionResponse<RosterWeek | null>
> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];
    const weekStart = getWeekStartDate(today);

    const { data, error } = await supabase
      .from("roster_weeks")
      .select("*")
      .eq("week_start_date", weekStart)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data as RosterWeek) ?? null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get current week",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// SHIFTS
// ============================================================

export async function createShift(
  input: CreateShiftInput,
): Promise<ActionResponse<Shift>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = createShiftSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify roster week exists and is editable
    const { data: week } = await supabase
      .from("roster_weeks")
      .select("status")
      .eq("id", v.rosterWeekId)
      .single();

    if (!week) return failure("Roster week not found", ErrorCodes.NOT_FOUND);
    if ((week as { status: string }).status === "locked") {
      return failure(
        "Cannot add shifts to a locked roster",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        tenant_id: context.tenant.id,
        roster_week_id: v.rosterWeekId,
        user_id: v.userId,
        date: v.date,
        start_time: v.startTime,
        end_time: v.endTime,
        break_minutes: v.breakMinutes,
        class_id: v.classId || null,
        shift_role: v.shiftRole,
        covers_for_user_id: v.coversForUserId || null,
        coverage_request_id: v.coverageRequestId || null,
        notes: v.notes || null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.SHIFT_CREATED,
      entityType: "shift",
      entityId: (data as Shift).id,
      metadata: { user_id: v.userId, date: v.date },
    });

    return success(data as Shift);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create shift",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function updateShift(
  input: UpdateShiftInput,
): Promise<ActionResponse<Shift>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = updateShiftSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const { shiftId, ...updates } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (updates.startTime !== undefined)
      updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.breakMinutes !== undefined)
      updateData.break_minutes = updates.breakMinutes;
    if (updates.classId !== undefined) updateData.class_id = updates.classId;
    if (updates.shiftRole !== undefined)
      updateData.shift_role = updates.shiftRole;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from("shifts")
      .update(updateData)
      .eq("id", shiftId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.SHIFT_UPDATED,
      entityType: "shift",
      entityId: shiftId,
      metadata: updateData,
    });

    return success(data as Shift);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update shift",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function cancelShift(
  input: CancelShiftInput,
): Promise<ActionResponse<Shift>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = cancelShiftSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("shifts")
      .update({ status: "cancelled", notes: v.reason })
      .eq("id", v.shiftId)
      .in("status", ["scheduled", "confirmed"])
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data)
      return failure(
        "Shift not found or already completed/cancelled",
        ErrorCodes.NOT_FOUND,
      );

    await logAudit({
      context,
      action: AuditActions.SHIFT_CANCELLED,
      entityType: "shift",
      entityId: v.shiftId,
      metadata: { reason: v.reason },
    });

    return success(data as Shift);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to cancel shift",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getMyShifts(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<ActionResponse<ShiftWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("shifts")
      .select(
        `
        *,
        user:users!shifts_user_id_fkey(first_name, last_name, avatar_url),
        class:classes!shifts_class_id_fkey(name),
        covers_for:users!shifts_covers_for_user_id_fkey(first_name, last_name)
      `,
      )
      .eq("user_id", context.user.id)
      .neq("status", "cancelled")
      .order("date")
      .order("start_time");

    if (params?.startDate) query = query.gte("date", params.startDate);
    if (params?.endDate) query = query.lte("date", params.endDate);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const enriched = mapShiftsWithDetails(data);
    return success(enriched);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get shifts",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getShiftsForDate(
  date: string,
): Promise<ActionResponse<ShiftWithDetails[]>> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shifts")
      .select(
        `
        *,
        user:users!shifts_user_id_fkey(first_name, last_name, avatar_url),
        class:classes!shifts_class_id_fkey(name),
        covers_for:users!shifts_covers_for_user_id_fkey(first_name, last_name)
      `,
      )
      .eq("date", date)
      .neq("status", "cancelled")
      .order("start_time");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const enriched = mapShiftsWithDetails(data);
    return success(enriched);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get shifts for date",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getShiftsForUser(
  userId: string,
  params?: { startDate?: string; endDate?: string },
): Promise<ActionResponse<ShiftWithDetails[]>> {
  try {
    await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("shifts")
      .select(
        `
        *,
        user:users!shifts_user_id_fkey(first_name, last_name, avatar_url),
        class:classes!shifts_class_id_fkey(name),
        covers_for:users!shifts_covers_for_user_id_fkey(first_name, last_name)
      `,
      )
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("date")
      .order("start_time");

    if (params?.startDate) query = query.gte("date", params.startDate);
    if (params?.endDate) query = query.lte("date", params.endDate);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const enriched = mapShiftsWithDetails(data);
    return success(enriched);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get shifts for user",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// STAFF AVAILABILITY
// ============================================================

export async function setRecurringAvailability(
  input: SetRecurringAvailabilityInput,
): Promise<ActionResponse<StaffAvailability>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = setRecurringAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Upsert: replace existing recurring availability for this day
    const { data: existing } = await supabase
      .from("staff_availability")
      .select("id")
      .eq("user_id", context.user.id)
      .eq("is_recurring", true)
      .eq("day_of_week", v.dayOfWeek)
      .maybeSingle();

    let data: unknown;
    let error: { message: string } | null;

    if (existing) {
      const result = await supabase
        .from("staff_availability")
        .update({
          is_available: v.isAvailable,
          available_from: v.availableFrom || null,
          available_until: v.availableUntil || null,
          effective_from: v.effectiveFrom || null,
          effective_until: v.effectiveUntil || null,
          notes: v.notes || null,
        })
        .eq("id", (existing as { id: string }).id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("staff_availability")
        .insert({
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          is_recurring: true,
          day_of_week: v.dayOfWeek,
          is_available: v.isAvailable,
          available_from: v.availableFrom || null,
          available_until: v.availableUntil || null,
          effective_from: v.effectiveFrom || null,
          effective_until: v.effectiveUntil || null,
          notes: v.notes || null,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as StaffAvailability);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to set availability",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function setSpecificDateAvailability(
  input: SetSpecificDateAvailabilityInput,
): Promise<ActionResponse<StaffAvailability>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = setSpecificDateAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Upsert: replace existing specific-date availability
    const { data: existing } = await supabase
      .from("staff_availability")
      .select("id")
      .eq("user_id", context.user.id)
      .eq("is_recurring", false)
      .eq("specific_date", v.specificDate)
      .maybeSingle();

    let data: unknown;
    let error: { message: string } | null;

    if (existing) {
      const result = await supabase
        .from("staff_availability")
        .update({
          is_available: v.isAvailable,
          available_from: v.availableFrom || null,
          available_until: v.availableUntil || null,
          notes: v.notes || null,
        })
        .eq("id", (existing as { id: string }).id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("staff_availability")
        .insert({
          tenant_id: context.tenant.id,
          user_id: context.user.id,
          is_recurring: false,
          specific_date: v.specificDate,
          is_available: v.isAvailable,
          available_from: v.availableFrom || null,
          available_until: v.availableUntil || null,
          notes: v.notes || null,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as StaffAvailability);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to set availability",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getMyAvailability(): Promise<
  ActionResponse<StaffAvailability[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("staff_availability")
      .select("*")
      .eq("user_id", context.user.id)
      .order("is_recurring", { ascending: false })
      .order("day_of_week")
      .order("specific_date");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as StaffAvailability[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get availability",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getStaffAvailabilityForDate(
  date: string,
): Promise<
  ActionResponse<
    Array<{
      user_id: string;
      user_name: string;
      is_available: boolean;
      available_from: string | null;
      available_until: string | null;
    }>
  >
> {
  try {
    await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const d = new Date(date);
    // JS: Sunday=0 → our day_of_week: Monday=1...Sunday=7
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Get recurring availability for this weekday
    const { data: recurring } = await supabase
      .from("staff_availability")
      .select(
        "*, user:users!staff_availability_user_id_fkey(first_name, last_name)",
      )
      .eq("is_recurring", true)
      .eq("day_of_week", dayOfWeek);

    // Get specific-date overrides
    const { data: specific } = await supabase
      .from("staff_availability")
      .select(
        "*, user:users!staff_availability_user_id_fkey(first_name, last_name)",
      )
      .eq("is_recurring", false)
      .eq("specific_date", date);

    // Merge: specific overrides recurring
    const availMap = new Map<
      string,
      {
        user_id: string;
        user_name: string;
        is_available: boolean;
        available_from: string | null;
        available_until: string | null;
      }
    >();

    for (const row of (recurring ?? []) as Array<Record<string, unknown>>) {
      const user = row.user as { first_name: string; last_name: string } | null;
      availMap.set(row.user_id as string, {
        user_id: row.user_id as string,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        is_available: row.is_available as boolean,
        available_from: row.available_from as string | null,
        available_until: row.available_until as string | null,
      });
    }

    // Overrides take precedence
    for (const row of (specific ?? []) as Array<Record<string, unknown>>) {
      const user = row.user as { first_name: string; last_name: string } | null;
      availMap.set(row.user_id as string, {
        user_id: row.user_id as string,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        is_available: row.is_available as boolean,
        available_from: row.available_from as string | null,
        available_until: row.available_until as string | null,
      });
    }

    return success(Array.from(availMap.values()));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get staff availability",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

export async function createLeaveRequest(
  input: CreateLeaveRequestInput,
): Promise<ActionResponse<LeaveRequest>> {
  try {
    const context = await requirePermission(Permissions.REQUEST_LEAVE);
    const supabase = await createSupabaseServerClient();

    const parsed = createLeaveRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        tenant_id: context.tenant.id,
        user_id: context.user.id,
        leave_type: v.leaveType,
        leave_type_other: v.leaveTypeOther || null,
        start_date: v.startDate,
        end_date: v.endDate,
        is_partial_day: v.isPartialDay,
        partial_start_time: v.partialStartTime || null,
        partial_end_time: v.partialEndTime || null,
        reason: v.reason || null,
        supporting_document_url: v.supportingDocumentUrl || null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.LEAVE_REQUESTED,
      entityType: "leave_request",
      entityId: (data as LeaveRequest).id,
      metadata: {
        leave_type: v.leaveType,
        start_date: v.startDate,
        end_date: v.endDate,
      },
    });

    return success(data as LeaveRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create leave request",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function withdrawLeaveRequest(
  leaveRequestId: string,
): Promise<ActionResponse<LeaveRequest>> {
  try {
    const context = await requirePermission(Permissions.REQUEST_LEAVE);
    const supabase = await createSupabaseServerClient();

    // Only the requesting user can withdraw, and only if pending
    const { data: existing } = await supabase
      .from("leave_requests")
      .select("user_id, status")
      .eq("id", leaveRequestId)
      .single();

    if (!existing)
      return failure("Leave request not found", ErrorCodes.NOT_FOUND);
    const typed = existing as { user_id: string; status: string };
    if (typed.user_id !== context.user.id) {
      return failure(
        "You can only withdraw your own leave requests",
        ErrorCodes.FORBIDDEN,
      );
    }
    if (typed.status !== "pending") {
      return failure(
        "Can only withdraw pending leave requests",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status: "withdrawn" })
      .eq("id", leaveRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.LEAVE_WITHDRAWN,
      entityType: "leave_request",
      entityId: leaveRequestId,
    });

    return success(data as LeaveRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to withdraw leave request",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function reviewLeaveRequest(
  input: ReviewLeaveRequestInput,
): Promise<ActionResponse<LeaveRequest>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_LEAVE);
    const supabase = await createSupabaseServerClient();

    const parsed = reviewLeaveRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify leave request exists and is pending
    const { data: lr } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", v.leaveRequestId)
      .single();

    if (!lr) return failure("Leave request not found", ErrorCodes.NOT_FOUND);
    const typedLr = lr as LeaveRequest;
    if (typedLr.status !== "pending") {
      return failure(
        "Leave request is not pending",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const newStatus = v.action === "approve" ? "approved" : "rejected";

    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status: newStatus,
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: v.reviewerNotes || null,
      })
      .eq("id", v.leaveRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const auditAction =
      v.action === "approve"
        ? AuditActions.LEAVE_APPROVED
        : AuditActions.LEAVE_REJECTED;

    await logAudit({
      context,
      action: auditAction,
      entityType: "leave_request",
      entityId: v.leaveRequestId,
      metadata: { user_id: typedLr.user_id, leave_type: typedLr.leave_type },
    });

    // On approval: cancel affected shifts and auto-create coverage requests
    if (v.action === "approve") {
      await handleLeaveApproval(supabase, context, typedLr);
    }

    return success(data as LeaveRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to review leave request",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

/** On leave approval: cancel shifts + create coverage requests + auto-create time entries */
async function handleLeaveApproval(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  context: { tenant: { id: string }; user: { id: string } },
  lr: LeaveRequest,
): Promise<void> {
  // 1. Find affected shifts
  const { data: affectedShifts } = await supabase
    .from("shifts")
    .select("id, date, start_time, end_time, class_id, shift_role")
    .eq("user_id", lr.user_id)
    .gte("date", lr.start_date)
    .lte("date", lr.end_date)
    .in("status", ["scheduled", "confirmed"]);

  if (affectedShifts && affectedShifts.length > 0) {
    const shiftIds = (affectedShifts as Array<{ id: string }>).map((s) => s.id);

    // Cancel affected shifts
    await supabase
      .from("shifts")
      .update({ status: "cancelled", notes: `Cancelled due to approved leave` })
      .in("id", shiftIds);

    // Create coverage requests for each cancelled shift
    for (const shift of affectedShifts as Array<{
      id: string;
      date: string;
      start_time: string;
      end_time: string;
      class_id: string | null;
      shift_role: string;
    }>) {
      await supabase.from("shift_coverage_requests").insert({
        tenant_id: context.tenant.id,
        original_shift_id: shift.id,
        original_user_id: lr.user_id,
        reason: "approved_leave",
        leave_request_id: lr.id,
        status: "open",
        broadcast_to_all_casuals: true,
        offered_to_user_ids: [],
        urgency: "normal",
        created_by: context.user.id,
      });
    }
  }

  // 2. Auto-create time entries for leave days
  const leaveConfig = LEAVE_TYPE_CONFIG[lr.leave_type];
  const entryType = leaveConfig.mapsToTimeEntryType;

  if (entryType) {
    const startDate = new Date(lr.start_date);
    const endDate = new Date(lr.end_date);

    for (
      let d = new Date(startDate);
      d.getTime() <= endDate.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      await supabase.from("time_entries").upsert(
        {
          tenant_id: context.tenant.id,
          user_id: lr.user_id,
          date: dateStr,
          start_time: lr.is_partial_day
            ? (lr.partial_start_time ?? "09:00")
            : "09:00",
          end_time: lr.is_partial_day
            ? (lr.partial_end_time ?? "16:36")
            : "16:36",
          break_minutes: lr.is_partial_day ? 0 : 30,
          entry_type: entryType,
          notes: `Auto-generated from approved ${leaveConfig.label}`,
        },
        { onConflict: "tenant_id,user_id,date", ignoreDuplicates: false },
      );
    }
  }
}

export async function getMyLeaveRequests(): Promise<
  ActionResponse<LeaveRequest[]>
> {
  try {
    const context = await requirePermission(Permissions.REQUEST_LEAVE);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as LeaveRequest[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get leave requests",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listLeaveRequests(
  filter?: LeaveFilterInput,
): Promise<ActionResponse<LeaveRequestWithUser[]>> {
  try {
    await requirePermission(Permissions.MANAGE_LEAVE);
    const supabase = await createSupabaseServerClient();

    const parsed = leaveFilterSchema.safeParse(filter ?? {});
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("leave_requests")
      .select(
        `
        *,
        user:users!leave_requests_user_id_fkey(first_name, last_name, avatar_url),
        staff_profile:staff_profiles!leave_requests_user_id_fkey(employment_type)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (f.status) query = query.eq("status", f.status);
    if (f.userId) query = query.eq("user_id", f.userId);
    if (f.startDate) query = query.gte("start_date", f.startDate);
    if (f.endDate) query = query.lte("end_date", f.endDate);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result: LeaveRequestWithUser[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const user = row.user as {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      } | null;
      const profile = row.staff_profile as {
        employment_type: string | null;
      } | null;
      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        user_id: row.user_id as string,
        leave_type: row.leave_type as LeaveRequest["leave_type"],
        leave_type_other: row.leave_type_other as string | null,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        is_partial_day: row.is_partial_day as boolean,
        partial_start_time: row.partial_start_time as string | null,
        partial_end_time: row.partial_end_time as string | null,
        total_leave_hours: row.total_leave_hours as number,
        status: row.status as LeaveRequest["status"],
        reason: row.reason as string | null,
        supporting_document_url: row.supporting_document_url as string | null,
        reviewed_by: row.reviewed_by as string | null,
        reviewed_at: row.reviewed_at as string | null,
        reviewer_notes: row.reviewer_notes as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        user_avatar: user?.avatar_url ?? null,
        employment_type:
          (profile?.employment_type as LeaveRequestWithUser["employment_type"]) ??
          null,
      };
    });

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list leave requests",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listPendingLeaveRequests(): Promise<
  ActionResponse<LeaveRequestWithUser[]>
> {
  return listLeaveRequests({ status: "pending" });
}

// ============================================================
// SHIFT SWAPS
// ============================================================

export async function requestShiftSwap(
  input: RequestShiftSwapInput,
): Promise<ActionResponse<ShiftSwapRequest>> {
  try {
    const context = await requirePermission(Permissions.REQUEST_SHIFT_SWAP);
    const supabase = await createSupabaseServerClient();

    const parsed = requestShiftSwapSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify the offered shift belongs to the current user
    const { data: shift } = await supabase
      .from("shifts")
      .select("user_id")
      .eq("id", v.offeredShiftId)
      .single();

    if (!shift) return failure("Shift not found", ErrorCodes.NOT_FOUND);
    if ((shift as { user_id: string }).user_id !== context.user.id) {
      return failure("You can only swap your own shifts", ErrorCodes.FORBIDDEN);
    }

    const { data, error } = await supabase
      .from("shift_swap_requests")
      .insert({
        tenant_id: context.tenant.id,
        offered_shift_id: v.offeredShiftId,
        offered_by: context.user.id,
        requested_shift_id: v.requestedShiftId || null,
        requested_from: v.requestedFromUserId || null,
        status: v.requestedFromUserId ? "pending_peer" : "pending_approval",
        reason: v.reason || null,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.SHIFT_SWAP_REQUESTED,
      entityType: "shift_swap_request",
      entityId: (data as ShiftSwapRequest).id,
      metadata: { offered_shift_id: v.offeredShiftId },
    });

    return success(data as ShiftSwapRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to request shift swap",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function respondToSwap(
  input: RespondToSwapInput,
): Promise<ActionResponse<ShiftSwapRequest>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = respondToSwapSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify swap exists and is pending_peer
    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("*")
      .eq("id", v.swapRequestId)
      .single();

    if (!swap) return failure("Swap request not found", ErrorCodes.NOT_FOUND);
    const typedSwap = swap as ShiftSwapRequest;

    if (typedSwap.status !== "pending_peer") {
      return failure(
        "This swap is not awaiting your response",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (typedSwap.requested_from !== context.user.id) {
      return failure("This swap was not sent to you", ErrorCodes.FORBIDDEN);
    }

    const newStatus = v.accept ? "pending_approval" : "rejected";

    const { data, error } = await supabase
      .from("shift_swap_requests")
      .update({
        status: newStatus,
        peer_responded_at: new Date().toISOString(),
      })
      .eq("id", v.swapRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as ShiftSwapRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to respond to swap",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function reviewSwapRequest(
  input: ReviewSwapRequestInput,
): Promise<ActionResponse<ShiftSwapRequest>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const parsed = reviewSwapRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data: swap } = await supabase
      .from("shift_swap_requests")
      .select("*")
      .eq("id", v.swapRequestId)
      .single();

    if (!swap) return failure("Swap request not found", ErrorCodes.NOT_FOUND);
    const typedSwap = swap as ShiftSwapRequest;

    if (typedSwap.status !== "pending_approval") {
      return failure(
        "Swap request is not pending approval",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const newStatus = v.action === "approve" ? "approved" : "rejected";

    const { data, error } = await supabase
      .from("shift_swap_requests")
      .update({
        status: newStatus,
        approved_by: context.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: v.rejectionReason || null,
      })
      .eq("id", v.swapRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // On approval: actually swap the user_ids on the shifts
    if (v.action === "approve" && typedSwap.requested_shift_id) {
      // Verify both shifts still exist and are active before swapping
      const { data: bothShifts } = await supabase
        .from("shifts")
        .select("id, status")
        .in("id", [typedSwap.offered_shift_id, typedSwap.requested_shift_id])
        .in("status", ["scheduled", "confirmed"]);

      if (!bothShifts || bothShifts.length !== 2) {
        // One or both shifts no longer active - reject the swap
        await supabase
          .from("shift_swap_requests")
          .update({
            status: "rejected",
            rejection_reason: "One or both shifts are no longer active",
          })
          .eq("id", v.swapRequestId);
        return failure(
          "One or both shifts are no longer active",
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      await supabase
        .from("shifts")
        .update({ user_id: typedSwap.requested_from ?? typedSwap.offered_by })
        .eq("id", typedSwap.offered_shift_id);

      await supabase
        .from("shifts")
        .update({ user_id: typedSwap.offered_by })
        .eq("id", typedSwap.requested_shift_id);
    }

    const auditAction =
      v.action === "approve"
        ? AuditActions.SHIFT_SWAP_APPROVED
        : AuditActions.SHIFT_SWAP_REJECTED;

    await logAudit({
      context,
      action: auditAction,
      entityType: "shift_swap_request",
      entityId: v.swapRequestId,
    });

    return success(data as ShiftSwapRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to review swap",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getMySwapRequests(): Promise<
  ActionResponse<ShiftSwapRequestWithDetails[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shift_swap_requests")
      .select(
        `
        *,
        offered_by_user:users!shift_swap_requests_offered_by_fkey(first_name, last_name),
        requested_from_user:users!shift_swap_requests_requested_from_fkey(first_name, last_name),
        offered_shift:shifts!shift_swap_requests_offered_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name)),
        requested_shift:shifts!shift_swap_requests_requested_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name))
      `,
      )
      .or(
        `offered_by.eq.${context.user.id},requested_from.eq.${context.user.id}`,
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const offBy = row.offered_by_user as {
          first_name: string;
          last_name: string;
        } | null;
        const reqFrom = row.requested_from_user as {
          first_name: string;
          last_name: string;
        } | null;
        const offShift = row.offered_shift as Record<string, unknown> | null;
        const reqShift = row.requested_shift as Record<string, unknown> | null;

        return {
          id: row.id as string,
          tenant_id: row.tenant_id as string,
          offered_shift_id: row.offered_shift_id as string,
          offered_by: row.offered_by as string,
          requested_shift_id: row.requested_shift_id as string | null,
          requested_from: row.requested_from as string | null,
          status: row.status as string,
          peer_responded_at: row.peer_responded_at as string | null,
          approved_by: row.approved_by as string | null,
          approved_at: row.approved_at as string | null,
          rejection_reason: row.rejection_reason as string | null,
          reason: row.reason as string | null,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          offered_by_name: offBy
            ? `${offBy.first_name} ${offBy.last_name}`
            : "Unknown",
          requested_from_name: reqFrom
            ? `${reqFrom.first_name} ${reqFrom.last_name}`
            : null,
          offered_shift: offShift
            ? {
                date: offShift.date as string,
                start_time: offShift.start_time as string,
                end_time: offShift.end_time as string,
                class_id: offShift.class_id as string | null,
                class_name:
                  (offShift.class as { name: string } | null)?.name ?? null,
              }
            : {
                date: "",
                start_time: "",
                end_time: "",
                class_id: null,
                class_name: null,
              },
          requested_shift: reqShift
            ? {
                date: reqShift.date as string,
                start_time: reqShift.start_time as string,
                end_time: reqShift.end_time as string,
                class_id: reqShift.class_id as string | null,
                class_name:
                  (reqShift.class as { name: string } | null)?.name ?? null,
              }
            : null,
        } as ShiftSwapRequestWithDetails;
      },
    );

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get swap requests",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listPendingSwapRequests(): Promise<
  ActionResponse<ShiftSwapRequestWithDetails[]>
> {
  try {
    await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shift_swap_requests")
      .select(
        `
        *,
        offered_by_user:users!shift_swap_requests_offered_by_fkey(first_name, last_name),
        requested_from_user:users!shift_swap_requests_requested_from_fkey(first_name, last_name),
        offered_shift:shifts!shift_swap_requests_offered_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name)),
        requested_shift:shifts!shift_swap_requests_requested_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name))
      `,
      )
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const offBy = row.offered_by_user as {
          first_name: string;
          last_name: string;
        } | null;
        const reqFrom = row.requested_from_user as {
          first_name: string;
          last_name: string;
        } | null;
        const offShift = row.offered_shift as Record<string, unknown> | null;
        const reqShift = row.requested_shift as Record<string, unknown> | null;

        return {
          id: row.id as string,
          tenant_id: row.tenant_id as string,
          offered_shift_id: row.offered_shift_id as string,
          offered_by: row.offered_by as string,
          requested_shift_id: row.requested_shift_id as string | null,
          requested_from: row.requested_from as string | null,
          status: row.status as string,
          peer_responded_at: row.peer_responded_at as string | null,
          approved_by: row.approved_by as string | null,
          approved_at: row.approved_at as string | null,
          rejection_reason: row.rejection_reason as string | null,
          reason: row.reason as string | null,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          offered_by_name: offBy
            ? `${offBy.first_name} ${offBy.last_name}`
            : "Unknown",
          requested_from_name: reqFrom
            ? `${reqFrom.first_name} ${reqFrom.last_name}`
            : null,
          offered_shift: offShift
            ? {
                date: offShift.date as string,
                start_time: offShift.start_time as string,
                end_time: offShift.end_time as string,
                class_id: offShift.class_id as string | null,
                class_name:
                  (offShift.class as { name: string } | null)?.name ?? null,
              }
            : {
                date: "",
                start_time: "",
                end_time: "",
                class_id: null,
                class_name: null,
              },
          requested_shift: reqShift
            ? {
                date: reqShift.date as string,
                start_time: reqShift.start_time as string,
                end_time: reqShift.end_time as string,
                class_id: reqShift.class_id as string | null,
                class_name:
                  (reqShift.class as { name: string } | null)?.name ?? null,
              }
            : null,
        } as ShiftSwapRequestWithDetails;
      },
    );

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list pending swaps",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// COVERAGE / RELIEF
// ============================================================

export async function createCoverageRequest(
  input: CreateCoverageRequestInput,
): Promise<ActionResponse<ShiftCoverageRequest>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COVERAGE);
    const supabase = await createSupabaseServerClient();

    const parsed = createCoverageRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Get the original shift to populate original_user_id
    const { data: shift } = await supabase
      .from("shifts")
      .select("user_id")
      .eq("id", v.originalShiftId)
      .single();

    if (!shift) return failure("Shift not found", ErrorCodes.NOT_FOUND);

    const { data, error } = await supabase
      .from("shift_coverage_requests")
      .insert({
        tenant_id: context.tenant.id,
        original_shift_id: v.originalShiftId,
        original_user_id: (shift as { user_id: string }).user_id,
        reason: v.reason,
        reason_detail: v.reasonDetail || null,
        leave_request_id: v.leaveRequestId || null,
        status: "open",
        broadcast_to_all_casuals: v.broadcastToAllCasuals,
        offered_to_user_ids: v.offeredToUserIds ?? [],
        urgency: v.urgency,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.COVERAGE_REQUEST_CREATED,
      entityType: "shift_coverage_request",
      entityId: (data as ShiftCoverageRequest).id,
      metadata: { reason: v.reason, urgency: v.urgency },
    });

    return success(data as ShiftCoverageRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create coverage request",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function acceptCoverageRequest(
  input: AcceptCoverageRequestInput,
): Promise<ActionResponse<ShiftCoverageRequest>> {
  try {
    const context = await requirePermission(Permissions.ACCEPT_COVERAGE);
    const supabase = await createSupabaseServerClient();

    const parsed = acceptCoverageRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Get the coverage request
    const { data: cr } = await supabase
      .from("shift_coverage_requests")
      .select(
        "*, original_shift:shifts!shift_coverage_requests_original_shift_id_fkey(*)",
      )
      .eq("id", v.coverageRequestId)
      .single();

    if (!cr) return failure("Coverage request not found", ErrorCodes.NOT_FOUND);
    const typedCr = cr as ShiftCoverageRequest & { original_shift: Shift };

    if (typedCr.status !== "open" && typedCr.status !== "offered") {
      return failure(
        "Coverage request is no longer available",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Create a replacement shift for the accepting user
    const origShift = typedCr.original_shift;
    const { data: newShift, error: shiftErr } = await supabase
      .from("shifts")
      .insert({
        tenant_id: context.tenant.id,
        roster_week_id: origShift.roster_week_id,
        user_id: context.user.id,
        date: origShift.date,
        start_time: origShift.start_time,
        end_time: origShift.end_time,
        break_minutes: origShift.break_minutes,
        class_id: origShift.class_id,
        shift_role: origShift.shift_role,
        covers_for_user_id: typedCr.original_user_id,
        coverage_request_id: v.coverageRequestId,
        notes: "Coverage shift",
      })
      .select()
      .single();

    if (shiftErr) return failure(shiftErr.message, ErrorCodes.DATABASE_ERROR);

    // Update the coverage request
    const { data, error } = await supabase
      .from("shift_coverage_requests")
      .update({
        status: "accepted",
        accepted_by: context.user.id,
        accepted_at: new Date().toISOString(),
        replacement_shift_id: (newShift as Shift).id,
      })
      .eq("id", v.coverageRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.COVERAGE_REQUEST_ACCEPTED,
      entityType: "shift_coverage_request",
      entityId: v.coverageRequestId,
      metadata: { accepted_by: context.user.id },
    });

    return success(data as ShiftCoverageRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to accept coverage",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function resolveCoverageRequest(
  input: ResolveCoverageRequestInput,
): Promise<ActionResponse<ShiftCoverageRequest>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_COVERAGE);
    const supabase = await createSupabaseServerClient();

    const parsed = resolveCoverageRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify current status allows this transition
    const { data: current } = await supabase
      .from("shift_coverage_requests")
      .select("status")
      .eq("id", v.coverageRequestId)
      .single();

    if (!current)
      return failure("Coverage request not found", ErrorCodes.NOT_FOUND);

    const validTransitions: Record<string, string[]> = {
      open: ["expired", "cancelled"],
      offered: ["expired", "cancelled"],
      accepted: ["cancelled"],
    };
    const allowed =
      validTransitions[(current as { status: string }).status] ?? [];
    if (!allowed.includes(v.status)) {
      return failure(
        `Cannot transition from '${(current as { status: string }).status}' to '${v.status}'`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("shift_coverage_requests")
      .update({
        status: v.status,
        resolved_by: context.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", v.coverageRequestId)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.COVERAGE_REQUEST_RESOLVED,
      entityType: "shift_coverage_request",
      entityId: v.coverageRequestId,
      metadata: { status: v.status },
    });

    return success(data as ShiftCoverageRequest);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to resolve coverage",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getAvailableCoverageRequests(): Promise<
  ActionResponse<ShiftCoverageRequestWithDetails[]>
> {
  try {
    const context = await requirePermission(Permissions.ACCEPT_COVERAGE);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shift_coverage_requests")
      .select(
        `
        *,
        original_user:users!shift_coverage_requests_original_user_id_fkey(first_name, last_name),
        original_shift:shifts!shift_coverage_requests_original_shift_id_fkey(
          date, start_time, end_time, class_id, shift_role,
          class:classes(name)
        )
      `,
      )
      .in("status", ["open", "offered"])
      .order("urgency", { ascending: false })
      .order("created_at");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result = mapCoverageRequestsWithDetails(data, context.user.id);
    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get coverage requests",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function listCoverageRequests(
  status?: string,
): Promise<ActionResponse<ShiftCoverageRequestWithDetails[]>> {
  try {
    await requirePermission(Permissions.MANAGE_COVERAGE);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("shift_coverage_requests")
      .select(
        `
        *,
        original_user:users!shift_coverage_requests_original_user_id_fkey(first_name, last_name),
        accepted_by_user:users!shift_coverage_requests_accepted_by_fkey(first_name, last_name),
        original_shift:shifts!shift_coverage_requests_original_shift_id_fkey(
          date, start_time, end_time, class_id, shift_role,
          class:classes(name)
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result = mapCoverageRequestsWithDetails(data);
    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list coverage requests",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD QUERIES
// ============================================================

export async function getRosterDashboard(): Promise<
  ActionResponse<RosterDashboardData>
> {
  try {
    await requirePermission(Permissions.MANAGE_ROSTER);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];
    const weekStart = getWeekStartDate(today);
    const weekDates = getWeekDates(weekStart);
    const weekEnd = weekDates[6];

    // Next week
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekStartStr = nextWeekStart.toISOString().split("T")[0];

    // Parallel queries
    const [
      currentWeekRes,
      nextWeekRes,
      pendingLeaveRes,
      openCoverageRes,
      pendingSwapRes,
      shiftsThisWeekRes,
      leaveToday,
    ] = await Promise.all([
      supabase
        .from("roster_weeks")
        .select("*")
        .eq("week_start_date", weekStart)
        .maybeSingle(),
      supabase
        .from("roster_weeks")
        .select("*")
        .eq("week_start_date", nextWeekStartStr)
        .maybeSingle(),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact" })
        .eq("status", "pending"),
      supabase
        .from("shift_coverage_requests")
        .select("id", { count: "exact" })
        .in("status", ["open", "offered"]),
      supabase
        .from("shift_swap_requests")
        .select("id", { count: "exact" })
        .eq("status", "pending_approval"),
      supabase
        .from("shifts")
        .select("expected_hours")
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .neq("status", "cancelled"),
      supabase
        .from("leave_requests")
        .select(
          `user_id, leave_type, user:users!leave_requests_user_id_fkey(first_name, last_name)`,
        )
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today),
    ]);

    const shifts = (shiftsThisWeekRes.data ?? []) as Array<{
      expected_hours: number;
    }>;
    const totalHours = shifts.reduce((sum, s) => sum + s.expected_hours, 0);

    const staffOnLeave = (
      (leaveToday.data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const user = row.user as { first_name: string; last_name: string } | null;
      return {
        user_id: row.user_id as string,
        user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        leave_type: row.leave_type as LeaveRequest["leave_type"],
      };
    });

    return success({
      current_week: (currentWeekRes.data as RosterWeek) ?? null,
      next_week: (nextWeekRes.data as RosterWeek) ?? null,
      pending_leave_count: pendingLeaveRes.count ?? 0,
      open_coverage_count: openCoverageRes.count ?? 0,
      pending_swap_count: pendingSwapRes.count ?? 0,
      this_week_shift_count: shifts.length,
      this_week_total_hours: Math.round(totalHours * 100) / 100,
      staff_on_leave_today: staffOnLeave,
      coverage_gaps: [], // Populated by comparing scheduled shifts to required coverage
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get roster dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getMySchedule(): Promise<ActionResponse<MyScheduleData>> {
  try {
    const context = await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];
    const weekStart = getWeekStartDate(today);
    const weekDates = getWeekDates(weekStart);
    const weekEnd = weekDates[6];

    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekStartStr = nextWeekStart.toISOString().split("T")[0];
    const nextWeekDates = getWeekDates(nextWeekStartStr);
    const nextWeekEnd = nextWeekDates[6];

    const shiftSelect = `
      *,
      user:users!shifts_user_id_fkey(first_name, last_name, avatar_url),
      class:classes!shifts_class_id_fkey(name),
      covers_for:users!shifts_covers_for_user_id_fkey(first_name, last_name)
    `;

    const [thisWeekRes, nextWeekRes, leaveRes, swapRes, coverageRes] =
      await Promise.all([
        supabase
          .from("shifts")
          .select(shiftSelect)
          .eq("user_id", context.user.id)
          .gte("date", weekStart)
          .lte("date", weekEnd)
          .neq("status", "cancelled")
          .order("date")
          .order("start_time"),
        supabase
          .from("shifts")
          .select(shiftSelect)
          .eq("user_id", context.user.id)
          .gte("date", nextWeekStartStr)
          .lte("date", nextWeekEnd)
          .neq("status", "cancelled")
          .order("date")
          .order("start_time"),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", context.user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("shift_swap_requests")
          .select(
            `
          *,
          offered_by_user:users!shift_swap_requests_offered_by_fkey(first_name, last_name),
          requested_from_user:users!shift_swap_requests_requested_from_fkey(first_name, last_name),
          offered_shift:shifts!shift_swap_requests_offered_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name)),
          requested_shift:shifts!shift_swap_requests_requested_shift_id_fkey(date, start_time, end_time, class_id, class:classes(name))
        `,
          )
          .or(
            `offered_by.eq.${context.user.id},requested_from.eq.${context.user.id}`,
          )
          .in("status", ["pending_peer", "pending_approval"])
          .order("created_at", { ascending: false }),
        supabase
          .from("shift_coverage_requests")
          .select(
            `
          *,
          original_user:users!shift_coverage_requests_original_user_id_fkey(first_name, last_name),
          original_shift:shifts!shift_coverage_requests_original_shift_id_fkey(
            date, start_time, end_time, class_id, shift_role,
            class:classes(name)
          )
        `,
          )
          .in("status", ["open", "offered"])
          .order("urgency", { ascending: false })
          .order("created_at")
          .limit(10),
      ]);

    return success({
      shifts_this_week: mapShiftsWithDetails(thisWeekRes.data),
      shifts_next_week: mapShiftsWithDetails(nextWeekRes.data),
      pending_leave_requests: (leaveRes.data ?? []) as LeaveRequest[],
      pending_swap_requests: mapSwapRequestsWithDetails(swapRes.data),
      available_coverage_requests: mapCoverageRequestsWithDetails(
        coverageRes.data,
        context.user.id,
      ),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get my schedule",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// INTEGRATION HELPERS
// ============================================================

/** Sum rostered shift hours for a user in a date range (for timesheet comparison). */
export async function getExpectedHoursForTimesheetPeriod(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ActionResponse<{ expected_hours: number; shift_count: number }>> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shifts")
      .select("expected_hours")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .in("status", ["scheduled", "confirmed", "completed"]);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const shifts = (data ?? []) as Array<{ expected_hours: number }>;
    const totalHours = shifts.reduce((sum, s) => sum + s.expected_hours, 0);

    return success({
      expected_hours: Math.round(totalHours * 100) / 100,
      shift_count: shifts.length,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get expected hours",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

/** Who should be on-floor at a given time? (for ratio monitoring integration) */
export async function getStaffOnFloorExpected(
  date: string,
  time: string,
): Promise<
  ActionResponse<
    Array<{
      user_id: string;
      user_name: string;
      class_id: string | null;
      class_name: string | null;
      shift_role: string;
    }>
  >
> {
  try {
    await requirePermission(Permissions.VIEW_ROSTER);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("shifts")
      .select(
        `
        user_id, class_id, shift_role,
        user:users!shifts_user_id_fkey(first_name, last_name),
        class:classes!shifts_class_id_fkey(name)
      `,
      )
      .eq("date", date)
      .lte("start_time", time)
      .gte("end_time", time)
      .in("status", ["scheduled", "confirmed"]);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const result = ((data ?? []) as Array<Record<string, unknown>>).map(
      (row) => {
        const user = row.user as {
          first_name: string;
          last_name: string;
        } | null;
        const cls = row.class as { name: string } | null;
        return {
          user_id: row.user_id as string,
          user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
          class_id: row.class_id as string | null,
          class_name: cls?.name ?? null,
          shift_role: row.shift_role as string,
        };
      },
    );

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get expected staff",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function mapShiftsWithDetails(data: unknown): ShiftWithDetails[] {
  return ((data ?? []) as Array<Record<string, unknown>>).map((s) => {
    const user = s.user as {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    } | null;
    const cls = s.class as { name: string } | null;
    const coversFor = s.covers_for as {
      first_name: string;
      last_name: string;
    } | null;
    return {
      id: s.id as string,
      tenant_id: s.tenant_id as string,
      roster_week_id: s.roster_week_id as string,
      user_id: s.user_id as string,
      date: s.date as string,
      start_time: s.start_time as string,
      end_time: s.end_time as string,
      break_minutes: s.break_minutes as number,
      class_id: s.class_id as string | null,
      shift_role: s.shift_role as string,
      status: s.status as string,
      covers_for_user_id: s.covers_for_user_id as string | null,
      coverage_request_id: s.coverage_request_id as string | null,
      expected_hours: s.expected_hours as number,
      notes: s.notes as string | null,
      created_at: s.created_at as string,
      updated_at: s.updated_at as string,
      user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
      user_avatar: user?.avatar_url ?? null,
      class_name: cls?.name ?? null,
      covers_for_name: coversFor
        ? `${coversFor.first_name} ${coversFor.last_name}`
        : null,
    } as ShiftWithDetails;
  });
}

function mapSwapRequestsWithDetails(
  data: unknown,
): ShiftSwapRequestWithDetails[] {
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const offBy = row.offered_by_user as {
      first_name: string;
      last_name: string;
    } | null;
    const reqFrom = row.requested_from_user as {
      first_name: string;
      last_name: string;
    } | null;
    const offShift = row.offered_shift as Record<string, unknown> | null;
    const reqShift = row.requested_shift as Record<string, unknown> | null;

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      offered_shift_id: row.offered_shift_id as string,
      offered_by: row.offered_by as string,
      requested_shift_id: row.requested_shift_id as string | null,
      requested_from: row.requested_from as string | null,
      status: row.status as string,
      peer_responded_at: row.peer_responded_at as string | null,
      approved_by: row.approved_by as string | null,
      approved_at: row.approved_at as string | null,
      rejection_reason: row.rejection_reason as string | null,
      reason: row.reason as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      offered_by_name: offBy
        ? `${offBy.first_name} ${offBy.last_name}`
        : "Unknown",
      requested_from_name: reqFrom
        ? `${reqFrom.first_name} ${reqFrom.last_name}`
        : null,
      offered_shift: offShift
        ? {
            date: offShift.date as string,
            start_time: offShift.start_time as string,
            end_time: offShift.end_time as string,
            class_id: offShift.class_id as string | null,
            class_name:
              (offShift.class as { name: string } | null)?.name ?? null,
          }
        : {
            date: "",
            start_time: "",
            end_time: "",
            class_id: null,
            class_name: null,
          },
      requested_shift: reqShift
        ? {
            date: reqShift.date as string,
            start_time: reqShift.start_time as string,
            end_time: reqShift.end_time as string,
            class_id: reqShift.class_id as string | null,
            class_name:
              (reqShift.class as { name: string } | null)?.name ?? null,
          }
        : null,
    } as ShiftSwapRequestWithDetails;
  });
}

function mapCoverageRequestsWithDetails(
  data: unknown,
  _currentUserId?: string,
): ShiftCoverageRequestWithDetails[] {
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const origUser = row.original_user as {
      first_name: string;
      last_name: string;
    } | null;
    const acceptedByUser = row.accepted_by_user as {
      first_name: string;
      last_name: string;
    } | null;
    const origShift = row.original_shift as Record<string, unknown> | null;

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      original_shift_id: row.original_shift_id as string,
      original_user_id: row.original_user_id as string,
      reason: row.reason as string,
      reason_detail: row.reason_detail as string | null,
      leave_request_id: row.leave_request_id as string | null,
      status: row.status as string,
      broadcast_to_all_casuals: row.broadcast_to_all_casuals as boolean,
      offered_to_user_ids: row.offered_to_user_ids as string[],
      accepted_by: row.accepted_by as string | null,
      accepted_at: row.accepted_at as string | null,
      replacement_shift_id: row.replacement_shift_id as string | null,
      created_by: row.created_by as string,
      resolved_by: row.resolved_by as string | null,
      resolved_at: row.resolved_at as string | null,
      urgency: row.urgency as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      original_user_name: origUser
        ? `${origUser.first_name} ${origUser.last_name}`
        : "Unknown",
      accepted_by_name: acceptedByUser
        ? `${acceptedByUser.first_name} ${acceptedByUser.last_name}`
        : null,
      original_shift: origShift
        ? {
            date: origShift.date as string,
            start_time: origShift.start_time as string,
            end_time: origShift.end_time as string,
            class_id: origShift.class_id as string | null,
            shift_role: origShift.shift_role as string,
            class_name:
              (origShift.class as { name: string } | null)?.name ?? null,
          }
        : {
            date: "",
            start_time: "",
            end_time: "",
            class_id: null,
            shift_role: "general",
            class_name: null,
          },
    } as ShiftCoverageRequestWithDetails;
  });
}
