"use server";

// src/lib/actions/push-notifications.ts
//
// ============================================================
// WattleOS V2 - Push Notification Dispatch
// ============================================================
// Admin-facing actions for creating, scheduling, and sending
// push notification campaigns. Dispatch is fire-and-forget:
// we fan-out to all eligible device tokens and write a delivery
// log row per device. APNs/FCM callbacks update delivery status.
//
// The actual push transport is pluggable (currently simulated -
// integrate a real FCM/APNs SDK here for production).
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  ActionResponse,
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  NotificationDashboardData,
  NotificationDeliveryLog,
  NotificationDispatch,
  NotificationDispatchWithAuthor,
  NotificationTopic,
  NotificationTopicPref,
} from "@/types/domain";
import {
  BulkUpdateTopicPrefsSchema,
  CancelDispatchSchema,
  CreateDispatchSchema,
  ListDispatchesSchema,
  SendDispatchSchema,
  UpdateDispatchSchema,
} from "@/lib/validations/push-notifications";
import type {
  BulkUpdateTopicPrefsInput,
  CancelDispatchInput,
  CreateDispatchInput,
  ListDispatchesInput,
  SendDispatchInput,
  UpdateDispatchInput,
} from "@/lib/validations/push-notifications";

// ============================================================
// Internal: resolve recipient user IDs for a dispatch
// ============================================================

async function resolveRecipientIds(
  tenantId: string,
  dispatch: Pick<
    NotificationDispatch,
    "target_type" | "target_class_id" | "target_program_id" | "target_user_ids"
  >,
): Promise<string[]> {
  const admin = createSupabaseAdminClient();

  if (dispatch.target_type === "specific_users") {
    return dispatch.target_user_ids ?? [];
  }

  if (dispatch.target_type === "specific_class" && dispatch.target_class_id) {
    const { data } = await admin
      .from("class_enrollments")
      .select("student:students(guardian_id)")
      .eq("class_id", dispatch.target_class_id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    const ids = new Set<string>();
    for (const row of data ?? []) {
      // Supabase join returns array; take first element
      const studentArr = row.student as unknown as Array<{
        guardian_id: string | null;
      }> | null;
      const guardianId = Array.isArray(studentArr)
        ? studentArr[0]?.guardian_id
        : null;
      if (guardianId) ids.add(guardianId);
    }
    return [...ids];
  }

  if (
    dispatch.target_type === "specific_program" &&
    dispatch.target_program_id
  ) {
    const { data } = await admin
      .from("program_bookings")
      .select("parent_user_id")
      .eq("program_id", dispatch.target_program_id)
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    return (data ?? [])
      .map((r) => (r as { parent_user_id: string }).parent_user_id)
      .filter(Boolean);
  }

  // all_staff | all_parents | all_users
  const { data } = await admin
    .from("tenant_members")
    .select("user_id, role:tenant_roles(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  return (data ?? [])
    .filter((m) => {
      // Supabase join returns array; take first element
      const roleArr = m.role as unknown as Array<{ name: string }> | null;
      const roleName = Array.isArray(roleArr)
        ? roleArr[0]?.name?.toLowerCase()
        : undefined;
      if (dispatch.target_type === "all_staff") {
        return roleName !== "parent";
      }
      if (dispatch.target_type === "all_parents") {
        return roleName === "parent";
      }
      return true; // all_users
    })
    .map((m) => (m as { user_id: string }).user_id);
}

// ============================================================
// Internal: fan-out push to all device tokens
// ============================================================

async function fanOutPush(
  tenantId: string,
  dispatchId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  userIds: string[],
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const admin = createSupabaseAdminClient();

  // Fetch all device tokens for these users
  const { data: tokens } = await admin
    .from("device_push_tokens")
    .select("user_id, token, platform")
    .eq("tenant_id", tenantId)
    .in("user_id", userIds);

  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 };

  // Build delivery log rows
  const logRows = tokens.map((t) => ({
    dispatch_id: dispatchId,
    tenant_id: tenantId,
    user_id: (t as { user_id: string }).user_id,
    token: (t as { token: string }).token,
    platform: (t as { platform: string }).platform as "ios" | "android" | "web",
    status: "sent" as const, // optimistically "sent"; webhook updates to "delivered"
    sent_at: new Date().toISOString(),
  }));

  await admin.from("notification_delivery_log").insert(logRows);

  // TODO: In production, call FCM / APNs SDK here per platform batch.
  // Pseudo-code:
  //   const iosTokens = tokens.filter(t => t.platform === 'ios').map(t => t.token);
  //   const fcmTokens = tokens.filter(t => t.platform !== 'ios').map(t => t.token);
  //   await sendApns(iosTokens, { title, body, data });
  //   await sendFcm(fcmTokens, { title, body, data });

  console.info(
    `[push] Dispatched ${logRows.length} tokens for dispatch ${dispatchId}`,
  );

  return { sent: logRows.length, failed: 0 };
}

// ============================================================
// getDashboard
// ============================================================

export async function getPushNotificationDashboard(): Promise<
  ActionResponse<NotificationDashboardData>
> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_NOTIFICATION_ANALYTICS,
    );
    const supabase = await createSupabaseServerClient();

    const since30d = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [{ data: recent }, { count: sent30d }] = await Promise.all([
      supabase
        .from("notification_dispatches")
        .select(`*, author:created_by(id, first_name, last_name, email)`)
        .eq("tenant_id", context.tenant.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("notification_dispatches")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", context.tenant.id)
        .eq("status", "sent")
        .gte("sent_at", since30d),
    ]);

    const { count: total } = await supabase
      .from("notification_dispatches")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null);

    // Topic breakdown (last 30d sent)
    const { data: topicRows } = await supabase
      .from("notification_dispatches")
      .select("topic")
      .eq("tenant_id", context.tenant.id)
      .eq("status", "sent")
      .gte("sent_at", since30d);

    const topicMap: Record<string, number> = {};
    for (const row of topicRows ?? []) {
      const t = (row as { topic: string }).topic;
      topicMap[t] = (topicMap[t] ?? 0) + 1;
    }
    const topicBreakdown = Object.entries(topicMap).map(([topic, count]) => ({
      topic: topic as NotificationTopic,
      count,
    }));

    // Avg delivery rate from recent dispatches
    const dispatches = (recent ?? []) as NotificationDispatchWithAuthor[];
    const totalSent = dispatches.reduce((s, d) => s + d.recipient_count, 0);
    const totalDelivered = dispatches.reduce(
      (s, d) => s + d.delivered_count,
      0,
    );
    const avgDeliveryRate =
      totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

    return success({
      total_dispatches: total ?? 0,
      sent_last_30d: sent30d ?? 0,
      avg_delivery_rate: avgDeliveryRate,
      recent_dispatches: dispatches,
      topic_breakdown: topicBreakdown,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dashboard",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// listDispatches
// ============================================================

export async function listDispatches(
  input: ListDispatchesInput,
): Promise<PaginatedResponse<NotificationDispatchWithAuthor>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_NOTIFICATION_ANALYTICS,
    );
    const supabase = await createSupabaseServerClient();
    const parsed = ListDispatchesSchema.parse(input);

    let q = supabase
      .from("notification_dispatches")
      .select(`*, author:created_by(id, first_name, last_name, email)`, {
        count: "exact",
      })
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(
        (parsed.page - 1) * parsed.page_size,
        parsed.page * parsed.page_size - 1,
      );

    if (parsed.status) q = q.eq("status", parsed.status);
    if (parsed.topic) q = q.eq("topic", parsed.topic);

    const { data, count, error } = await q;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.INTERNAL_ERROR);

    return paginated(
      (data ?? []) as NotificationDispatchWithAuthor[],
      count ?? 0,
      parsed.page,
      parsed.page_size,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// getDispatch
// ============================================================

export async function getDispatch(
  dispatchId: string,
): Promise<ActionResponse<NotificationDispatchWithAuthor>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_NOTIFICATION_ANALYTICS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notification_dispatches")
      .select(`*, author:created_by(id, first_name, last_name, email)`)
      .eq("id", dispatchId)
      .eq("tenant_id", context.tenant.id)
      .is("deleted_at", null)
      .single();

    if (error || !data)
      return failure("Dispatch not found", ErrorCodes.NOT_FOUND);

    return success(data as NotificationDispatchWithAuthor);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// createDispatch
// ============================================================

export async function createDispatch(
  input: CreateDispatchInput,
): Promise<ActionResponse<NotificationDispatch>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
    );
    const parsed = CreateDispatchSchema.parse(input);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notification_dispatches")
      .insert({
        tenant_id: context.tenant.id,
        created_by: context.user.id,
        topic: parsed.topic,
        title: parsed.title,
        body: parsed.body,
        data: parsed.data,
        target_type: parsed.target_type,
        target_class_id: parsed.target_class_id ?? null,
        target_program_id: parsed.target_program_id ?? null,
        target_user_ids: parsed.target_user_ids ?? null,
        scheduled_for: parsed.scheduled_for ?? null,
        status: parsed.scheduled_for ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error || !data)
      return failure(
        error?.message ?? "Insert failed",
        ErrorCodes.CREATE_FAILED,
      );

    await logAudit({
      context,
      action: AuditActions.PUSH_DISPATCH_CREATED,
      entityType: "notification_dispatch",
      entityId: data.id,
      metadata: {
        title: parsed.title,
        topic: parsed.topic,
        target_type: parsed.target_type,
      },
    });

    return success(data as NotificationDispatch);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to create dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// updateDispatch (draft only)
// ============================================================

export async function updateDispatch(
  input: UpdateDispatchInput,
): Promise<ActionResponse<NotificationDispatch>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
    );
    const parsed = UpdateDispatchSchema.parse(input);
    const supabase = await createSupabaseServerClient();

    // Only drafts / scheduled dispatches can be edited
    const { data: existing, error: fetchErr } = await supabase
      .from("notification_dispatches")
      .select("status")
      .eq("id", parsed.dispatch_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (fetchErr || !existing)
      return failure("Dispatch not found", ErrorCodes.NOT_FOUND);
    if (
      !["draft", "scheduled"].includes((existing as { status: string }).status)
    ) {
      return failure(
        "Only draft or scheduled dispatches can be edited",
        ErrorCodes.INVALID_INPUT,
      );
    }

    const { data, error } = await supabase
      .from("notification_dispatches")
      .update({
        ...(parsed.topic !== undefined && { topic: parsed.topic }),
        ...(parsed.title !== undefined && { title: parsed.title }),
        ...(parsed.body !== undefined && { body: parsed.body }),
        ...(parsed.data !== undefined && { data: parsed.data }),
        ...(parsed.target_type !== undefined && {
          target_type: parsed.target_type,
        }),
        target_class_id: parsed.target_class_id ?? null,
        target_program_id: parsed.target_program_id ?? null,
        target_user_ids: parsed.target_user_ids ?? null,
        ...(parsed.scheduled_for !== undefined && {
          scheduled_for: parsed.scheduled_for ?? null,
        }),
      })
      .eq("id", parsed.dispatch_id)
      .eq("tenant_id", context.tenant.id)
      .select()
      .single();

    if (error || !data)
      return failure(
        error?.message ?? "Update failed",
        ErrorCodes.UPDATE_FAILED,
      );

    await logAudit({
      context,
      action: AuditActions.PUSH_DISPATCH_UPDATED,
      entityType: "notification_dispatch",
      entityId: parsed.dispatch_id,
      metadata: { fields_updated: Object.keys(parsed) },
    });

    return success(data as NotificationDispatch);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// sendDispatch - resolve targets, fan-out, mark sent
// ============================================================

export async function sendDispatch(
  input: SendDispatchInput,
): Promise<ActionResponse<{ sent_count: number; failed_count: number }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
    );
    const parsed = SendDispatchSchema.parse(input);
    const admin = createSupabaseAdminClient();

    const { data: dispatch, error: fetchErr } = await admin
      .from("notification_dispatches")
      .select("*")
      .eq("id", parsed.dispatch_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (fetchErr || !dispatch)
      return failure("Dispatch not found", ErrorCodes.NOT_FOUND);

    const d = dispatch as NotificationDispatch;
    if (!["draft", "scheduled"].includes(d.status)) {
      return failure(
        "Only draft or scheduled dispatches can be sent",
        ErrorCodes.INVALID_INPUT,
      );
    }

    // Mark sending
    await admin
      .from("notification_dispatches")
      .update({ status: "sending" })
      .eq("id", parsed.dispatch_id);

    // Resolve target users
    const recipientIds = await resolveRecipientIds(context.tenant.id, d);

    // Fan out
    const { sent, failed } = await fanOutPush(
      context.tenant.id,
      parsed.dispatch_id,
      d.title,
      d.body,
      d.data,
      recipientIds,
    );

    // Mark sent
    await admin
      .from("notification_dispatches")
      .update({
        status: sent > 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
        recipient_count: recipientIds.length,
        delivered_count: 0, // updated later via webhook
        failed_count: failed,
      })
      .eq("id", parsed.dispatch_id);

    await logAudit({
      context,
      action: AuditActions.PUSH_DISPATCH_SENT,
      entityType: "notification_dispatch",
      entityId: parsed.dispatch_id,
      metadata: {
        title: d.title,
        topic: d.topic,
        recipient_count: recipientIds.length,
        sent_tokens: sent,
      },
    });

    return success({ sent_count: sent, failed_count: failed });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to send dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// cancelDispatch
// ============================================================

export async function cancelDispatch(
  input: CancelDispatchInput,
): Promise<ActionResponse<{ cancelled: boolean }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
    );
    const parsed = CancelDispatchSchema.parse(input);
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("notification_dispatches")
      .select("status")
      .eq("id", parsed.dispatch_id)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) return failure("Dispatch not found", ErrorCodes.NOT_FOUND);
    if (
      !["draft", "scheduled"].includes((existing as { status: string }).status)
    ) {
      return failure(
        "Only draft or scheduled dispatches can be cancelled",
        ErrorCodes.INVALID_INPUT,
      );
    }

    await supabase
      .from("notification_dispatches")
      .update({ status: "cancelled" })
      .eq("id", parsed.dispatch_id);

    await logAudit({
      context,
      action: AuditActions.PUSH_DISPATCH_CANCELLED,
      entityType: "notification_dispatch",
      entityId: parsed.dispatch_id,
    });

    return success({ cancelled: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to cancel dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// deleteDispatch (soft delete, draft/cancelled only)
// ============================================================

export async function deleteDispatch(
  dispatchId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
    );
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from("notification_dispatches")
      .select("status")
      .eq("id", dispatchId)
      .eq("tenant_id", context.tenant.id)
      .single();

    if (!existing) return failure("Dispatch not found", ErrorCodes.NOT_FOUND);
    if (
      !["draft", "cancelled", "failed"].includes(
        (existing as { status: string }).status,
      )
    ) {
      return failure(
        "Only draft, cancelled, or failed dispatches can be deleted",
        ErrorCodes.INVALID_INPUT,
      );
    }

    await supabase
      .from("notification_dispatches")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", dispatchId);

    await logAudit({
      context,
      action: AuditActions.PUSH_DISPATCH_DELETED,
      entityType: "notification_dispatch",
      entityId: dispatchId,
    });

    return success({ deleted: true });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to delete dispatch",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// getDeliveryLog - per-dispatch receipt view (admin)
// ============================================================

export async function getDeliveryLog(
  dispatchId: string,
): Promise<ActionResponse<NotificationDeliveryLog[]>> {
  try {
    const context = await requirePermission(
      Permissions.VIEW_NOTIFICATION_ANALYTICS,
    );
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("notification_delivery_log")
      .select("*")
      .eq("dispatch_id", dispatchId)
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false });

    if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

    return success((data ?? []) as NotificationDeliveryLog[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load delivery log",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// getMyTopicPrefs - user's own opt-in settings
// ============================================================

export async function getMyTopicPrefs(): Promise<
  ActionResponse<NotificationTopicPref[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notification_topic_prefs")
      .select("*")
      .eq("user_id", context.user.id)
      .eq("tenant_id", context.tenant.id);

    if (error) return failure(error.message, ErrorCodes.INTERNAL_ERROR);

    return success((data ?? []) as NotificationTopicPref[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load preferences",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// updateMyTopicPrefs - bulk upsert user's opt-in settings
// ============================================================

export async function updateMyTopicPrefs(
  input: BulkUpdateTopicPrefsInput,
): Promise<ActionResponse<{ updated: number }>> {
  try {
    const context = await getTenantContext();
    const parsed = BulkUpdateTopicPrefsSchema.parse(input);
    const supabase = await createSupabaseServerClient();

    const rows = parsed.prefs.map((p) => ({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      topic: p.topic,
      push_enabled: p.push_enabled,
      email_enabled: p.email_enabled,
    }));

    const { error } = await supabase
      .from("notification_topic_prefs")
      .upsert(rows, { onConflict: "user_id,topic" });

    if (error) return failure(error.message, ErrorCodes.UPDATE_FAILED);

    await logAudit({
      context,
      action: AuditActions.PUSH_TOPIC_PREF_UPDATED,
      entityType: "notification_topic_prefs",
      entityId: context.user.id,
      metadata: { topics_updated: parsed.prefs.map((p) => p.topic) },
    });

    return success({ updated: rows.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to update preferences",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
