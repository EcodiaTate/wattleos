"use server";

// src/lib/actions/chronic-absence.ts
//
// ============================================================
// Chronic Absence Monitoring - Server Actions
// ============================================================
// All queries and mutations for the chronic absence monitoring
// module. Attendance rates are calculated live from
// `attendance_records` using a configurable rolling window —
// no denormalisation so there's one source of truth.
//
// Rate calculation:
//   rate = ((total_days - absent_days) / total_days) * 100
//
// A "day" is any attendance record in the window.
// Which statuses count as "absent" depends on tenant config
// (by default: absent=yes, late=optional, half_day=0.5).
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import type { ActionResponse } from "@/types/api";
import type {
  AbsenceFollowUpLog,
  AbsenceMonitoringConfig,
  AbsenceMonitoringFlag,
  AbsenceWeeklyTrend,
  ChronicAbsenceDashboardData,
  StudentAbsenceDetail,
  StudentAbsenceSummary,
  ChronicAbsenceStatus,
} from "@/types/domain";
import {
  CreateAbsenceFlagSchema,
  DismissAbsenceFlagSchema,
  ListAbsenceStudentsSchema,
  LogFollowUpSchema,
  ResolveAbsenceFlagSchema,
  UpdateAbsenceConfigSchema,
  UpdateAbsenceFlagSchema,
} from "@/lib/validations/chronic-absence";
import type {
  CreateAbsenceFlagInput,
  DismissAbsenceFlagInput,
  ListAbsenceStudentsInput,
  LogFollowUpInput,
  ResolveAbsenceFlagInput,
  UpdateAbsenceConfigInput,
  UpdateAbsenceFlagInput,
} from "@/lib/validations/chronic-absence";

// ============================================================
// Internal helpers
// ============================================================

function classifyRate(
  rate: number,
  config: AbsenceMonitoringConfig,
): ChronicAbsenceStatus {
  if (rate < config.severe_threshold) return "severe";
  if (rate < config.chronic_threshold) return "chronic";
  if (rate < config.at_risk_threshold) return "at_risk";
  return "good";
}

function calcAbsentDays(
  records: Array<{ status: string }>,
  config: AbsenceMonitoringConfig,
): { total: number; absent: number } {
  let absent = 0;
  for (const r of records) {
    if (r.status === "absent") {
      absent += 1;
    } else if (r.status === "late" && config.count_late_as_absent) {
      absent += 1;
    } else if (r.status === "half_day" && config.count_half_day_as_absent) {
      absent += 0.5;
    }
  }
  return { total: records.length, absent };
}

function windowStart(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

// ============================================================
// Config
// ============================================================

export async function getAbsenceMonitoringConfig(): Promise<
  ActionResponse<AbsenceMonitoringConfig>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("absence_monitoring_config")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (error) return failure(error.message, "DB_ERROR");

    if (!data) {
      const { data: created, error: createErr } = await db
        .from("absence_monitoring_config")
        .insert({
          tenant_id: ctx.tenant.id,
          at_risk_threshold: 90,
          chronic_threshold: 80,
          severe_threshold: 70,
          rolling_window_days: 90,
          count_late_as_absent: false,
          count_half_day_as_absent: false,
          auto_flag_enabled: true,
        })
        .select("*")
        .single();

      if (createErr) return failure(createErr.message, "DB_ERROR");
      return success(created as AbsenceMonitoringConfig);
    }

    return success(data as AbsenceMonitoringConfig);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

export async function updateAbsenceMonitoringConfig(
  input: UpdateAbsenceConfigInput,
): Promise<ActionResponse<AbsenceMonitoringConfig>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = UpdateAbsenceConfigSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("absence_monitoring_config")
      .update(parsed.data)
      .eq("tenant_id", ctx.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_CONFIG_UPDATED,
      entityType: "absence_monitoring_config",
      entityId: (data as { id: string }).id,
      metadata: { thresholds: parsed.data },
    });

    return success(data as AbsenceMonitoringConfig);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Dashboard
// ============================================================

export async function getChronicAbsenceDashboard(): Promise<
  ActionResponse<ChronicAbsenceDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const configResult = await getAbsenceMonitoringConfig();
    if (!configResult.data)
      return failure("Could not load monitoring config", "CONFIG_ERROR");
    const config = configResult.data;

    const { data: students, error: studentsErr } = await db
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .eq("tenant_id", ctx.tenant.id)
      .eq("enrollment_status", "active")
      .is("deleted_at", null);

    if (studentsErr) return failure(studentsErr.message, "DB_ERROR");
    if (!students?.length) {
      return success({
        config,
        summary: {
          total_students: 0,
          good: 0,
          at_risk: 0,
          chronic: 0,
          severe: 0,
          active_flags: 0,
        },
        at_risk_students: [],
      });
    }

    const { data: flags } = await db
      .from("absence_monitoring_flags")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "active");

    const flagByStudent = new Map<string, AbsenceMonitoringFlag>();
    for (const f of flags ?? []) {
      flagByStudent.set(f.student_id as string, f as AbsenceMonitoringFlag);
    }

    const { data: followUps } = await db
      .from("absence_follow_up_log")
      .select("student_id, contact_date")
      .eq("tenant_id", ctx.tenant.id)
      .order("contact_date", { ascending: false });

    const lastFollowUp = new Map<string, string>();
    const followUpCount = new Map<string, number>();
    for (const fu of followUps ?? []) {
      const sid = fu.student_id as string;
      if (!lastFollowUp.has(sid))
        lastFollowUp.set(sid, fu.contact_date as string);
      followUpCount.set(sid, (followUpCount.get(sid) ?? 0) + 1);
    }

    const winStart = windowStart(config.rolling_window_days);
    const { data: allRecords } = await db
      .from("attendance_records")
      .select("student_id, status")
      .eq("tenant_id", ctx.tenant.id)
      .gte("date", winStart)
      .is("deleted_at", null);

    const recordsByStudent = new Map<string, Array<{ status: string }>>();
    for (const r of allRecords ?? []) {
      const sid = r.student_id as string;
      if (!recordsByStudent.has(sid)) recordsByStudent.set(sid, []);
      recordsByStudent.get(sid)!.push({ status: r.status as string });
    }

    const summaries: StudentAbsenceSummary[] = [];
    let goodCount = 0,
      atRiskCount = 0,
      chronicCount = 0,
      severeCount = 0;

    for (const student of students) {
      const records = recordsByStudent.get(student.id) ?? [];
      const { total, absent } = calcAbsentDays(records, config);
      const rate =
        total === 0 ? 100 : Math.round(((total - absent) / total) * 1000) / 10;
      const status = classifyRate(rate, config);

      if (status === "good") goodCount++;
      else if (status === "at_risk") atRiskCount++;
      else if (status === "chronic") chronicCount++;
      else severeCount++;

      if (status !== "good") {
        summaries.push({
          student: {
            id: student.id as string,
            first_name: student.first_name as string,
            last_name: student.last_name as string,
            preferred_name: (student.preferred_name as string | null) ?? null,
            photo_url: (student.photo_url as string | null) ?? null,
          },
          total_days: total,
          absent_days: absent,
          attendance_rate: rate,
          absence_status: status,
          active_flag: flagByStudent.get(student.id as string) ?? null,
          last_follow_up_date: lastFollowUp.get(student.id as string) ?? null,
          follow_up_count: followUpCount.get(student.id as string) ?? 0,
        });
      }
    }

    const order: Record<ChronicAbsenceStatus, number> = {
      severe: 0,
      chronic: 1,
      at_risk: 2,
      good: 3,
    };
    summaries.sort((a, b) => {
      const diff = order[a.absence_status] - order[b.absence_status];
      return diff !== 0 ? diff : a.attendance_rate - b.attendance_rate;
    });

    return success({
      config,
      summary: {
        total_students: students.length,
        good: goodCount,
        at_risk: atRiskCount,
        chronic: chronicCount,
        severe: severeCount,
        active_flags: flagByStudent.size,
      },
      at_risk_students: summaries,
    });
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Student List
// ============================================================

export async function listStudentsWithAbsenceRates(
  input: ListAbsenceStudentsInput,
): Promise<ActionResponse<StudentAbsenceSummary[]>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = ListAbsenceStudentsSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    const params = parsed.data;

    const configResult = await getAbsenceMonitoringConfig();
    if (!configResult.data)
      return failure("Could not load monitoring config", "CONFIG_ERROR");
    const config = configResult.data;

    let studentIds: string[] | null = null;
    if (params.class_id) {
      const { data: classStudents } = await db
        .from("enrollments")
        .select("student_id")
        .eq("class_id", params.class_id)
        .eq("status", "active");
      studentIds = (classStudents ?? []).map((r) => r.student_id as string);
      if (studentIds.length === 0) return success([]);
    }

    let query = db
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .eq("tenant_id", ctx.tenant.id)
      .eq("enrollment_status", "active")
      .is("deleted_at", null);

    if (studentIds) query = query.in("id", studentIds);

    const { data: students, error: studentsErr } = await query;
    if (studentsErr) return failure(studentsErr.message, "DB_ERROR");
    if (!students?.length) return success([]);

    const winStart = windowStart(config.rolling_window_days);
    const ids = (students as Array<{ id: string }>).map((s) => s.id);

    const { data: allRecords } = await db
      .from("attendance_records")
      .select("student_id, status")
      .eq("tenant_id", ctx.tenant.id)
      .in("student_id", ids)
      .gte("date", winStart)
      .is("deleted_at", null);

    const recordsByStudent = new Map<string, Array<{ status: string }>>();
    for (const r of allRecords ?? []) {
      const sid = r.student_id as string;
      if (!recordsByStudent.has(sid)) recordsByStudent.set(sid, []);
      recordsByStudent.get(sid)!.push({ status: r.status as string });
    }

    const { data: flags } = await db
      .from("absence_monitoring_flags")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "active")
      .in("student_id", ids);

    const flagByStudent = new Map<string, AbsenceMonitoringFlag>();
    for (const f of flags ?? []) {
      flagByStudent.set(f.student_id as string, f as AbsenceMonitoringFlag);
    }

    const { data: followUps } = await db
      .from("absence_follow_up_log")
      .select("student_id, contact_date")
      .eq("tenant_id", ctx.tenant.id)
      .in("student_id", ids)
      .order("contact_date", { ascending: false });

    const lastFollowUp = new Map<string, string>();
    const followUpCount = new Map<string, number>();
    for (const fu of followUps ?? []) {
      const sid = fu.student_id as string;
      if (!lastFollowUp.has(sid))
        lastFollowUp.set(sid, fu.contact_date as string);
      followUpCount.set(sid, (followUpCount.get(sid) ?? 0) + 1);
    }

    let summaries: StudentAbsenceSummary[] = [];

    for (const student of students as Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
    }>) {
      const records = recordsByStudent.get(student.id) ?? [];
      const { total, absent } = calcAbsentDays(records, config);
      const rate =
        total === 0 ? 100 : Math.round(((total - absent) / total) * 1000) / 10;
      const status = classifyRate(rate, config);
      const activeFlag = flagByStudent.get(student.id) ?? null;

      if (params.flagged_only && !activeFlag) continue;
      if (params.status_filter !== "all" && status !== params.status_filter)
        continue;

      summaries.push({
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          preferred_name: student.preferred_name,
          photo_url: student.photo_url,
        },
        total_days: total,
        absent_days: absent,
        attendance_rate: rate,
        absence_status: status,
        active_flag: activeFlag,
        last_follow_up_date: lastFollowUp.get(student.id) ?? null,
        follow_up_count: followUpCount.get(student.id) ?? 0,
      });
    }

    const order: Record<ChronicAbsenceStatus, number> = {
      severe: 0,
      chronic: 1,
      at_risk: 2,
      good: 3,
    };
    summaries.sort((a, b) => {
      const diff = order[a.absence_status] - order[b.absence_status];
      return diff !== 0 ? diff : a.attendance_rate - b.attendance_rate;
    });

    const start = (params.page - 1) * params.per_page;
    summaries = summaries.slice(start, start + params.per_page);

    return success(summaries);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Per-Student Detail
// ============================================================

export async function getStudentAbsenceDetail(
  studentId: string,
): Promise<ActionResponse<StudentAbsenceDetail>> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const configResult = await getAbsenceMonitoringConfig();
    if (!configResult.data)
      return failure("Could not load monitoring config", "CONFIG_ERROR");
    const config = configResult.data;

    const { data: student, error: studentErr } = await db
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url")
      .eq("tenant_id", ctx.tenant.id)
      .eq("id", studentId)
      .single();

    if (studentErr) return failure(studentErr.message, "DB_ERROR");

    const winStart = windowStart(config.rolling_window_days);

    const { data: records } = await db
      .from("attendance_records")
      .select("date, status")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", studentId)
      .gte("date", winStart)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    const typedRecords = (records ?? []) as Array<{
      date: string;
      status: string;
    }>;
    const { total, absent } = calcAbsentDays(typedRecords, config);
    const rate =
      total === 0 ? 100 : Math.round(((total - absent) / total) * 1000) / 10;
    const status = classifyRate(rate, config);

    const { data: flagsRaw } = await db
      .from("absence_monitoring_flags")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    const allFlags = (flagsRaw ?? []) as AbsenceMonitoringFlag[];
    const activeFlag = allFlags.find((f) => f.status === "active") ?? null;
    const flagHistory = allFlags.filter((f) => f.status !== "active");

    const { data: followUpRaw } = await db
      .from("absence_follow_up_log")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", studentId)
      .order("contact_date", { ascending: false });

    const followUpLog = (followUpRaw ?? []) as AbsenceFollowUpLog[];
    const lastFollowUpDate = followUpLog[0]?.contact_date ?? null;

    const weeklyTrend = buildWeeklyTrend(typedRecords, config, 12);

    const typedStudent = student as {
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
      photo_url: string | null;
    };

    const summary: StudentAbsenceSummary = {
      student: {
        id: typedStudent.id,
        first_name: typedStudent.first_name,
        last_name: typedStudent.last_name,
        preferred_name: typedStudent.preferred_name,
        photo_url: typedStudent.photo_url,
      },
      total_days: total,
      absent_days: absent,
      attendance_rate: rate,
      absence_status: status,
      active_flag: activeFlag,
      last_follow_up_date: lastFollowUpDate,
      follow_up_count: followUpLog.length,
    };

    return success({
      summary,
      weekly_trend: weeklyTrend,
      active_flag: activeFlag,
      flag_history: flagHistory,
      follow_up_log: followUpLog,
    });
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

function buildWeeklyTrend(
  records: Array<{ date: string; status: string }>,
  config: AbsenceMonitoringConfig,
  weeksBack: number,
): AbsenceWeeklyTrend[] {
  const buckets = new Map<string, Array<{ status: string }>>();

  for (let i = 0; i < weeksBack; i++) {
    const d = new Date();
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - i * 7);
    const key = monday.toISOString().split("T")[0];
    if (!buckets.has(key)) buckets.set(key, []);
  }

  for (const r of records) {
    const d = new Date(r.date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toISOString().split("T")[0];
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ status: r.status });
  }

  const trend: AbsenceWeeklyTrend[] = [];
  for (const [week_start, recs] of buckets) {
    const { total, absent } = calcAbsentDays(recs, config);
    const rate =
      total === 0 ? 100 : Math.round(((total - absent) / total) * 1000) / 10;
    trend.push({ week_start, total_days: total, absent_days: absent, rate });
  }

  trend.sort((a, b) => a.week_start.localeCompare(b.week_start));
  return trend;
}

// ============================================================
// Flags
// ============================================================

export async function createAbsenceFlag(
  input: CreateAbsenceFlagInput,
): Promise<ActionResponse<AbsenceMonitoringFlag>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = CreateAbsenceFlagSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data: existing } = await db
      .from("absence_monitoring_flags")
      .select("id")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", parsed.data.student_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing)
      return failure(
        "This student already has an active monitoring flag",
        "CONFLICT",
      );

    const configResult = await getAbsenceMonitoringConfig();
    let rateAtFlag: number | null = null;

    if (configResult.data) {
      const config = configResult.data;
      const winStart = windowStart(config.rolling_window_days);
      const { data: attRecs } = await db
        .from("attendance_records")
        .select("status")
        .eq("tenant_id", ctx.tenant.id)
        .eq("student_id", parsed.data.student_id)
        .gte("date", winStart)
        .is("deleted_at", null);

      if (attRecs?.length) {
        const { total, absent } = calcAbsentDays(
          attRecs as Array<{ status: string }>,
          config,
        );
        rateAtFlag =
          total === 0
            ? 100
            : Math.round(((total - absent) / total) * 1000) / 10;
      }
    }

    const { data, error } = await db
      .from("absence_monitoring_flags")
      .insert({
        tenant_id: ctx.tenant.id,
        student_id: parsed.data.student_id,
        status: "active",
        source: "manual",
        rate_at_flag: rateAtFlag,
        notes: parsed.data.notes || null,
        created_by: ctx.user.id,
        updated_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_FLAG_CREATED,
      entityType: "absence_monitoring_flag",
      entityId: (data as { id: string }).id,
      metadata: {
        student_id: parsed.data.student_id,
        rate_at_flag: rateAtFlag,
        source: "manual",
      },
    });

    return success(data as AbsenceMonitoringFlag);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

export async function updateAbsenceFlag(
  input: UpdateAbsenceFlagInput,
): Promise<ActionResponse<AbsenceMonitoringFlag>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = UpdateAbsenceFlagSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("absence_monitoring_flags")
      .update({ notes: parsed.data.notes || null, updated_by: ctx.user.id })
      .eq("id", parsed.data.flag_id)
      .eq("tenant_id", ctx.tenant.id)
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_FLAG_UPDATED,
      entityType: "absence_monitoring_flag",
      entityId: (data as { id: string }).id,
    });

    return success(data as AbsenceMonitoringFlag);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

export async function resolveAbsenceFlag(
  input: ResolveAbsenceFlagInput,
): Promise<ActionResponse<AbsenceMonitoringFlag>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = ResolveAbsenceFlagSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("absence_monitoring_flags")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: ctx.user.id,
        resolution_note: parsed.data.resolution_note || null,
        updated_by: ctx.user.id,
      })
      .eq("id", parsed.data.flag_id)
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "active")
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_FLAG_RESOLVED,
      entityType: "absence_monitoring_flag",
      entityId: (data as { id: string }).id,
      metadata: { resolution_note: parsed.data.resolution_note },
    });

    return success(data as AbsenceMonitoringFlag);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

export async function dismissAbsenceFlag(
  input: DismissAbsenceFlagInput,
): Promise<ActionResponse<AbsenceMonitoringFlag>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = DismissAbsenceFlagSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("absence_monitoring_flags")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
        resolved_by: ctx.user.id,
        resolution_note: parsed.data.resolution_note || null,
        updated_by: ctx.user.id,
      })
      .eq("id", parsed.data.flag_id)
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "active")
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_FLAG_DISMISSED,
      entityType: "absence_monitoring_flag",
      entityId: (data as { id: string }).id,
    });

    return success(data as AbsenceMonitoringFlag);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Follow-Up Log
// ============================================================

export async function logFollowUp(
  input: LogFollowUpInput,
): Promise<ActionResponse<AbsenceFollowUpLog>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_CHRONIC_ABSENCE);
    const db = await createSupabaseServerClient();

    const parsed = LogFollowUpSchema.safeParse(input);
    if (!parsed.success)
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");

    const { data, error } = await db
      .from("absence_follow_up_log")
      .insert({
        tenant_id: ctx.tenant.id,
        flag_id: parsed.data.flag_id,
        student_id: parsed.data.student_id,
        contact_date: parsed.data.contact_date,
        method: parsed.data.method,
        outcome: parsed.data.outcome,
        contact_name: parsed.data.contact_name || null,
        notes: parsed.data.notes || null,
        next_follow_up: parsed.data.next_follow_up || null,
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error) return failure(error.message, "DB_ERROR");

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_FOLLOW_UP_LOGGED,
      entityType: "absence_follow_up_log",
      entityId: (data as { id: string }).id,
      metadata: {
        student_id: parsed.data.student_id,
        method: parsed.data.method,
        outcome: parsed.data.outcome,
      },
    });

    return success(data as AbsenceFollowUpLog);
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}

// ============================================================
// Export
// ============================================================

export async function exportChronicAbsenceReport(): Promise<
  ActionResponse<{
    rows: Array<{
      student_name: string;
      status: string;
      attendance_rate: number;
      total_days: number;
      absent_days: number;
      flag_active: boolean;
      follow_up_count: number;
      last_follow_up: string;
    }>;
    generated_at: string;
  }>
> {
  try {
    const ctx = await requirePermission(Permissions.VIEW_CHRONIC_ABSENCE);

    const allStudentsResult = await listStudentsWithAbsenceRates({
      status_filter: "all",
      flagged_only: false,
      class_id: null,
      page: 1,
      per_page: 1000,
    });

    const rows = (allStudentsResult.data ?? []).map((s) => ({
      student_name: `${s.student.first_name} ${s.student.last_name}`,
      status: s.absence_status,
      attendance_rate: s.attendance_rate,
      total_days: s.total_days,
      absent_days: s.absent_days,
      flag_active: !!s.active_flag,
      follow_up_count: s.follow_up_count,
      last_follow_up: s.last_follow_up_date ?? "",
    }));

    await logAudit({
      context: ctx,
      action: AuditActions.CHRONIC_ABSENCE_EXPORTED,
      entityType: "chronic_absence_report",
      entityId: null,
      metadata: { row_count: rows.length },
    });

    return success({ rows, generated_at: new Date().toISOString() });
  } catch (e) {
    return failure(
      e instanceof Error ? e.message : "Unknown error",
      "UNEXPECTED_ERROR",
    );
  }
}
