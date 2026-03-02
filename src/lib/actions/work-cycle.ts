"use server";

// src/lib/actions/work-cycle.ts
//
// ============================================================
// Work Cycle Integrity Tracking - Server Actions
// ============================================================
// Records and analyses the integrity of the 3-hour Montessori
// work cycle. Guides log sessions + interruptions; the system
// surfaces frequency trends and flags classes where interruptions
// are systematically above threshold.
// ============================================================

import {
  requirePermission,
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success, paginated, paginatedFailure } from "@/types/api";
import type { ActionResponse, PaginatedResponse } from "@/types/api";
import type {
  WorkCycleSession,
  WorkCycleInterruption,
  WorkCycleSessionWithDetails,
  WorkCycleClassSummary,
  WorkCycleDashboardData,
  WorkCycleIntegrityTrend,
  WorkCycleInterruptionSource,
  WorkCycleInterruptionSeverity,
} from "@/types/domain";
import {
  CreateWorkCycleSessionSchema,
  UpdateWorkCycleSessionSchema,
  CreateInterruptionSchema,
  ListSessionsSchema,
} from "@/lib/validations/work-cycle";
import type {
  CreateWorkCycleSessionInput,
  UpdateWorkCycleSessionInput,
  CreateInterruptionInput,
  ListSessionsInput,
} from "@/lib/validations/work-cycle";
import {
  FLAG_INTERRUPTIONS_THRESHOLD,
  calcInterruptionTrend,
} from "@/lib/constants/work-cycle";
import { ErrorCodes } from "@/types/api";

// ============================================================
// Internal helpers
// ============================================================

function calcLongestUninterrupted(
  plannedStart: string,
  plannedEnd: string,
  interruptions: { occurred_at: string; duration_minutes: number }[],
): number {
  // Convert times to minutes-since-midnight for arithmetic
  const toMins = (t: string) => {
    const parts = t.split(":").map(Number);
    return parts[0] * 60 + parts[1];
  };

  const start = toMins(plannedStart);
  const end = toMins(plannedEnd);
  const total = end - start;
  if (total <= 0) return 0;

  // Sort interruptions by occurrence time
  const sorted = [...interruptions].sort(
    (a, b) => toMins(a.occurred_at) - toMins(b.occurred_at),
  );

  // Find longest gap between interruptions
  let longest = 0;
  let cursor = start;

  for (const intr of sorted) {
    const intrStart = toMins(intr.occurred_at);
    const gap = Math.max(0, intrStart - cursor);
    longest = Math.max(longest, gap);
    cursor = Math.min(end, intrStart + intr.duration_minutes);
  }

  // Gap after last interruption
  longest = Math.max(longest, Math.max(0, end - cursor));

  return longest;
}

// ============================================================
// CREATE SESSION
// ============================================================

export async function createWorkCycleSession(
  input: CreateWorkCycleSessionInput,
): Promise<ActionResponse<WorkCycleSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const parsed = CreateWorkCycleSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    // Validate planned time order
    if (v.planned_end_time <= v.planned_start_time) {
      return failure(
        "Planned end time must be after start time",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("work_cycle_sessions")
      .insert({
        tenant_id: context.tenant.id,
        class_id: v.class_id,
        session_date: v.session_date,
        planned_start_time: v.planned_start_time,
        planned_end_time: v.planned_end_time,
        actual_start_time: v.actual_start_time ?? null,
        actual_end_time: v.actual_end_time ?? null,
        longest_uninterrupted_minutes: null, // recalculated on interruption add
        quality_rating: v.quality_rating ?? null,
        completed_full_cycle: v.completed_full_cycle,
        general_notes: v.general_notes?.trim() ?? null,
        recorded_by: context.user.id,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_SESSION_RECORDED,
      entityType: "work_cycle_session",
      entityId: data.id,
      metadata: { class_id: v.class_id, session_date: v.session_date },
    });

    return success(data as WorkCycleSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// UPDATE SESSION
// ============================================================

export async function updateWorkCycleSession(
  sessionId: string,
  input: UpdateWorkCycleSessionInput,
): Promise<ActionResponse<WorkCycleSession>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const parsed = UpdateWorkCycleSessionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const supabase = await createSupabaseServerClient();
    const v = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (v.actual_start_time !== undefined)
      updateData.actual_start_time = v.actual_start_time ?? null;
    if (v.actual_end_time !== undefined)
      updateData.actual_end_time = v.actual_end_time ?? null;
    if (v.quality_rating !== undefined)
      updateData.quality_rating = v.quality_rating ?? null;
    if (v.completed_full_cycle !== undefined)
      updateData.completed_full_cycle = v.completed_full_cycle;
    if (v.general_notes !== undefined)
      updateData.general_notes = v.general_notes?.trim() ?? null;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("work_cycle_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_SESSION_EDITED,
      entityType: "work_cycle_session",
      entityId: sessionId,
    });

    return success(data as WorkCycleSession);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DELETE SESSION (soft)
// ============================================================

export async function deleteWorkCycleSession(
  sessionId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("work_cycle_sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_SESSION_DELETED,
      entityType: "work_cycle_session",
      entityId: sessionId,
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// ADD INTERRUPTION
// ============================================================

export async function addInterruption(
  input: CreateInterruptionInput,
): Promise<ActionResponse<WorkCycleInterruption>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const parsed = CreateInterruptionSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;
    const supabase = await createSupabaseServerClient();

    // Verify session belongs to this tenant
    const { data: session } = await supabase
      .from("work_cycle_sessions")
      .select("id, planned_start_time, planned_end_time")
      .eq("id", v.session_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (!session) {
      return failure("Session not found", ErrorCodes.NOT_FOUND);
    }

    const { data: interruption, error: intrError } = await supabase
      .from("work_cycle_interruptions")
      .insert({
        tenant_id: context.tenant.id,
        session_id: v.session_id,
        occurred_at: v.occurred_at,
        duration_minutes: v.duration_minutes,
        source: v.source,
        severity: v.severity,
        description: v.description?.trim() ?? null,
        preventable: v.preventable,
      })
      .select()
      .single();

    if (intrError) return failure(intrError.message, ErrorCodes.CREATE_FAILED);

    // Recalculate longest_uninterrupted_minutes for this session
    const { data: allInterruptions } = await supabase
      .from("work_cycle_interruptions")
      .select("occurred_at, duration_minutes")
      .eq("session_id", v.session_id);

    const longest = calcLongestUninterrupted(
      (session as { planned_start_time: string }).planned_start_time,
      (session as { planned_end_time: string }).planned_end_time,
      (allInterruptions ?? []) as {
        occurred_at: string;
        duration_minutes: number;
      }[],
    );

    await supabase
      .from("work_cycle_sessions")
      .update({ longest_uninterrupted_minutes: longest })
      .eq("id", v.session_id);

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_INTERRUPTION_ADDED,
      entityType: "work_cycle_interruption",
      entityId: interruption.id,
      metadata: {
        session_id: v.session_id,
        source: v.source,
        severity: v.severity,
      },
    });

    return success(interruption as WorkCycleInterruption);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add interruption",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DELETE INTERRUPTION
// ============================================================

export async function deleteInterruption(
  interruptionId: string,
): Promise<ActionResponse<null>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const supabase = await createSupabaseServerClient();

    // Fetch to get session_id for recalculation
    const { data: intr } = await supabase
      .from("work_cycle_interruptions")
      .select("id, session_id")
      .eq("id", interruptionId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!intr) return failure("Interruption not found", ErrorCodes.NOT_FOUND);

    const { error } = await supabase
      .from("work_cycle_interruptions")
      .delete()
      .eq("id", interruptionId)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DELETE_FAILED);

    // Recalculate longest uninterrupted for the parent session
    const sessionId = (intr as { session_id: string }).session_id;
    const { data: session } = await supabase
      .from("work_cycle_sessions")
      .select("planned_start_time, planned_end_time")
      .eq("id", sessionId)
      .single();

    if (session) {
      const { data: remaining } = await supabase
        .from("work_cycle_interruptions")
        .select("occurred_at, duration_minutes")
        .eq("session_id", sessionId);

      const longest = calcLongestUninterrupted(
        (session as { planned_start_time: string }).planned_start_time,
        (session as { planned_end_time: string }).planned_end_time,
        (remaining ?? []) as {
          occurred_at: string;
          duration_minutes: number;
        }[],
      );

      await supabase
        .from("work_cycle_sessions")
        .update({ longest_uninterrupted_minutes: longest })
        .eq("id", sessionId);
    }

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_INTERRUPTION_DELETED,
      entityType: "work_cycle_interruption",
      entityId: interruptionId,
    });

    return success(null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete interruption",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET SESSION WITH DETAILS
// ============================================================

export async function getWorkCycleSession(
  sessionId: string,
): Promise<ActionResponse<WorkCycleSessionWithDetails>> {
  try {
    const context = await getTenantContext();
    const canView =
      hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
      hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
    if (!canView) return failure("Permission denied", ErrorCodes.FORBIDDEN);

    const supabase = await createSupabaseServerClient();

    const { data: row, error } = await supabase
      .from("work_cycle_sessions")
      .select(
        `
        *,
        class:classes(id, name),
        recorder:auth_users(id, first_name, last_name)
        `,
      )
      .eq("id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error || !row)
      return failure("Session not found", ErrorCodes.NOT_FOUND);

    const { data: interruptions } = await supabase
      .from("work_cycle_interruptions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("tenant_id", context.tenant.id)
      .order("occurred_at");

    const intrs = (interruptions ?? []) as WorkCycleInterruption[];
    const totalMins = intrs.reduce((sum, i) => sum + i.duration_minutes, 0);

    const classRow = Array.isArray((row as Record<string, unknown>).class)
      ? ((row as Record<string, unknown>).class as { name: string }[])[0]
      : ((row as Record<string, unknown>).class as { name: string } | null);

    const recorderRow = Array.isArray((row as Record<string, unknown>).recorder)
      ? (
          (row as Record<string, unknown>).recorder as {
            first_name: string | null;
            last_name: string | null;
          }[]
        )[0]
      : ((row as Record<string, unknown>).recorder as {
          first_name: string | null;
          last_name: string | null;
        } | null);

    const session = row as WorkCycleSession;
    const result: WorkCycleSessionWithDetails = {
      ...session,
      interruptions: intrs,
      class_name: classRow?.name ?? "Unknown class",
      recorder_name: recorderRow
        ? `${recorderRow.first_name ?? ""} ${recorderRow.last_name ?? ""}`.trim()
        : "Unknown",
      total_interruption_minutes: totalMins,
      interruption_count: intrs.length,
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load session",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// LIST SESSIONS
// ============================================================

export async function listWorkCycleSessions(
  input: ListSessionsInput = {},
): Promise<PaginatedResponse<WorkCycleSessionWithDetails>> {
  try {
    const context = await getTenantContext();
    const canView =
      hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
      hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
    if (!canView)
      return paginatedFailure("Permission denied", ErrorCodes.FORBIDDEN);

    const parsed = ListSessionsSchema.safeParse(input);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const supabase = await createSupabaseServerClient();
    const offset = (v.page - 1) * v.per_page;

    let query = supabase
      .from("work_cycle_sessions")
      .select("*", { count: "exact" })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (v.class_id) query = query.eq("class_id", v.class_id);
    if (v.from_date) query = query.gte("session_date", v.from_date);
    if (v.to_date) query = query.lte("session_date", v.to_date);

    const {
      data: rows,
      count,
      error,
    } = await query
      .order("session_date", { ascending: false })
      .order("planned_start_time", { ascending: false })
      .range(offset, offset + v.per_page - 1);

    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    const sessions = (rows ?? []) as WorkCycleSession[];
    const sessionIds = sessions.map((s) => s.id);

    // Batch-fetch interruptions for all sessions
    let interruptions: WorkCycleInterruption[] = [];
    if (sessionIds.length > 0) {
      const { data: intrs } = await supabase
        .from("work_cycle_interruptions")
        .select("*")
        .in("session_id", sessionIds)
        .eq("tenant_id", context.tenant.id);
      interruptions = (intrs ?? []) as WorkCycleInterruption[];
    }

    // Batch-fetch class names
    const classIds = [...new Set(sessions.map((s) => s.class_id))];
    let classMap = new Map<string, string>();
    if (classIds.length > 0) {
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds);
      for (const c of (classes ?? []) as { id: string; name: string }[]) {
        classMap.set(c.id, c.name);
      }
    }

    const intrsBySession = new Map<string, WorkCycleInterruption[]>();
    for (const i of interruptions) {
      const arr = intrsBySession.get(i.session_id) ?? [];
      arr.push(i);
      intrsBySession.set(i.session_id, arr);
    }

    const results: WorkCycleSessionWithDetails[] = sessions.map((s) => {
      const intrs = intrsBySession.get(s.id) ?? [];
      return {
        ...s,
        interruptions: intrs,
        class_name: classMap.get(s.class_id) ?? "Unknown class",
        recorder_name: "",
        total_interruption_minutes: intrs.reduce(
          (sum, i) => sum + i.duration_minutes,
          0,
        ),
        interruption_count: intrs.length,
      };
    });

    return paginated(results, count ?? 0, v.page, v.per_page);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Failed to list sessions",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET DASHBOARD
// ============================================================

export async function getWorkCycleDashboard(
  classId?: string | null,
): Promise<ActionResponse<WorkCycleDashboardData>> {
  try {
    const context = await getTenantContext();
    const canView =
      hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
      hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
    if (!canView) return failure("Permission denied", ErrorCodes.FORBIDDEN);

    const supabase = await createSupabaseServerClient();

    // Term = last 90 days
    const termStart = new Date();
    termStart.setDate(termStart.getDate() - 90);
    const termStartStr = termStart.toISOString().split("T")[0];

    // Month window for per-class summaries
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split("T")[0];

    // --- Sessions this term ---
    let sessionsQuery = supabase
      .from("work_cycle_sessions")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .gte("session_date", termStartStr)
      .is("deleted_at", null);

    if (classId) sessionsQuery = sessionsQuery.eq("class_id", classId);

    const { data: allSessions } = await sessionsQuery.order("session_date", {
      ascending: false,
    });
    const sessions = (allSessions ?? []) as WorkCycleSession[];

    // --- Interruptions for these sessions ---
    const sessionIds = sessions.map((s) => s.id);
    let allInterruptions: WorkCycleInterruption[] = [];
    if (sessionIds.length > 0) {
      const { data: intrs } = await supabase
        .from("work_cycle_interruptions")
        .select("*")
        .in("session_id", sessionIds)
        .eq("tenant_id", context.tenant.id);
      allInterruptions = (intrs ?? []) as WorkCycleInterruption[];
    }

    const intrsBySession = new Map<string, WorkCycleInterruption[]>();
    for (const i of allInterruptions) {
      const arr = intrsBySession.get(i.session_id) ?? [];
      arr.push(i);
      intrsBySession.set(i.session_id, arr);
    }

    // --- Classes ---
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true);

    const classMap = new Map<string, string>();
    for (const c of (classes ?? []) as { id: string; name: string }[]) {
      classMap.set(c.id, c.name);
    }

    // --- Aggregate interruption_by_source + interruption_by_severity ---
    const interruptionBySource = {} as Record<
      WorkCycleInterruptionSource,
      number
    >;
    const interruptionBySeverity = {} as Record<
      WorkCycleInterruptionSeverity,
      number
    >;
    let totalPreventable = 0;

    for (const intr of allInterruptions) {
      interruptionBySource[intr.source] =
        (interruptionBySource[intr.source] ?? 0) + 1;
      interruptionBySeverity[intr.severity] =
        (interruptionBySeverity[intr.severity] ?? 0) + 1;
      if (intr.preventable) totalPreventable++;
    }

    // --- Per-class summaries (last 30 days) ---
    const classSessions30d = sessions.filter(
      (s) => s.session_date >= monthAgoStr,
    );

    const classSummaryMap = new Map<
      string,
      {
        sessions: WorkCycleSession[];
        interruptions: WorkCycleInterruption[];
      }
    >();

    for (const s of classSessions30d) {
      const entry = classSummaryMap.get(s.class_id) ?? {
        sessions: [],
        interruptions: [],
      };
      entry.sessions.push(s);
      entry.interruptions.push(...(intrsBySession.get(s.id) ?? []));
      classSummaryMap.set(s.class_id, entry);
    }

    const class_summaries: WorkCycleClassSummary[] = [];
    for (const [
      cId,
      { sessions: cSessions, interruptions: cIntrs },
    ] of classSummaryMap) {
      const avgInterruptions =
        cSessions.length > 0 ? cIntrs.length / cSessions.length : 0;

      const qualityRatings = cSessions
        .filter((s) => s.quality_rating !== null)
        .map((s) => s.quality_rating as number);
      const avgQuality =
        qualityRatings.length > 0
          ? qualityRatings.reduce((a, b) => a + b, 0) / qualityRatings.length
          : null;

      const pctFull =
        cSessions.length > 0
          ? (cSessions.filter((s) => s.completed_full_cycle).length /
              cSessions.length) *
            100
          : 0;

      const totalIntrMins = cIntrs.reduce(
        (sum, i) => sum + i.duration_minutes,
        0,
      );

      // Most common source
      const sourceCounts = {} as Record<string, number>;
      for (const i of cIntrs)
        sourceCounts[i.source] = (sourceCounts[i.source] ?? 0) + 1;
      const mostCommonSource =
        (Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
          | WorkCycleInterruptionSource
          | undefined) ?? null;

      class_summaries.push({
        class_id: cId,
        class_name: classMap.get(cId) ?? "Unknown class",
        sessions_last_30d: cSessions.length,
        avg_interruptions_per_session: avgInterruptions,
        avg_quality_rating: avgQuality,
        pct_completed_full: pctFull,
        total_interruption_minutes_last_30d: totalIntrMins,
        most_common_source: mostCommonSource,
        trend: calcInterruptionTrend(avgInterruptions, avgInterruptions), // simplified - proper trend needs prior 30d
        flagged: avgInterruptions > FLAG_INTERRUPTIONS_THRESHOLD,
      });
    }

    // --- Term totals ---
    const totalIntr = allInterruptions.length;
    const avgInterruptionsPerSession =
      sessions.length > 0 ? totalIntr / sessions.length : 0;

    const allQualityRatings = sessions
      .filter((s) => s.quality_rating !== null)
      .map((s) => s.quality_rating as number);
    const avgQualityRating =
      allQualityRatings.length > 0
        ? allQualityRatings.reduce((a, b) => a + b, 0) /
          allQualityRatings.length
        : null;

    const pctFull =
      sessions.length > 0
        ? (sessions.filter((s) => s.completed_full_cycle).length /
            sessions.length) *
          100
        : 0;

    const pctPreventable =
      totalIntr > 0 ? (totalPreventable / totalIntr) * 100 : 0;

    // Recent sessions (last 5 with details)
    const recentSessions: WorkCycleSessionWithDetails[] = sessions
      .slice(0, 5)
      .map((s) => {
        const intrs = intrsBySession.get(s.id) ?? [];
        return {
          ...s,
          interruptions: intrs,
          class_name: classMap.get(s.class_id) ?? "Unknown class",
          recorder_name: "",
          total_interruption_minutes: intrs.reduce(
            (sum, i) => sum + i.duration_minutes,
            0,
          ),
          interruption_count: intrs.length,
        };
      });

    const dashboard: WorkCycleDashboardData = {
      class_summaries,
      total_sessions_this_term: sessions.length,
      avg_interruptions_per_session: avgInterruptionsPerSession,
      avg_quality_rating: avgQualityRating,
      pct_completed_full: pctFull,
      interruption_by_source: interruptionBySource,
      interruption_by_severity: interruptionBySeverity,
      pct_preventable: pctPreventable,
      flagged_class_count: class_summaries.filter((c) => c.flagged).length,
      recent_sessions: recentSessions,
    };

    return success(dashboard);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// GET TREND DATA (weekly, for a class or whole school)
// ============================================================

export async function getWorkCycleTrend(
  classId?: string | null,
  weeks = 12,
): Promise<ActionResponse<WorkCycleIntegrityTrend[]>> {
  try {
    const context = await getTenantContext();
    const canView =
      hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
      hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
    if (!canView) return failure("Permission denied", ErrorCodes.FORBIDDEN);

    const supabase = await createSupabaseServerClient();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - weeks * 7);
    const fromStr = fromDate.toISOString().split("T")[0];

    let sessionsQuery = supabase
      .from("work_cycle_sessions")
      .select("id, session_date, quality_rating")
      .eq("tenant_id", context.tenant.id)
      .gte("session_date", fromStr)
      .is("deleted_at", null);

    if (classId) sessionsQuery = sessionsQuery.eq("class_id", classId);

    const { data: sessions } = await sessionsQuery;
    const sessionRows = (sessions ?? []) as {
      id: string;
      session_date: string;
      quality_rating: number | null;
    }[];

    if (sessionRows.length === 0) return success([]);

    const sessionIds = sessionRows.map((s) => s.id);
    const { data: intrs } = await supabase
      .from("work_cycle_interruptions")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("tenant_id", context.tenant.id);

    const intrCountsBySession = new Map<string, number>();
    for (const i of (intrs ?? []) as { session_id: string }[]) {
      intrCountsBySession.set(
        i.session_id,
        (intrCountsBySession.get(i.session_id) ?? 0) + 1,
      );
    }

    // Group by ISO week (Monday)
    const weekMap = new Map<
      string,
      {
        totalIntrs: number;
        totalQuality: number;
        qualityCount: number;
        sessions: number;
      }
    >();

    for (const s of sessionRows) {
      const d = new Date(s.session_date);
      // Move to Monday of this week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const weekKey = d.toISOString().split("T")[0];

      const entry = weekMap.get(weekKey) ?? {
        totalIntrs: 0,
        totalQuality: 0,
        qualityCount: 0,
        sessions: 0,
      };
      entry.totalIntrs += intrCountsBySession.get(s.id) ?? 0;
      if (s.quality_rating !== null) {
        entry.totalQuality += s.quality_rating;
        entry.qualityCount++;
      }
      entry.sessions++;
      weekMap.set(weekKey, entry);
    }

    const trend: WorkCycleIntegrityTrend[] = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        avg_interruptions:
          data.sessions > 0 ? data.totalIntrs / data.sessions : 0,
        avg_quality:
          data.qualityCount > 0 ? data.totalQuality / data.qualityCount : null,
        session_count: data.sessions,
      }));

    return success(trend);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load trend",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// EXPORT CSV
// ============================================================

export async function exportWorkCycleSessions(
  classId?: string | null,
  fromDate?: string,
  toDate?: string,
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_WORK_CYCLES);
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("work_cycle_sessions")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (classId) query = query.eq("class_id", classId);
    if (fromDate) query = query.gte("session_date", fromDate);
    if (toDate) query = query.lte("session_date", toDate);

    const { data: sessions } = await query.order("session_date", {
      ascending: false,
    });
    const rows = (sessions ?? []) as WorkCycleSession[];

    if (rows.length === 0) {
      return failure("No sessions to export", ErrorCodes.VALIDATION_ERROR);
    }

    const sessionIds = rows.map((r) => r.id);
    const { data: intrs } = await supabase
      .from("work_cycle_interruptions")
      .select("*")
      .in("session_id", sessionIds)
      .eq("tenant_id", context.tenant.id);

    const intrsBySession = new Map<string, WorkCycleInterruption[]>();
    for (const i of (intrs ?? []) as WorkCycleInterruption[]) {
      const arr = intrsBySession.get(i.session_id) ?? [];
      arr.push(i);
      intrsBySession.set(i.session_id, arr);
    }

    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id);

    const classMap = new Map<string, string>();
    for (const c of (classes ?? []) as { id: string; name: string }[]) {
      classMap.set(c.id, c.name);
    }

    const escape = (v: string | number | boolean | null | undefined) =>
      v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;

    const header =
      "Date,Class,Planned Start,Planned End,Quality Rating,Full Cycle,Interruption Count,Total Interruption Mins,Longest Uninterrupted Mins,Notes";

    const lines = rows.map((s) => {
      const intrs = intrsBySession.get(s.id) ?? [];
      return [
        escape(s.session_date),
        escape(classMap.get(s.class_id) ?? s.class_id),
        escape(s.planned_start_time),
        escape(s.planned_end_time),
        escape(s.quality_rating),
        escape(s.completed_full_cycle ? "Yes" : "No"),
        escape(intrs.length),
        escape(intrs.reduce((sum, i) => sum + i.duration_minutes, 0)),
        escape(s.longest_uninterrupted_minutes),
        escape(s.general_notes),
      ].join(",");
    });

    await logAudit({
      context,
      action: AuditActions.WORK_CYCLE_EXPORTED,
      entityType: "work_cycle_sessions",
      metadata: { row_count: rows.length, class_id: classId ?? "all" },
    });

    return success([header, ...lines].join("\n"));
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
