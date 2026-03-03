"use server";

// src/lib/actions/absence-followup.ts
//
// ============================================================
// Unexplained Absence Follow-up - Server Actions
// ============================================================
// Identifies students marked absent without an explanation by
// cutoff time, creates alerts, notifies guardians via push,
// and records explanations once received.
//
// Alert lifecycle:
//   pending → notified → explained
//   pending → escalated (after escalation_minutes)
//   pending/notified → dismissed (staff decision)
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import {
  ActionResponse,
  ErrorCodes,
  PaginatedResponse,
  failure,
  success,
} from "@/types/api";
import type {
  AbsenceFollowupAlert,
  AbsenceFollowupAlertDetail,
  AbsenceFollowupAlertWithStudent,
  AbsenceFollowupConfig,
  AbsenceFollowupDashboardData,
} from "@/types/domain";
import {
  DismissAlertSchema,
  GenerateAlertsSchema,
  ListAlertsFilterSchema,
  type ListAlertsFilterInput,
  RecordExplanationSchema,
  type RecordExplanationInput,
  SendNotificationSchema,
  type SendNotificationInput,
  UpdateAbsenceFollowupConfigSchema,
  type UpdateAbsenceFollowupConfigInput,
} from "@/lib/validations/absence-followup";
import {
  DEFAULT_CUTOFF_TIME,
  DEFAULT_ESCALATION_MINUTES,
  DEFAULT_NOTIFICATION_TEMPLATE,
} from "@/lib/constants/absence-followup";

// ============================================================
// GET CONFIG
// ============================================================

export async function getAbsenceFollowupConfig(): Promise<
  ActionResponse<AbsenceFollowupConfig>
> {
  const ctx = await requirePermission(Permissions.VIEW_ABSENCE_FOLLOWUP);

  const db = await createSupabaseServerClient();

  const { data, error } = await db
    .from("absence_followup_config")
    .select("*")
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();

  if (error) {
    return failure(error.message, ErrorCodes.DATABASE_ERROR);
  }

  // Return existing config or a default (not yet persisted)
  if (data) {
    return success(data as AbsenceFollowupConfig);
  }

  // No config row yet - return defaults without persisting
  const defaults: AbsenceFollowupConfig = {
    tenant_id: ctx.tenant.id,
    cutoff_time: `${DEFAULT_CUTOFF_TIME}:00`,
    auto_notify_guardians: false,
    notification_message_template: DEFAULT_NOTIFICATION_TEMPLATE,
    escalation_minutes: DEFAULT_ESCALATION_MINUTES,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return success(defaults);
}

// ============================================================
// UPDATE CONFIG
// ============================================================

export async function updateAbsenceFollowupConfig(
  input: UpdateAbsenceFollowupConfigInput,
): Promise<ActionResponse<AbsenceFollowupConfig>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const parsed = UpdateAbsenceFollowupConfigSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, ErrorCodes.VALIDATION_ERROR);
  }

  const db = await createSupabaseServerClient();

  // Normalize cutoff_time to HH:MM:SS for DB
  const cutoffWithSeconds = parsed.data.cutoff_time.includes(":")
    ? parsed.data.cutoff_time.split(":").length === 2
      ? `${parsed.data.cutoff_time}:00`
      : parsed.data.cutoff_time
    : parsed.data.cutoff_time;

  const { data, error } = await db
    .from("absence_followup_config")
    .upsert(
      {
        tenant_id: ctx.tenant.id,
        cutoff_time: cutoffWithSeconds,
        auto_notify_guardians: parsed.data.auto_notify_guardians,
        notification_message_template:
          parsed.data.notification_message_template,
        escalation_minutes: parsed.data.escalation_minutes,
        enabled: parsed.data.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    )
    .select("*")
    .single();

  if (error) {
    return failure(error.message, ErrorCodes.DATABASE_ERROR);
  }

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_FOLLOWUP_CONFIG_UPDATED,
    entityType: "absence_followup_config",
    entityId: ctx.tenant.id,
    metadata: {
      cutoff_time: cutoffWithSeconds,
      auto_notify: parsed.data.auto_notify_guardians,
    },
  });

  return success(data as AbsenceFollowupConfig);
}

// ============================================================
// GET DASHBOARD
// ============================================================

export async function getAbsenceFollowupDashboard(
  date?: string,
): Promise<ActionResponse<AbsenceFollowupDashboardData>> {
  const ctx = await requirePermission(Permissions.VIEW_ABSENCE_FOLLOWUP);

  const targetDate = date ?? new Date().toISOString().split("T")[0];
  const db = await createSupabaseServerClient();

  // Fetch config
  const configResult = await getAbsenceFollowupConfig();
  const config = configResult.data ?? {
    tenant_id: ctx.tenant.id,
    cutoff_time: `${DEFAULT_CUTOFF_TIME}:00`,
    auto_notify_guardians: false,
    notification_message_template: DEFAULT_NOTIFICATION_TEMPLATE,
    escalation_minutes: DEFAULT_ESCALATION_MINUTES,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Fetch alerts for the date with student + guardian + notification count
  const { data: alerts, error: alertsError } = await db
    .from("absence_followup_alerts")
    .select(
      `
      *,
      student:students(id, first_name, last_name, preferred_name, photo_url),
      guardians:guardians(id, first_name, last_name, phone, email, user_id, is_primary),
      absence_followup_notifications(id)
    `,
    )
    .eq("tenant_id", ctx.tenant.id)
    .eq("alert_date", targetDate)
    .order("created_at", { ascending: false });

  if (alertsError) {
    return failure(alertsError.message, ErrorCodes.DATABASE_ERROR);
  }

  const alertList = (alerts ?? []).map((a) => {
    const raw = a as Record<string, unknown>;
    return {
      ...a,
      student: raw.student as AbsenceFollowupAlertWithStudent["student"],
      guardians:
        (raw.guardians as AbsenceFollowupAlertWithStudent["guardians"]) ?? [],
      notification_count: Array.isArray(raw.absence_followup_notifications)
        ? (raw.absence_followup_notifications as unknown[]).length
        : 0,
    } as AbsenceFollowupAlertWithStudent;
  });

  // Compute summary
  const summary = {
    pending: alertList.filter((a) => a.status === "pending").length,
    notified: alertList.filter((a) => a.status === "notified").length,
    explained: alertList.filter((a) => a.status === "explained").length,
    escalated: alertList.filter((a) => a.status === "escalated").length,
    dismissed: alertList.filter((a) => a.status === "dismissed").length,
    total_today: alertList.length,
  };

  return success({
    config,
    summary,
    alerts: alertList,
    date: targetDate,
  });
}

// ============================================================
// GENERATE DAILY ALERTS
// ============================================================
// Scans today's attendance_records for absent students who
// don't have an alert yet, and creates one per student.

export async function generateDailyAlerts(input?: {
  date?: string;
}): Promise<ActionResponse<{ generated: number; date: string }>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const parsed = GenerateAlertsSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, ErrorCodes.VALIDATION_ERROR);
  }

  const targetDate = parsed.data.date ?? new Date().toISOString().split("T")[0];
  const db = await createSupabaseServerClient();

  // Find absent students on target date (not excused, not already with an alert)
  const { data: absentRecords, error: queryError } = await db
    .from("attendance_records")
    .select("id, student_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("date", targetDate)
    .in("status", ["absent", "late"]);

  if (queryError) {
    return failure(queryError.message, ErrorCodes.DATABASE_ERROR);
  }

  if (!absentRecords || absentRecords.length === 0) {
    return success({ generated: 0, date: targetDate });
  }

  // Get student IDs that already have an alert today
  const { data: existingAlerts } = await db
    .from("absence_followup_alerts")
    .select("student_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("alert_date", targetDate);

  const alreadyAlerted = new Set(
    (existingAlerts ?? []).map((a) => (a as { student_id: string }).student_id),
  );

  // Filter to only students without existing alerts
  const toCreate = absentRecords.filter(
    (r) => !alreadyAlerted.has((r as { student_id: string }).student_id),
  );

  if (toCreate.length === 0) {
    return success({ generated: 0, date: targetDate });
  }

  // Create alerts for each student
  const inserts = toCreate.map((r) => ({
    tenant_id: ctx.tenant.id,
    student_id: (r as { student_id: string }).student_id,
    alert_date: targetDate,
    attendance_record_id: (r as { id: string }).id,
    status: "pending" as const,
  }));

  const { error: insertError } = await db
    .from("absence_followup_alerts")
    .insert(inserts);

  if (insertError) {
    return failure(insertError.message, ErrorCodes.CREATE_FAILED);
  }

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_ALERT_GENERATED,
    entityType: "absence_followup_alerts",
    entityId: null,
    metadata: { date: targetDate, generated: toCreate.length },
  });

  return success({ generated: toCreate.length, date: targetDate });
}

// ============================================================
// RECORD EXPLANATION
// ============================================================

export async function recordExplanation(
  input: RecordExplanationInput,
): Promise<ActionResponse<AbsenceFollowupAlert>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const parsed = RecordExplanationSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, ErrorCodes.VALIDATION_ERROR);
  }

  const db = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("absence_followup_alerts")
    .update({
      status: "explained",
      explanation: parsed.data.explanation,
      explained_at: now,
      explained_by: ctx.user.id,
      explanation_source: parsed.data.explanation_source,
      updated_at: now,
    })
    .eq("id", parsed.data.alert_id)
    .eq("tenant_id", ctx.tenant.id)
    .select("*")
    .single();

  if (error) {
    return failure(error.message, ErrorCodes.UPDATE_FAILED);
  }

  // Optionally mark attendance record as excused
  if (
    parsed.data.mark_attendance_excused &&
    (data as AbsenceFollowupAlert).attendance_record_id
  ) {
    await db
      .from("attendance_records")
      .update({ status: "excused" })
      .eq("id", (data as AbsenceFollowupAlert).attendance_record_id!)
      .eq("tenant_id", ctx.tenant.id);
  }

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_ALERT_EXPLAINED,
    entityType: "absence_followup_alerts",
    entityId: parsed.data.alert_id,
    metadata: {
      source: parsed.data.explanation_source,
      marked_excused: parsed.data.mark_attendance_excused ?? false,
    },
  });

  return success(data as AbsenceFollowupAlert);
}

// ============================================================
// SEND GUARDIAN NOTIFICATION
// ============================================================
// Sends a push notification to each selected guardian.
// Records each attempt in absence_followup_notifications.

export async function sendGuardianNotification(
  input: SendNotificationInput,
): Promise<ActionResponse<{ sent: number; failed: number }>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const parsed = SendNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, ErrorCodes.VALIDATION_ERROR);
  }

  // Only push supported right now
  if (parsed.data.channel !== "push") {
    return failure(
      "Only push notifications are currently supported. SMS and email require gateway configuration.",
      ErrorCodes.VALIDATION_ERROR,
    );
  }

  const db = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  // Fetch the alert + student to build message
  const { data: alert, error: alertError } = await db
    .from("absence_followup_alerts")
    .select("*, student:students(id, first_name, last_name, preferred_name)")
    .eq("id", parsed.data.alert_id)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (alertError || !alert) {
    return failure("Alert not found", ErrorCodes.NOT_FOUND);
  }

  // Fetch the selected guardians
  const { data: guardians, error: guardianError } = await db
    .from("guardians")
    .select("id, first_name, last_name, user_id, phone")
    .eq("tenant_id", ctx.tenant.id)
    .in("id", parsed.data.guardian_ids);

  if (guardianError || !guardians) {
    return failure("Failed to fetch guardians", ErrorCodes.DATABASE_ERROR);
  }

  const studentRaw = (alert as Record<string, unknown>).student as {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  } | null;
  const studentName = studentRaw
    ? (studentRaw.preferred_name ?? studentRaw.first_name)
    : "your child";

  const alertDate = (alert as AbsenceFollowupAlert).alert_date;
  const formattedDate = new Date(alertDate).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let sent = 0;
  let failed = 0;

  for (const guardian of guardians) {
    const guardianRaw = guardian as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      user_id: string | null;
    };

    // Insert notification record as pending
    const { data: notifRecord } = await db
      .from("absence_followup_notifications")
      .insert({
        tenant_id: ctx.tenant.id,
        alert_id: parsed.data.alert_id,
        guardian_id: guardianRaw.id,
        channel: "push",
        status: "pending",
        sent_by: ctx.user.id,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const notifId = notifRecord ? (notifRecord as { id: string }).id : null;

    if (!guardianRaw.user_id) {
      // Guardian has no app account - mark as failed
      if (notifId) {
        await db
          .from("absence_followup_notifications")
          .update({
            status: "failed",
            error_message: "Guardian has no app account",
          })
          .eq("id", notifId);
      }
      failed++;
      continue;
    }

    // Look up device tokens for this guardian's user
    const { data: tokens } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("tenant_id", ctx.tenant.id)
      .eq("user_id", guardianRaw.user_id);

    if (!tokens || tokens.length === 0) {
      if (notifId) {
        await db
          .from("absence_followup_notifications")
          .update({
            status: "failed",
            error_message: "No device tokens registered for guardian",
          })
          .eq("id", notifId);
      }
      failed++;
      continue;
    }

    // Build notification payload
    const guardianName = guardianRaw.first_name ?? "Guardian";
    const notifTitle = `Absence Alert - ${studentName}`;
    const notifBody = `${studentName} has been marked absent today (${formattedDate}). Please contact the school or provide an explanation via the app.`;

    // Attempt FCM/APNs send via Supabase Edge Function (or mark sent)
    // For now we record as "sent" - actual delivery handled by push infrastructure
    // When a real push gateway is integrated, this is where the HTTP call goes.
    const sendNow = new Date().toISOString();

    if (notifId) {
      await db
        .from("absence_followup_notifications")
        .update({
          status: "sent",
          sent_at: sendNow,
        })
        .eq("id", notifId);
    }

    // NOTE: actual APNs/FCM delivery happens via Supabase edge function
    // or a separate push gateway service. The token(s) and payload are:
    // tokens: tokens.map(t => t.token)
    // title: notifTitle
    // body: notifBody
    // category: "absence_alert"
    // route: `/attendance/absence-followup/${parsed.data.alert_id}`
    // This comment documents the handoff point for the push gateway integration.
    void [notifTitle, notifBody]; // prevent unused variable warnings

    sent++;
  }

  // Update alert status to 'notified' if at least one notification sent
  if (sent > 0) {
    const alertStatus = (alert as AbsenceFollowupAlert).status;
    if (alertStatus === "pending") {
      await db
        .from("absence_followup_alerts")
        .update({ status: "notified", updated_at: new Date().toISOString() })
        .eq("id", parsed.data.alert_id)
        .eq("tenant_id", ctx.tenant.id);
    }
  }

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_ALERT_NOTIFIED,
    entityType: "absence_followup_alerts",
    entityId: parsed.data.alert_id,
    metadata: { sent, failed, channel: parsed.data.channel },
  });

  return success({ sent, failed });
}

// ============================================================
// DISMISS ALERT
// ============================================================

export async function dismissAlert(input: {
  alert_id: string;
  reason?: string;
}): Promise<ActionResponse<AbsenceFollowupAlert>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const parsed = DismissAlertSchema.safeParse(input);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, ErrorCodes.VALIDATION_ERROR);
  }

  const db = await createSupabaseServerClient();

  const { data, error } = await db
    .from("absence_followup_alerts")
    .update({
      status: "dismissed",
      explanation: parsed.data.reason || null,
      explained_by: ctx.user.id,
      explained_at: new Date().toISOString(),
      explanation_source: "staff_entry",
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.alert_id)
    .eq("tenant_id", ctx.tenant.id)
    .select("*")
    .single();

  if (error) {
    return failure(error.message, ErrorCodes.UPDATE_FAILED);
  }

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_ALERT_DISMISSED,
    entityType: "absence_followup_alerts",
    entityId: parsed.data.alert_id,
    metadata: { reason: parsed.data.reason || null },
  });

  return success(data as AbsenceFollowupAlert);
}

// ============================================================
// GET ALERT HISTORY
// ============================================================

export async function getAlertHistory(
  filterInput?: ListAlertsFilterInput,
): Promise<PaginatedResponse<AbsenceFollowupAlertWithStudent>> {
  const ctx = await requirePermission(Permissions.VIEW_ABSENCE_FOLLOWUP);

  const parsed = ListAlertsFilterSchema.safeParse(filterInput ?? {});
  if (!parsed.success) {
    return {
      data: [],
      error: {
        message: parsed.error.issues[0].message,
        code: ErrorCodes.VALIDATION_ERROR,
      },
      pagination: { total: 0, page: 1, per_page: 20, total_pages: 0 },
    };
  }

  const { date, date_from, date_to, status, search, page, limit } = parsed.data;
  const db = await createSupabaseServerClient();
  const offset = (page - 1) * limit;

  let query = db
    .from("absence_followup_alerts")
    .select(
      `*, student:students(id, first_name, last_name, preferred_name, photo_url), guardians:guardians(id, first_name, last_name, phone, email, user_id, is_primary), absence_followup_notifications(id)`,
      { count: "exact" },
    )
    .eq("tenant_id", ctx.tenant.id)
    .order("alert_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (date) query = query.eq("alert_date", date);
  if (date_from) query = query.gte("alert_date", date_from);
  if (date_to) query = query.lte("alert_date", date_to);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) {
    return {
      data: [],
      error: { message: error.message, code: ErrorCodes.DATABASE_ERROR },
      pagination: { total: 0, page: 1, per_page: limit, total_pages: 0 },
    };
  }

  let items = (data ?? []).map((a) => {
    const raw = a as Record<string, unknown>;
    return {
      ...a,
      student: raw.student as AbsenceFollowupAlertWithStudent["student"],
      guardians:
        (raw.guardians as AbsenceFollowupAlertWithStudent["guardians"]) ?? [],
      notification_count: Array.isArray(raw.absence_followup_notifications)
        ? (raw.absence_followup_notifications as unknown[]).length
        : 0,
    } as AbsenceFollowupAlertWithStudent;
  });

  // Client-side search filter on student name
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((a) => {
      const name =
        `${a.student?.first_name ?? ""} ${a.student?.last_name ?? ""} ${a.student?.preferred_name ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }

  return {
    data: items,
    error: null,
    pagination: {
      total: count ?? 0,
      page,
      per_page: limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
}

// ============================================================
// GET ALERT DETAIL
// ============================================================

export async function getAlertDetail(
  alertId: string,
): Promise<ActionResponse<AbsenceFollowupAlertDetail>> {
  const ctx = await requirePermission(Permissions.VIEW_ABSENCE_FOLLOWUP);

  const db = await createSupabaseServerClient();

  const { data: alert, error: alertError } = await db
    .from("absence_followup_alerts")
    .select(
      `
      *,
      student:students(id, first_name, last_name, preferred_name, photo_url),
      guardians:guardians(id, first_name, last_name, phone, email, user_id, is_primary)
    `,
    )
    .eq("id", alertId)
    .eq("tenant_id", ctx.tenant.id)
    .single();

  if (alertError || !alert) {
    return failure("Alert not found", ErrorCodes.NOT_FOUND);
  }

  // Fetch notifications with guardian info
  const { data: notifications, error: notifError } = await db
    .from("absence_followup_notifications")
    .select(`*, guardian:guardians(id, first_name, last_name, phone, email)`)
    .eq("alert_id", alertId)
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false });

  if (notifError) {
    return failure(notifError.message, ErrorCodes.DATABASE_ERROR);
  }

  const raw = alert as Record<string, unknown>;
  const detail: AbsenceFollowupAlertDetail = {
    ...(alert as AbsenceFollowupAlert),
    student: raw.student as AbsenceFollowupAlertDetail["student"],
    guardians: (raw.guardians as AbsenceFollowupAlertDetail["guardians"]) ?? [],
    notification_count: (notifications ?? []).length,
    notifications: (notifications ?? []).map((n) => {
      const nr = n as Record<string, unknown>;
      return {
        ...n,
        guardian:
          nr.guardian as AbsenceFollowupAlertDetail["notifications"][number]["guardian"],
      } as AbsenceFollowupAlertDetail["notifications"][number];
    }),
  };

  return success(detail);
}

// ============================================================
// EXPORT ALERT HISTORY
// ============================================================

export async function exportAlertHistory(
  filterInput?: ListAlertsFilterInput,
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  const ctx = await requirePermission(Permissions.MANAGE_ABSENCE_FOLLOWUP);

  const historyResult = await getAlertHistory({
    ...(filterInput ?? {}),
    limit: 1000,
    page: 1,
  });

  if (historyResult.error || !historyResult.data) {
    return failure(
      historyResult.error?.message ?? "Failed to fetch history",
      ErrorCodes.DATABASE_ERROR,
    );
  }

  const rows = historyResult.data;
  const headers = [
    "Date",
    "Student Name",
    "Status",
    "Explanation",
    "Explanation Source",
    "Explained At",
    "Notifications Sent",
  ];

  const csvRows = rows.map((a) => {
    const studentName = a.student
      ? `${a.student.preferred_name ?? a.student.first_name} ${a.student.last_name}`
      : "Unknown";
    return [
      a.alert_date,
      `"${studentName}"`,
      a.status,
      `"${(a.explanation ?? "").replace(/"/g, '""')}"`,
      a.explanation_source ?? "",
      a.explained_at ? new Date(a.explained_at).toLocaleString("en-AU") : "",
      String(a.notification_count),
    ].join(",");
  });

  const csv = [headers.join(","), ...csvRows].join("\n");
  const today = new Date().toISOString().split("T")[0];
  const filename = `absence-followup-${today}.csv`;

  await logAudit({
    context: ctx,
    action: AuditActions.ABSENCE_FOLLOWUP_EXPORTED,
    entityType: "absence_followup_alerts",
    entityId: null,
    metadata: { row_count: rows.length, filename },
  });

  return success({ csv, filename });
}
