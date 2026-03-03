"use server";

// src/lib/actions/daily-care.ts
//
// ============================================================
// WattleOS V2 - Module O: Daily Care Log (Reg 162)
// ============================================================
// Mandatory daily care records for children under preschool age:
// nappy changes, sleep/rest times (with periodic checks), meals,
// bottles, sunscreen application, and wellbeing notes.
//
// National Regulation 162 requires services to keep a record of
// each child's daily care (food, sleep, nappy changes, health)
// and to share this with families at the end of each day.
//
// Permissions:
//   VIEW_DAILY_CARE_LOGS   - read logs, entries, dashboard, exports
//   MANAGE_DAILY_CARE_LOGS - create/update/delete entries, share logs
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { SUNSCREEN_REAPPLY_MINUTES } from "@/lib/constants/daily-care";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  createDailyCareLogSchema,
  createCareEntrySchema,
  updateCareEntrySchema,
  createSleepCheckSchema,
  shareDailyCareLogSchema,
  listDailyCareFilterSchema,
  type CreateCareEntryRawInput,
  type UpdateCareEntryRawInput,
  type CreateSleepCheckInput,
  type ShareDailyCareLogRawInput,
  type ListDailyCareFilterRawInput,
} from "@/lib/validations/daily-care";
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
  DailyCareLog,
  DailyCareEntry,
  DailyCareSleepCheck,
  DailyCareEntryWithRecorder,
  DailyCareLogWithEntries,
  DailyCareLogListItem,
  ActiveSleeper,
  SunscreenReminder,
  DailyCareDashboardData,
  CareEntryType,
} from "@/types/domain";

// ── Helpers ──────────────────────────────────────────────────

/** Today's date in YYYY-MM-DD format */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Calculate sunscreen reapply due timestamp from a given ISO timestamp */
function calcSunscreenReapplyDue(recordedAt: string): string {
  const d = new Date(recordedAt);
  d.setMinutes(d.getMinutes() + SUNSCREEN_REAPPLY_MINUTES);
  return d.toISOString();
}

/** Calculate a child's age in years from their DOB */
function ageInYears(dob: string): number {
  const birthDate = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

// ── Entry detail columns (explicit select) ────────────────────
const ENTRY_COLUMNS =
  "id, tenant_id, log_id, student_id, entry_type, recorded_at, recorded_by, " +
  "nappy_type, nappy_cream_applied, meal_type, food_offered, food_consumed, " +
  "bottle_type, bottle_amount_ml, sleep_position, sleep_manner, " +
  "sunscreen_spf, sunscreen_reapply_due, wellbeing_mood, wellbeing_temperature, " +
  "notes, created_at, updated_at, deleted_at";

const LOG_COLUMNS =
  "id, tenant_id, student_id, log_date, status, shared_at, shared_by, " +
  "general_notes, created_by, created_at, updated_at, deleted_at";

// ============================================================
// 1. DASHBOARD
// ============================================================

export async function getDailyCareLogDashboard(): Promise<
  ActionResponse<DailyCareDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();
    const todayStr = today();

    // Fetch today's logs with student info
    const { data: logs, error: logsError } = await supabase
      .from("daily_care_logs")
      .select(
        `${LOG_COLUMNS}, students!inner(id, first_name, last_name, preferred_name, photo_url)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("log_date", todayStr)
      .is("deleted_at", null);

    if (logsError) {
      return failure(logsError.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (logs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    // Fetch all today's entries
    let entries: Array<Record<string, unknown>> = [];
    if (logIds.length > 0) {
      const { data: entryData, error: entryError } = await supabase
        .from("daily_care_entries")
        .select(ENTRY_COLUMNS)
        .in("log_id", logIds)
        .is("deleted_at", null)
        .order("recorded_at", { ascending: false });

      if (entryError) {
        return failure(entryError.message, ErrorCodes.DATABASE_ERROR);
      }
      entries = (entryData ?? []) as unknown as Array<Record<string, unknown>>;
    }

    // Count eligible children (all active enrolled)
    const { count: eligibleCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("enrollment_status", "active")
      .is("deleted_at", null);

    // Build summary counts
    const entryTypeCounts: Record<string, number> = {};
    for (const e of entries) {
      const t = e.entry_type as string;
      entryTypeCounts[t] = (entryTypeCounts[t] ?? 0) + 1;
    }

    // Build entry count and last_entry_at per log
    const logEntryCountMap: Record<string, number> = {};
    const logLastEntryMap: Record<string, string | null> = {};
    for (const e of entries) {
      const logId = e.log_id as string;
      logEntryCountMap[logId] = (logEntryCountMap[logId] ?? 0) + 1;
      const recAt = e.recorded_at as string;
      if (!logLastEntryMap[logId] || recAt > logLastEntryMap[logId]!) {
        logLastEntryMap[logId] = recAt;
      }
    }

    const logListItems: DailyCareLogListItem[] = (logs ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        const logId = rest.id as string;
        return {
          ...rest,
          student: students,
          entry_count: logEntryCountMap[logId] ?? 0,
          last_entry_at: logLastEntryMap[logId] ?? null,
        } as unknown as DailyCareLogListItem;
      },
    );

    // Active sleepers: sleep_start entries today with no corresponding sleep_end
    const sleepStarts = entries.filter((e) => e.entry_type === "sleep_start");
    const sleepEnds = entries.filter((e) => e.entry_type === "sleep_end");
    const sleepEndStudentIds = new Set(
      sleepEnds.map((e) => e.student_id as string),
    );

    // For each sleep_start, check if there's a sleep_end for that student after this sleep_start
    const activeSleepEntries: Array<Record<string, unknown>> = [];
    for (const ss of sleepStarts) {
      const studentId = ss.student_id as string;
      const startTime = ss.recorded_at as string;
      // Check if any sleep_end exists for this student with recorded_at > startTime
      const hasEnd = sleepEnds.some(
        (se) =>
          (se.student_id as string) === studentId &&
          (se.recorded_at as string) > startTime,
      );
      if (!hasEnd) {
        activeSleepEntries.push(ss);
      }
    }

    // Fetch student info for active sleepers
    const activeSleeperStudentIds = [
      ...new Set(activeSleepEntries.map((e) => e.student_id as string)),
    ];
    let sleepStudentMap: Record<string, Record<string, unknown>> = {};
    if (activeSleeperStudentIds.length > 0) {
      const { data: sleepStudents } = await supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name, photo_url, dob")
        .in("id", activeSleeperStudentIds);

      for (const s of sleepStudents ?? []) {
        sleepStudentMap[(s as Record<string, unknown>).id as string] =
          s as Record<string, unknown>;
      }
    }

    // Fetch sleep check counts for active sleeper entries
    const activeSleeperEntryIds = activeSleepEntries.map((e) => e.id as string);
    let sleepCheckMap: Record<
      string,
      { count: number; lastCheck: string | null }
    > = {};
    if (activeSleeperEntryIds.length > 0) {
      const { data: checks } = await supabase
        .from("daily_care_sleep_checks")
        .select("id, entry_id, checked_at")
        .in("entry_id", activeSleeperEntryIds)
        .order("checked_at", { ascending: false });

      for (const c of (checks ?? []) as Array<Record<string, unknown>>) {
        const eid = c.entry_id as string;
        if (!sleepCheckMap[eid]) {
          sleepCheckMap[eid] = { count: 0, lastCheck: null };
        }
        sleepCheckMap[eid].count++;
        if (
          !sleepCheckMap[eid].lastCheck ||
          (c.checked_at as string) > sleepCheckMap[eid].lastCheck!
        ) {
          sleepCheckMap[eid].lastCheck = c.checked_at as string;
        }
      }
    }

    const activeSleepers: ActiveSleeper[] = activeSleepEntries.map((e) => {
      const entryId = e.id as string;
      const studentId = e.student_id as string;
      return {
        entry: e as unknown as DailyCareEntry,
        student: sleepStudentMap[studentId] as ActiveSleeper["student"],
        sleep_start: e.recorded_at as string,
        last_check_at: sleepCheckMap[entryId]?.lastCheck ?? null,
        check_count: sleepCheckMap[entryId]?.count ?? 0,
      };
    });

    // Sunscreen reapply due
    const nowIso = new Date().toISOString();
    const sunscreenEntries = entries.filter(
      (e) =>
        e.entry_type === "sunscreen" &&
        e.sunscreen_reapply_due !== null &&
        (e.sunscreen_reapply_due as string) < nowIso,
    );

    const sunscreenStudentIds = [
      ...new Set(sunscreenEntries.map((e) => e.student_id as string)),
    ];
    let sunscreenStudentMap: Record<string, Record<string, unknown>> = {};
    if (sunscreenStudentIds.length > 0) {
      const { data: ssStudents } = await supabase
        .from("students")
        .select("id, first_name, last_name, preferred_name, photo_url")
        .in("id", sunscreenStudentIds);

      for (const s of ssStudents ?? []) {
        sunscreenStudentMap[(s as Record<string, unknown>).id as string] =
          s as Record<string, unknown>;
      }
    }

    const sunscreenReapplyDue: SunscreenReminder[] = sunscreenEntries.map(
      (e) => {
        const dueStr = e.sunscreen_reapply_due as string;
        const dueDate = new Date(dueStr);
        const nowDate = new Date();
        const minutesOverdue = Math.max(
          0,
          Math.floor((nowDate.getTime() - dueDate.getTime()) / 60000),
        );
        return {
          entry: e as unknown as DailyCareEntry,
          student: sunscreenStudentMap[
            e.student_id as string
          ] as SunscreenReminder["student"],
          reapply_due: dueStr,
          minutes_overdue: minutesOverdue,
        };
      },
    );

    const sharedCount = (logs ?? []).filter(
      (l: Record<string, unknown>) => l.status === "shared",
    ).length;

    const dashboard: DailyCareDashboardData = {
      summary: {
        total_children_logged: logListItems.length,
        total_eligible_children: eligibleCount ?? 0,
        total_entries_today: entries.length,
        nappy_changes: entryTypeCounts["nappy_change"] ?? 0,
        meals: entryTypeCounts["meal"] ?? 0,
        bottles: entryTypeCounts["bottle"] ?? 0,
        sleeps:
          (entryTypeCounts["sleep_start"] ?? 0) +
          (entryTypeCounts["sleep_end"] ?? 0),
        sunscreen_applications: entryTypeCounts["sunscreen"] ?? 0,
        wellbeing_notes: entryTypeCounts["wellbeing_note"] ?? 0,
        logs_shared: sharedCount,
        logs_pending: logListItems.length - sharedCount,
      },
      logs_today: logListItems,
      active_sleepers: activeSleepers,
      sunscreen_reapply_due: sunscreenReapplyDue,
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
// 2. GET OR CREATE DAILY LOG
// ============================================================

export async function getOrCreateDailyLog(
  studentId: string,
  logDate: string,
): Promise<ActionResponse<DailyCareLog>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = createDailyCareLogSchema.safeParse({
      student_id: studentId,
      log_date: logDate,
    });
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check for existing log
    const { data: existing, error: findError } = await supabase
      .from("daily_care_logs")
      .select(LOG_COLUMNS)
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("log_date", logDate)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (existing) {
      return success(existing as unknown as DailyCareLog);
    }

    // Create new log
    const { data: newLog, error: createError } = await supabase
      .from("daily_care_logs")
      .insert({
        tenant_id: context.tenant.id,
        student_id: studentId,
        log_date: logDate,
        status: "in_progress",
        created_by: context.user.id,
      })
      .select(LOG_COLUMNS)
      .single();

    if (createError || !newLog) {
      return failure(
        createError?.message ?? "Failed to create daily log",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_LOG_CREATED,
      entityType: "daily_care_log",
      entityId: (newLog as Record<string, unknown>).id as string,
      metadata: { student_id: studentId, log_date: logDate },
    });

    return success(newLog as unknown as DailyCareLog);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get or create daily log",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 3. GET DAILY CARE LOG (with entries)
// ============================================================

export async function getDailyCareLog(
  logId: string,
): Promise<ActionResponse<DailyCareLogWithEntries>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Fetch the log with student
    const { data: log, error: logError } = await supabase
      .from("daily_care_logs")
      .select(
        `${LOG_COLUMNS}, students!inner(id, first_name, last_name, preferred_name, photo_url, dob)`,
      )
      .eq("id", logId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (logError) {
      return failure(logError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!log) {
      return failure("Daily care log not found", ErrorCodes.NOT_FOUND);
    }

    // Fetch entries for this log
    const { data: entryRows, error: entryError } = await supabase
      .from("daily_care_entries")
      .select(ENTRY_COLUMNS)
      .eq("log_id", logId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("recorded_at", { ascending: true });

    if (entryError) {
      return failure(entryError.message, ErrorCodes.DATABASE_ERROR);
    }

    const rawEntries = (entryRows ?? []) as Array<Record<string, unknown>>;

    // Fetch recorder info for entries
    const recorderIds = [
      ...new Set(rawEntries.map((e) => e.recorded_by as string)),
    ];
    let recorderMap: Record<string, Record<string, unknown>> = {};
    if (recorderIds.length > 0) {
      const { data: recorders } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", recorderIds);

      for (const r of (recorders ?? []) as Array<Record<string, unknown>>) {
        recorderMap[r.id as string] = r;
      }
    }

    // Fetch sleep checks for sleep_start entries
    const sleepEntryIds = rawEntries
      .filter((e) => e.entry_type === "sleep_start")
      .map((e) => e.id as string);

    let sleepChecksMap: Record<string, DailyCareSleepCheck[]> = {};
    if (sleepEntryIds.length > 0) {
      const { data: checks } = await supabase
        .from("daily_care_sleep_checks")
        .select(
          "id, tenant_id, entry_id, checked_at, checked_by, position, breathing_normal, skin_colour_normal, notes",
        )
        .in("entry_id", sleepEntryIds)
        .order("checked_at", { ascending: true });

      for (const c of (checks ?? []) as Array<Record<string, unknown>>) {
        const eid = c.entry_id as string;
        if (!sleepChecksMap[eid]) {
          sleepChecksMap[eid] = [];
        }
        sleepChecksMap[eid].push(c as unknown as DailyCareSleepCheck);
      }
    }

    // Fetch created_by user info
    const createdById = (log as Record<string, unknown>).created_by as string;
    let createdByUser: Record<string, unknown> | null = null;
    if (createdById) {
      const { data: cUser } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("id", createdById)
        .maybeSingle();
      createdByUser = cUser as Record<string, unknown> | null;
    }

    // Assemble entries with recorder + sleep checks
    const entriesWithRecorder: DailyCareEntryWithRecorder[] = rawEntries.map(
      (e) => {
        const recorder = recorderMap[e.recorded_by as string] ?? null;
        const checks =
          e.entry_type === "sleep_start"
            ? (sleepChecksMap[e.id as string] ?? [])
            : undefined;
        return {
          ...(e as unknown as DailyCareEntry),
          recorder: recorder
            ? {
                id: recorder.id as string,
                first_name: recorder.first_name as string | null,
                last_name: recorder.last_name as string | null,
              }
            : null,
          sleep_checks: checks,
        };
      },
    );

    // Assemble the full log
    const { students, ...logRest } = log as Record<string, unknown> & {
      students: Record<string, unknown>;
    };

    const result: DailyCareLogWithEntries = {
      ...(logRest as unknown as DailyCareLog),
      student: students as DailyCareLogWithEntries["student"],
      entries: entriesWithRecorder,
      created_by_user: createdByUser
        ? {
            id: createdByUser.id as string,
            first_name: createdByUser.first_name as string | null,
            last_name: createdByUser.last_name as string | null,
          }
        : null,
    };

    return success(result);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load daily care log",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 4. GET DAILY CARE LOG BY STUDENT + DATE
// ============================================================

export async function getDailyCareLogByStudentDate(
  studentId: string,
  date: string,
): Promise<ActionResponse<DailyCareLogWithEntries | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Look up the log
    const { data: log, error: findError } = await supabase
      .from("daily_care_logs")
      .select(LOG_COLUMNS)
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("log_date", date)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!log) {
      return success(null);
    }

    // Reuse getDailyCareLog for the full hydrated response
    const logId = (log as Record<string, unknown>).id as string;
    return getDailyCareLog(logId);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to load daily care log by student date",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 5. LIST DAILY CARE LOGS (paginated)
// ============================================================

export async function listDailyCareLogs(
  input: ListDailyCareFilterRawInput,
): Promise<PaginatedResponse<DailyCareLogListItem>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = listDailyCareFilterSchema.safeParse(input);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const f = parsed.data;

    let query = supabase
      .from("daily_care_logs")
      .select(
        `${LOG_COLUMNS}, students!inner(id, first_name, last_name, preferred_name, photo_url)`,
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    if (f.date) {
      query = query.eq("log_date", f.date);
    }
    if (f.student_id) {
      query = query.eq("student_id", f.student_id);
    }
    if (f.status) {
      query = query.eq("status", f.status);
    }
    if (f.search) {
      query = query.or(
        `first_name.ilike.%${f.search}%,last_name.ilike.%${f.search}%`,
        { referencedTable: "students" },
      );
    }

    const from = (f.page - 1) * f.per_page;
    const to = from + f.per_page - 1;

    const {
      data: logs,
      error,
      count,
    } = await query
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (logs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    // Fetch entry counts + last entry per log
    let logEntryCountMap: Record<string, number> = {};
    let logLastEntryMap: Record<string, string | null> = {};

    if (logIds.length > 0) {
      const { data: entryRows } = await supabase
        .from("daily_care_entries")
        .select("id, log_id, recorded_at")
        .in("log_id", logIds)
        .is("deleted_at", null);

      for (const e of (entryRows ?? []) as Array<Record<string, unknown>>) {
        const logId = e.log_id as string;
        logEntryCountMap[logId] = (logEntryCountMap[logId] ?? 0) + 1;
        const recAt = e.recorded_at as string;
        if (!logLastEntryMap[logId] || recAt > logLastEntryMap[logId]!) {
          logLastEntryMap[logId] = recAt;
        }
      }
    }

    const items: DailyCareLogListItem[] = (logs ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        const logId = rest.id as string;
        return {
          ...rest,
          student: students,
          entry_count: logEntryCountMap[logId] ?? 0,
          last_entry_at: logLastEntryMap[logId] ?? null,
        } as unknown as DailyCareLogListItem;
      },
    );

    return paginated(items, count ?? 0, f.page, f.per_page);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Failed to list daily care logs",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 6. ADD CARE ENTRY
// ============================================================

export async function addCareEntry(
  input: CreateCareEntryRawInput,
): Promise<ActionResponse<DailyCareEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = createCareEntrySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Ensure daily log exists
    const logResult = await getOrCreateDailyLog(v.student_id, v.log_date);
    if (logResult.error || !logResult.data) {
      return failure(
        logResult.error?.message ?? "Failed to create daily log",
        ErrorCodes.CREATE_FAILED,
      );
    }
    const log = logResult.data;

    const recordedAt = v.recorded_at ?? new Date().toISOString();

    // Calculate sunscreen reapply due if this is a sunscreen entry
    const sunscreenReapplyDue =
      v.entry_type === "sunscreen" ? calcSunscreenReapplyDue(recordedAt) : null;

    const { data: entry, error: insertError } = await supabase
      .from("daily_care_entries")
      .insert({
        tenant_id: context.tenant.id,
        log_id: log.id,
        student_id: v.student_id,
        entry_type: v.entry_type,
        recorded_at: recordedAt,
        recorded_by: context.user.id,
        nappy_type: v.nappy_type,
        nappy_cream_applied: v.nappy_cream_applied,
        meal_type: v.meal_type,
        food_offered: v.food_offered,
        food_consumed: v.food_consumed,
        bottle_type: v.bottle_type,
        bottle_amount_ml: v.bottle_amount_ml,
        sleep_position: v.sleep_position,
        sleep_manner: v.sleep_manner,
        sunscreen_spf: v.sunscreen_spf,
        sunscreen_reapply_due: sunscreenReapplyDue,
        wellbeing_mood: v.wellbeing_mood,
        wellbeing_temperature: v.wellbeing_temperature,
        notes: v.notes,
      })
      .select(ENTRY_COLUMNS)
      .single();

    if (insertError || !entry) {
      return failure(
        insertError?.message ?? "Failed to add care entry",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_ENTRY_CREATED,
      entityType: "daily_care_entry",
      entityId: (entry as Record<string, unknown>).id as string,
      metadata: {
        log_id: log.id,
        student_id: v.student_id,
        entry_type: v.entry_type,
      },
    });

    return success(entry as unknown as DailyCareEntry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to add care entry",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 7. UPDATE CARE ENTRY
// ============================================================

export async function updateCareEntry(
  entryId: string,
  input: UpdateCareEntryRawInput,
): Promise<ActionResponse<DailyCareEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = updateCareEntrySchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Fetch current entry to check ownership and entry_type
    const { data: existing, error: findError } = await supabase
      .from("daily_care_entries")
      .select(ENTRY_COLUMNS)
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!existing) {
      return failure("Care entry not found", ErrorCodes.NOT_FOUND);
    }

    const existingEntry = existing as Record<string, unknown>;

    // Build update object from provided fields only
    const updateData: Record<string, unknown> = {};

    if (v.recorded_at !== undefined) updateData.recorded_at = v.recorded_at;
    if (v.nappy_type !== undefined) updateData.nappy_type = v.nappy_type;
    if (v.nappy_cream_applied !== undefined)
      updateData.nappy_cream_applied = v.nappy_cream_applied;
    if (v.meal_type !== undefined) updateData.meal_type = v.meal_type;
    if (v.food_offered !== undefined) updateData.food_offered = v.food_offered;
    if (v.food_consumed !== undefined)
      updateData.food_consumed = v.food_consumed;
    if (v.bottle_type !== undefined) updateData.bottle_type = v.bottle_type;
    if (v.bottle_amount_ml !== undefined)
      updateData.bottle_amount_ml = v.bottle_amount_ml;
    if (v.sleep_position !== undefined)
      updateData.sleep_position = v.sleep_position;
    if (v.sleep_manner !== undefined) updateData.sleep_manner = v.sleep_manner;
    if (v.sunscreen_spf !== undefined)
      updateData.sunscreen_spf = v.sunscreen_spf;
    if (v.wellbeing_mood !== undefined)
      updateData.wellbeing_mood = v.wellbeing_mood;
    if (v.wellbeing_temperature !== undefined)
      updateData.wellbeing_temperature = v.wellbeing_temperature;
    if (v.notes !== undefined) updateData.notes = v.notes;

    // Recalculate sunscreen_reapply_due if recorded_at changed on a sunscreen entry
    if (
      existingEntry.entry_type === "sunscreen" &&
      v.recorded_at !== undefined
    ) {
      updateData.sunscreen_reapply_due = calcSunscreenReapplyDue(v.recorded_at);
    }

    if (Object.keys(updateData).length === 0) {
      return success(existingEntry as unknown as DailyCareEntry);
    }

    const { data: updated, error: updateError } = await supabase
      .from("daily_care_entries")
      .update(updateData)
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .select(ENTRY_COLUMNS)
      .single();

    if (updateError || !updated) {
      return failure(
        updateError?.message ?? "Failed to update care entry",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_ENTRY_UPDATED,
      entityType: "daily_care_entry",
      entityId: entryId,
      metadata: {
        updated_fields: Object.keys(updateData),
        entry_type: existingEntry.entry_type,
      },
    });

    return success(updated as unknown as DailyCareEntry);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update care entry",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 8. DELETE CARE ENTRY (soft delete)
// ============================================================

export async function deleteCareEntry(
  entryId: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Verify the entry exists
    const { data: existing, error: findError } = await supabase
      .from("daily_care_entries")
      .select("id, tenant_id, log_id, entry_type, student_id")
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!existing) {
      return failure("Care entry not found", ErrorCodes.NOT_FOUND);
    }

    const { error: deleteError } = await supabase
      .from("daily_care_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id);

    if (deleteError) {
      return failure(deleteError.message, ErrorCodes.DELETE_FAILED);
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_ENTRY_DELETED,
      entityType: "daily_care_entry",
      entityId: entryId,
      metadata: {
        log_id: (existing as Record<string, unknown>).log_id,
        student_id: (existing as Record<string, unknown>).student_id,
        entry_type: (existing as Record<string, unknown>).entry_type,
      },
    });

    return success({ id: entryId });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete care entry",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 9. RECORD SLEEP CHECK
// ============================================================

export async function recordSleepCheck(
  input: CreateSleepCheckInput,
): Promise<ActionResponse<DailyCareSleepCheck>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = createSleepCheckSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify the entry exists and is a sleep_start
    const { data: sleepEntry, error: findError } = await supabase
      .from("daily_care_entries")
      .select("id, entry_type, student_id, log_id")
      .eq("id", v.entry_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!sleepEntry) {
      return failure("Sleep entry not found", ErrorCodes.NOT_FOUND);
    }
    if ((sleepEntry as Record<string, unknown>).entry_type !== "sleep_start") {
      return failure(
        "Sleep checks can only be recorded for sleep_start entries",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const checkedAt = v.checked_at ?? new Date().toISOString();

    const { data: check, error: insertError } = await supabase
      .from("daily_care_sleep_checks")
      .insert({
        tenant_id: context.tenant.id,
        entry_id: v.entry_id,
        checked_at: checkedAt,
        checked_by: context.user.id,
        position: v.position,
        breathing_normal: v.breathing_normal,
        skin_colour_normal: v.skin_colour_normal,
        notes: v.notes,
      })
      .select(
        "id, tenant_id, entry_id, checked_at, checked_by, position, breathing_normal, skin_colour_normal, notes",
      )
      .single();

    if (insertError || !check) {
      return failure(
        insertError?.message ?? "Failed to record sleep check",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_SLEEP_CHECK_RECORDED,
      entityType: "daily_care_sleep_check",
      entityId: (check as Record<string, unknown>).id as string,
      metadata: {
        entry_id: v.entry_id,
        position: v.position,
        breathing_normal: v.breathing_normal,
        skin_colour_normal: v.skin_colour_normal,
        student_id: (sleepEntry as Record<string, unknown>).student_id,
      },
    });

    return success(check as unknown as DailyCareSleepCheck);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to record sleep check",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 10. GET SLEEP CHECKS
// ============================================================

export async function getSleepChecks(
  entryId: string,
): Promise<ActionResponse<DailyCareSleepCheck[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Verify entry exists and belongs to tenant
    const { data: entry, error: findError } = await supabase
      .from("daily_care_entries")
      .select("id")
      .eq("id", entryId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!entry) {
      return failure("Sleep entry not found", ErrorCodes.NOT_FOUND);
    }

    const { data: checks, error: checksError } = await supabase
      .from("daily_care_sleep_checks")
      .select(
        "id, tenant_id, entry_id, checked_at, checked_by, position, breathing_normal, skin_colour_normal, notes",
      )
      .eq("entry_id", entryId)
      .eq("tenant_id", context.tenant.id)
      .order("checked_at", { ascending: true });

    if (checksError) {
      return failure(checksError.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((checks ?? []) as unknown as DailyCareSleepCheck[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load sleep checks",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 11. GET ACTIVE SLEEPERS
// ============================================================

export async function getActiveSleepers(): Promise<
  ActionResponse<ActiveSleeper[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();
    const todayStr = today();

    // Fetch today's logs for this tenant
    const { data: todayLogs, error: logError } = await supabase
      .from("daily_care_logs")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("log_date", todayStr)
      .is("deleted_at", null);

    if (logError) {
      return failure(logError.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (todayLogs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    if (logIds.length === 0) {
      return success([]);
    }

    // Fetch all sleep entries today (both start and end)
    const { data: sleepEntries, error: entryError } = await supabase
      .from("daily_care_entries")
      .select(ENTRY_COLUMNS)
      .in("log_id", logIds)
      .in("entry_type", ["sleep_start", "sleep_end"])
      .is("deleted_at", null)
      .order("recorded_at", { ascending: true });

    if (entryError) {
      return failure(entryError.message, ErrorCodes.DATABASE_ERROR);
    }

    const allSleepEntries = (sleepEntries ?? []) as Array<
      Record<string, unknown>
    >;
    const starts = allSleepEntries.filter(
      (e) => e.entry_type === "sleep_start",
    );
    const ends = allSleepEntries.filter((e) => e.entry_type === "sleep_end");

    // Identify active sleepers: sleep_start entries without a subsequent sleep_end
    const activeEntries: Array<Record<string, unknown>> = [];
    for (const ss of starts) {
      const studentId = ss.student_id as string;
      const startTime = ss.recorded_at as string;
      const hasEnd = ends.some(
        (se) =>
          (se.student_id as string) === studentId &&
          (se.recorded_at as string) > startTime,
      );
      if (!hasEnd) {
        activeEntries.push(ss);
      }
    }

    if (activeEntries.length === 0) {
      return success([]);
    }

    // Fetch student info
    const studentIds = [
      ...new Set(activeEntries.map((e) => e.student_id as string)),
    ];
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url, dob")
      .in("id", studentIds);

    const studentMap: Record<string, Record<string, unknown>> = {};
    for (const s of (students ?? []) as Array<Record<string, unknown>>) {
      studentMap[s.id as string] = s;
    }

    // Fetch sleep check data
    const activeEntryIds = activeEntries.map((e) => e.id as string);
    const { data: checks } = await supabase
      .from("daily_care_sleep_checks")
      .select("id, entry_id, checked_at")
      .in("entry_id", activeEntryIds)
      .order("checked_at", { ascending: false });

    const checkMap: Record<
      string,
      { count: number; lastCheck: string | null }
    > = {};
    for (const c of (checks ?? []) as Array<Record<string, unknown>>) {
      const eid = c.entry_id as string;
      if (!checkMap[eid]) {
        checkMap[eid] = { count: 0, lastCheck: null };
      }
      checkMap[eid].count++;
      if (
        !checkMap[eid].lastCheck ||
        (c.checked_at as string) > checkMap[eid].lastCheck!
      ) {
        checkMap[eid].lastCheck = c.checked_at as string;
      }
    }

    const activeSleepers: ActiveSleeper[] = activeEntries.map((e) => {
      const entryId = e.id as string;
      const studentId = e.student_id as string;
      return {
        entry: e as unknown as DailyCareEntry,
        student: studentMap[studentId] as ActiveSleeper["student"],
        sleep_start: e.recorded_at as string,
        last_check_at: checkMap[entryId]?.lastCheck ?? null,
        check_count: checkMap[entryId]?.count ?? 0,
      };
    });

    return success(activeSleepers);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load active sleepers",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 12. GET SUNSCREEN DUE
// ============================================================

export async function getSunscreenDue(): Promise<
  ActionResponse<SunscreenReminder[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();
    const todayStr = today();
    const nowIso = new Date().toISOString();

    // Fetch today's logs
    const { data: todayLogs, error: logError } = await supabase
      .from("daily_care_logs")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("log_date", todayStr)
      .is("deleted_at", null);

    if (logError) {
      return failure(logError.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (todayLogs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    if (logIds.length === 0) {
      return success([]);
    }

    // Fetch sunscreen entries where reapply is due
    const { data: sunscreenEntries, error: entryError } = await supabase
      .from("daily_care_entries")
      .select(ENTRY_COLUMNS)
      .in("log_id", logIds)
      .eq("entry_type", "sunscreen")
      .is("deleted_at", null)
      .lt("sunscreen_reapply_due", nowIso)
      .order("sunscreen_reapply_due", { ascending: true });

    if (entryError) {
      return failure(entryError.message, ErrorCodes.DATABASE_ERROR);
    }

    const rawEntries = (sunscreenEntries ?? []) as Array<
      Record<string, unknown>
    >;

    if (rawEntries.length === 0) {
      return success([]);
    }

    // For each student, only keep the latest sunscreen entry (in case of
    // multiple applications, the most recent one determines reapply time)
    const latestByStudent: Record<string, Record<string, unknown>> = {};
    for (const e of rawEntries) {
      const sid = e.student_id as string;
      const existing = latestByStudent[sid];
      if (
        !existing ||
        (e.recorded_at as string) > (existing.recorded_at as string)
      ) {
        latestByStudent[sid] = e;
      }
    }
    const deduped = Object.values(latestByStudent);

    // Fetch student info
    const studentIds = deduped.map((e) => e.student_id as string);
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .in("id", studentIds);

    const studentMap: Record<string, Record<string, unknown>> = {};
    for (const s of (students ?? []) as Array<Record<string, unknown>>) {
      studentMap[s.id as string] = s;
    }

    const nowDate = new Date();
    const reminders: SunscreenReminder[] = deduped.map((e) => {
      const dueStr = e.sunscreen_reapply_due as string;
      const dueDate = new Date(dueStr);
      const minutesOverdue = Math.max(
        0,
        Math.floor((nowDate.getTime() - dueDate.getTime()) / 60000),
      );
      return {
        entry: e as unknown as DailyCareEntry,
        student: studentMap[
          e.student_id as string
        ] as SunscreenReminder["student"],
        reapply_due: dueStr,
        minutes_overdue: minutesOverdue,
      };
    });

    return success(reminders);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load sunscreen reminders",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 13. SHARE DAILY CARE LOG
// ============================================================

export async function shareDailyCareLog(
  input: ShareDailyCareLogRawInput,
): Promise<ActionResponse<DailyCareLog>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const parsed = shareDailyCareLogSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Verify the log exists
    const { data: existing, error: findError } = await supabase
      .from("daily_care_logs")
      .select("id, student_id, log_date, status")
      .eq("id", v.log_id)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!existing) {
      return failure("Daily care log not found", ErrorCodes.NOT_FOUND);
    }

    const updateData: Record<string, unknown> = {
      status: "shared",
      shared_at: new Date().toISOString(),
      shared_by: context.user.id,
    };

    if (v.general_notes !== undefined) {
      updateData.general_notes = v.general_notes;
    }

    const { data: updated, error: updateError } = await supabase
      .from("daily_care_logs")
      .update(updateData)
      .eq("id", v.log_id)
      .eq("tenant_id", context.tenant.id)
      .select(LOG_COLUMNS)
      .single();

    if (updateError || !updated) {
      return failure(
        updateError?.message ?? "Failed to share daily care log",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.DAILY_CARE_LOG_SHARED,
      entityType: "daily_care_log",
      entityId: v.log_id,
      metadata: {
        student_id: (existing as Record<string, unknown>).student_id,
        log_date: (existing as Record<string, unknown>).log_date,
      },
    });

    return success(updated as unknown as DailyCareLog);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to share daily care log",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 14. UNSHARE DAILY CARE LOG
// ============================================================

export async function unshareDailyCareLog(
  logId: string,
): Promise<ActionResponse<DailyCareLog>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Verify the log exists
    const { data: existing, error: findError } = await supabase
      .from("daily_care_logs")
      .select("id, status")
      .eq("id", logId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }
    if (!existing) {
      return failure("Daily care log not found", ErrorCodes.NOT_FOUND);
    }

    const { data: updated, error: updateError } = await supabase
      .from("daily_care_logs")
      .update({
        status: "in_progress",
        shared_at: null,
        shared_by: null,
      })
      .eq("id", logId)
      .eq("tenant_id", context.tenant.id)
      .select(LOG_COLUMNS)
      .single();

    if (updateError || !updated) {
      return failure(
        updateError?.message ?? "Failed to unshare daily care log",
        ErrorCodes.UPDATE_FAILED,
      );
    }

    // No audit for correction action (as specified)

    return success(updated as unknown as DailyCareLog);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to unshare daily care log",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 15. GET CHILD CARE HISTORY (parent-facing, shared logs only)
// ============================================================

export async function getChildCareHistory(
  studentId: string,
  page: number = 1,
  perPage: number = 25,
): Promise<PaginatedResponse<DailyCareLogListItem>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    const safePage = Math.max(1, Math.floor(page));
    const safePerPage = Math.max(1, Math.min(100, Math.floor(perPage)));

    const from = (safePage - 1) * safePerPage;
    const to = from + safePerPage - 1;

    const {
      data: logs,
      error,
      count,
    } = await supabase
      .from("daily_care_logs")
      .select(
        `${LOG_COLUMNS}, students!inner(id, first_name, last_name, preferred_name, photo_url)`,
        { count: "exact" },
      )
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "shared")
      .is("deleted_at", null)
      .order("log_date", { ascending: false })
      .range(from, to);

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (logs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    // Fetch entry counts + last entry per log
    let logEntryCountMap: Record<string, number> = {};
    let logLastEntryMap: Record<string, string | null> = {};

    if (logIds.length > 0) {
      const { data: entryRows } = await supabase
        .from("daily_care_entries")
        .select("id, log_id, recorded_at")
        .in("log_id", logIds)
        .is("deleted_at", null);

      for (const e of (entryRows ?? []) as Array<Record<string, unknown>>) {
        const logId = e.log_id as string;
        logEntryCountMap[logId] = (logEntryCountMap[logId] ?? 0) + 1;
        const recAt = e.recorded_at as string;
        if (!logLastEntryMap[logId] || recAt > logLastEntryMap[logId]!) {
          logLastEntryMap[logId] = recAt;
        }
      }
    }

    const items: DailyCareLogListItem[] = (logs ?? []).map(
      (row: Record<string, unknown>) => {
        const { students, ...rest } = row as Record<string, unknown> & {
          students: Record<string, unknown>;
        };
        const logId = rest.id as string;
        return {
          ...rest,
          student: students,
          entry_count: logEntryCountMap[logId] ?? 0,
          last_entry_at: logLastEntryMap[logId] ?? null,
        } as unknown as DailyCareLogListItem;
      },
    );

    return paginated(items, count ?? 0, safePage, safePerPage);
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Failed to load child care history",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 16. GET CHILD CARE LOG FOR DATE (parent-facing, shared only)
// ============================================================

export async function getChildCareLogForDate(
  studentId: string,
  date: string,
): Promise<ActionResponse<DailyCareLogWithEntries | null>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Look up the log - only return if shared
    const { data: log, error: findError } = await supabase
      .from("daily_care_logs")
      .select(LOG_COLUMNS)
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("log_date", date)
      .eq("status", "shared")
      .is("deleted_at", null)
      .maybeSingle();

    if (findError) {
      return failure(findError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!log) {
      return success(null);
    }

    // Reuse getDailyCareLog for the full hydrated response
    const logId = (log as Record<string, unknown>).id as string;
    return getDailyCareLog(logId);
  } catch (err) {
    return failure(
      err instanceof Error
        ? err.message
        : "Failed to load child care log for date",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// 17. DAILY CARE EXPORT (CSV data)
// ============================================================

export async function getDailyCareExport(
  date: string,
): Promise<ActionResponse<{ headers: string[]; rows: string[][] }>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Fetch all logs for the date
    const { data: logs, error: logError } = await supabase
      .from("daily_care_logs")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("log_date", date)
      .is("deleted_at", null);

    if (logError) {
      return failure(logError.message, ErrorCodes.DATABASE_ERROR);
    }

    const logIds = (logs ?? []).map(
      (l: Record<string, unknown>) => l.id as string,
    );

    if (logIds.length === 0) {
      return success({
        headers: [
          "Student Name",
          "Time",
          "Entry Type",
          "Details",
          "Notes",
          "Recorded By",
        ],
        rows: [],
      });
    }

    // Fetch all entries for these logs
    const { data: entries, error: entryError } = await supabase
      .from("daily_care_entries")
      .select(ENTRY_COLUMNS)
      .in("log_id", logIds)
      .is("deleted_at", null)
      .order("recorded_at", { ascending: true });

    if (entryError) {
      return failure(entryError.message, ErrorCodes.DATABASE_ERROR);
    }

    const rawEntries = (entries ?? []) as Array<Record<string, unknown>>;

    if (rawEntries.length === 0) {
      return success({
        headers: [
          "Student Name",
          "Time",
          "Entry Type",
          "Details",
          "Notes",
          "Recorded By",
        ],
        rows: [],
      });
    }

    // Fetch student names
    const studentIds = [
      ...new Set(rawEntries.map((e) => e.student_id as string)),
    ];
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .in("id", studentIds);

    const studentNameMap: Record<string, string> = {};
    for (const s of (students ?? []) as Array<Record<string, unknown>>) {
      const preferred = s.preferred_name as string | null;
      const firstName = preferred ?? (s.first_name as string);
      studentNameMap[s.id as string] = `${firstName} ${s.last_name as string}`;
    }

    // Fetch recorder names
    const recorderIds = [
      ...new Set(rawEntries.map((e) => e.recorded_by as string)),
    ];
    const { data: recorders } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", recorderIds);

    const recorderNameMap: Record<string, string> = {};
    for (const r of (recorders ?? []) as Array<Record<string, unknown>>) {
      recorderNameMap[r.id as string] =
        `${(r.first_name as string | null) ?? ""} ${(r.last_name as string | null) ?? ""}`.trim();
    }

    // Build CSV rows
    const headers = [
      "Student Name",
      "Time",
      "Entry Type",
      "Details",
      "Notes",
      "Recorded By",
    ];

    const rows: string[][] = rawEntries.map((e) => {
      const studentName = studentNameMap[e.student_id as string] ?? "Unknown";
      const time = new Date(e.recorded_at as string).toLocaleTimeString(
        "en-AU",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        },
      );
      const entryType = formatEntryType(e.entry_type as CareEntryType);
      const details = buildEntryDetails(e);
      const notes = (e.notes as string | null) ?? "";
      const recorderName =
        recorderNameMap[e.recorded_by as string] ?? "Unknown";

      return [studentName, time, entryType, details, notes, recorderName];
    });

    return success({ headers, rows });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export daily care data",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

/** Format entry type for human-readable display */
function formatEntryType(type: CareEntryType): string {
  const labels: Record<CareEntryType, string> = {
    nappy_change: "Nappy Change",
    meal: "Meal",
    bottle: "Bottle",
    sleep_start: "Sleep Start",
    sleep_end: "Sleep End",
    sunscreen: "Sunscreen",
    wellbeing_note: "Wellbeing Note",
  };
  return labels[type] ?? type;
}

/** Build a detail string from type-specific fields */
function buildEntryDetails(entry: Record<string, unknown>): string {
  const type = entry.entry_type as CareEntryType;
  const parts: string[] = [];

  switch (type) {
    case "nappy_change": {
      if (entry.nappy_type) parts.push(`Type: ${entry.nappy_type}`);
      if (entry.nappy_cream_applied === true) parts.push("Cream applied");
      if (entry.nappy_cream_applied === false) parts.push("No cream");
      break;
    }
    case "meal": {
      if (entry.meal_type) parts.push(`${entry.meal_type}`);
      if (entry.food_offered) parts.push(`Offered: ${entry.food_offered}`);
      if (entry.food_consumed) parts.push(`Consumed: ${entry.food_consumed}`);
      break;
    }
    case "bottle": {
      if (entry.bottle_type) parts.push(`${entry.bottle_type}`);
      if (
        entry.bottle_amount_ml !== null &&
        entry.bottle_amount_ml !== undefined
      )
        parts.push(`${entry.bottle_amount_ml}ml`);
      break;
    }
    case "sleep_start": {
      if (entry.sleep_position) parts.push(`Position: ${entry.sleep_position}`);
      if (entry.sleep_manner) parts.push(`Settled: ${entry.sleep_manner}`);
      break;
    }
    case "sleep_end": {
      // Sleep end has no specific detail fields
      parts.push("Woke up");
      break;
    }
    case "sunscreen": {
      if (entry.sunscreen_spf) parts.push(`SPF ${entry.sunscreen_spf}`);
      break;
    }
    case "wellbeing_note": {
      if (entry.wellbeing_mood) parts.push(`Mood: ${entry.wellbeing_mood}`);
      if (
        entry.wellbeing_temperature !== null &&
        entry.wellbeing_temperature !== undefined
      )
        parts.push(`Temp: ${entry.wellbeing_temperature}\u00B0C`);
      break;
    }
  }

  return parts.join("; ");
}

// ============================================================
// 18. LIST ELIGIBLE CHILDREN
// ============================================================

export async function listEligibleChildren(): Promise<
  ActionResponse<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      dob: string | null;
      photo_url: string | null;
    }>
  >
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DAILY_CARE_LOGS);
    const supabase = await createSupabaseServerClient();

    // Return all active enrolled students. The UI can then use the DOB
    // to highlight which ones are under PRESCHOOL_AGE_CUTOFF_YEARS.
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name, dob, photo_url")
      .eq("tenant_id", context.tenant.id)
      .eq("enrollment_status", "active")
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(
      (data ?? []) as Array<{
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
        dob: string | null;
        photo_url: string | null;
      }>,
    );
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to list eligible children",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
