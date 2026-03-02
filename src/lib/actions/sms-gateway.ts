"use server";

// src/lib/actions/sms-gateway.ts
//
// ============================================================
// WattleOS - SMS Gateway Server Actions
// ============================================================
// All reads/writes for the SMS gateway module.
//
// Security notes:
//   - API keys are AES-256-GCM encrypted before storage.
//   - The SmsGatewayConfigSafe type omits key material.
//   - Opt-out list is enforced before every send.
//   - Daily limit is checked against today's sms_messages count.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { failure, success } from "@/types/api";
import { ErrorCodes } from "@/types/api";
import type { ActionResponse, PaginatedResponse } from "@/types/api";
import type {
  SmsGatewayConfigSafe,
  SmsMessage,
  SmsMessageWithStudent,
  SmsDashboardData,
  SmsDeliveryStats,
} from "@/types/domain";
import {
  UpsertSmsConfigSchema,
  SendSmsSchema,
  BroadcastSmsSchema,
  ListSmsMessagesSchema,
  AddOptOutSchema,
  RemoveOptOutSchema,
  SmsWebhookSchema,
} from "@/lib/validations/sms-gateway";
import type {
  UpsertSmsConfigInput,
  SendSmsInput,
  BroadcastSmsInput,
  ListSmsMessagesInput,
  AddOptOutInput,
  RemoveOptOutInput,
  SmsWebhookInput,
} from "@/lib/validations/sms-gateway";
import {
  dispatchSms,
  dispatchSmsBatch,
  encryptField,
} from "@/lib/integrations/sms/send";

// ============================================================
// Config
// ============================================================

/** Returns safe config (no key material) for the current tenant. */
export async function getSmsGatewayConfig(): Promise<
  ActionResponse<SmsGatewayConfigSafe | null>
> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const db = await createSupabaseServerClient();

    const { data, error } = await db
      .from("sms_gateway_config")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return success(null);

    const safe: SmsGatewayConfigSafe = {
      tenant_id: data.tenant_id as string,
      provider: data.provider as "messagemedia" | "burst",
      has_api_key: Boolean(data.api_key_enc as string | null),
      sender_id: data.sender_id as string,
      enabled: data.enabled as boolean,
      daily_limit: data.daily_limit as number,
      opt_out_count: ((data.opt_out_list as string[]) ?? []).length,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };

    return success(safe);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

/** Upsert SMS gateway configuration for the current tenant. */
export async function upsertSmsGatewayConfig(
  input: UpsertSmsConfigInput,
): Promise<ActionResponse<SmsGatewayConfigSafe>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const parsed = UpsertSmsConfigSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { provider, api_key, api_secret, sender_id, enabled, daily_limit } =
      parsed.data;

    // MessageMedia requires a secret
    if (provider === "messagemedia" && !api_secret) {
      return failure(
        "MessageMedia requires both API Key and API Secret.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const db = await createSupabaseAdminClient(); // admin to bypass RLS for upsert

    // Fetch existing to preserve encrypted keys if new input is placeholder
    const { data: existing } = await db
      .from("sms_gateway_config")
      .select("api_key_enc, api_secret_enc, opt_out_list")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    // Re-encrypt only if a new non-empty value was provided
    const newApiKeyEnc = api_key.trim()
      ? encryptField(api_key.trim())
      : ((existing?.api_key_enc as string | null) ?? "");

    const newApiSecretEnc = api_secret?.trim()
      ? encryptField(api_secret.trim())
      : ((existing?.api_secret_enc as string | null) ?? null);

    const wasEnabled =
      (existing as { enabled?: boolean } | null)?.enabled ?? false;

    const { data, error } = await db
      .from("sms_gateway_config")
      .upsert(
        {
          tenant_id: ctx.tenant.id,
          provider,
          api_key_enc: newApiKeyEnc,
          api_secret_enc: newApiSecretEnc,
          sender_id,
          enabled,
          daily_limit,
        },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    // Log config change
    await logAudit({
      context: ctx,
      action: AuditActions.SMS_GATEWAY_CONFIG_UPDATED,
      entityType: "sms_gateway_config",
      entityId: ctx.tenant.id,
      metadata: { provider, sender_id, daily_limit, enabled },
    });

    if (!wasEnabled && enabled) {
      await logAudit({
        context: ctx,
        action: AuditActions.SMS_GATEWAY_ENABLED,
        entityType: "sms_gateway_config",
        entityId: ctx.tenant.id,
        metadata: { provider },
      });
    } else if (wasEnabled && !enabled) {
      await logAudit({
        context: ctx,
        action: AuditActions.SMS_GATEWAY_DISABLED,
        entityType: "sms_gateway_config",
        entityId: ctx.tenant.id,
        metadata: { provider },
      });
    }

    const safe: SmsGatewayConfigSafe = {
      tenant_id: data.tenant_id as string,
      provider: data.provider as "messagemedia" | "burst",
      has_api_key: Boolean(data.api_key_enc as string | null),
      sender_id: data.sender_id as string,
      enabled: data.enabled as boolean,
      daily_limit: data.daily_limit as number,
      opt_out_count: ((data.opt_out_list as string[]) ?? []).length,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };

    return success(safe);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Sending
// ============================================================

/** Send an individual SMS message. */
export async function sendSmsMessage(
  input: SendSmsInput,
): Promise<ActionResponse<SmsMessage>> {
  try {
    const ctx = await requirePermission(Permissions.SEND_SMS);
    const parsed = SendSmsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const data = parsed.data;
    const db = await createSupabaseAdminClient();

    // Load config (via admin client to read encrypted keys)
    const { data: cfg, error: cfgErr } = await db
      .from("sms_gateway_config")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (cfgErr) return failure(cfgErr.message, ErrorCodes.DATABASE_ERROR);
    if (!cfg)
      return failure(
        "SMS gateway is not configured.",
        ErrorCodes.SMS_GATEWAY_NOT_CONFIGURED,
      );
    if (!(cfg.enabled as boolean))
      return failure(
        "SMS gateway is disabled.",
        ErrorCodes.SMS_GATEWAY_DISABLED,
      );

    // Check opt-out
    const optOutList = (cfg.opt_out_list as string[]) ?? [];
    if (optOutList.includes(data.recipient_phone)) {
      return failure(
        "This number has opted out of SMS.",
        ErrorCodes.SMS_OPTED_OUT,
      );
    }

    // Check daily limit
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await db
      .from("sms_messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id)
      .gte("queued_at", today)
      .not("status", "eq", "opted_out");

    if ((count ?? 0) >= (cfg.daily_limit as number)) {
      return failure(
        "Daily SMS limit reached. Try again tomorrow.",
        ErrorCodes.SMS_DAILY_LIMIT_EXCEEDED,
      );
    }

    // Create pending record
    const { data: msgRow, error: insertErr } = await db
      .from("sms_messages")
      .insert({
        tenant_id: ctx.tenant.id,
        sent_by_user_id: ctx.user.id,
        recipient_phone: data.recipient_phone,
        recipient_name: data.recipient_name ?? null,
        student_id: data.student_id ?? null,
        guardian_id: data.guardian_id ?? null,
        message_body: data.message_body,
        message_type: data.message_type,
        provider: cfg.provider as string,
        status: "pending",
        segment_count: Math.ceil(data.message_body.length / 160),
        metadata: data.metadata ?? {},
      })
      .select()
      .single();

    if (insertErr || !msgRow) {
      return failure(
        insertErr?.message ?? "Failed to create SMS record",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Dispatch via provider
    const providerResult = await dispatchSms(
      {
        recipient_phone: data.recipient_phone,
        message_body: data.message_body,
        sender_id: cfg.sender_id as string,
        reference: msgRow.id as string,
      },
      {
        provider: cfg.provider as "messagemedia" | "burst",
        api_key_enc: cfg.api_key_enc as string,
        api_secret_enc: cfg.api_secret_enc as string | null,
      },
    );

    // Update record with provider result
    const updatePayload = providerResult.error
      ? {
          status: "failed" as const,
          error_message: providerResult.error,
          failed_at: new Date().toISOString(),
        }
      : {
          status: "sent" as const,
          provider_message_id: providerResult.data!.provider_message_id,
          sent_at: new Date().toISOString(),
        };

    const { data: updated, error: updateErr } = await db
      .from("sms_messages")
      .update(updatePayload)
      .eq("id", msgRow.id as string)
      .select()
      .single();

    if (updateErr) return failure(updateErr.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context: ctx,
      action: AuditActions.SMS_SENT,
      entityType: "sms_message",
      entityId: msgRow.id as string,
      metadata: {
        recipient_phone: data.recipient_phone,
        message_type: data.message_type,
        status: updatePayload.status,
        student_id: data.student_id ?? null,
      },
    });

    if (providerResult.error) {
      return failure(providerResult.error, ErrorCodes.SMS_GATEWAY_ERROR);
    }

    return success(updated as unknown as SmsMessage);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

/** Send an SMS broadcast to multiple recipients. */
export async function broadcastSms(
  input: BroadcastSmsInput,
): Promise<
  ActionResponse<{ sent: number; failed: number; opted_out: number }>
> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const parsed = BroadcastSmsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const data = parsed.data;
    const db = await createSupabaseAdminClient();

    // Load config
    const { data: cfg, error: cfgErr } = await db
      .from("sms_gateway_config")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (cfgErr) return failure(cfgErr.message, ErrorCodes.DATABASE_ERROR);
    if (!cfg)
      return failure(
        "SMS gateway is not configured.",
        ErrorCodes.SMS_GATEWAY_NOT_CONFIGURED,
      );
    if (!(cfg.enabled as boolean))
      return failure(
        "SMS gateway is disabled.",
        ErrorCodes.SMS_GATEWAY_DISABLED,
      );

    // Check daily limit
    const optOutList = (cfg.opt_out_list as string[]) ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const { count: sentToday } = await db
      .from("sms_messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenant.id)
      .gte("queued_at", today)
      .not("status", "eq", "opted_out");

    const remaining = (cfg.daily_limit as number) - (sentToday ?? 0);
    if (remaining <= 0) {
      return failure(
        "Daily SMS limit reached.",
        ErrorCodes.SMS_DAILY_LIMIT_EXCEEDED,
      );
    }

    // Filter opted-out recipients
    const eligible = data.recipients.filter(
      (r) => !optOutList.includes(r.phone),
    );
    const optedOutCount = data.recipients.length - eligible.length;

    // Respect daily limit
    const toSend = eligible.slice(0, remaining);

    // Insert pending records
    const insertRows = toSend.map((r) => ({
      tenant_id: ctx.tenant.id,
      sent_by_user_id: ctx.user.id,
      recipient_phone: r.phone,
      recipient_name: r.name ?? null,
      student_id: r.student_id ?? null,
      guardian_id: r.guardian_id ?? null,
      message_body: data.message_body,
      message_type: data.message_type,
      provider: cfg.provider as string,
      status: "pending",
      segment_count: Math.ceil(data.message_body.length / 160),
      metadata: data.metadata ?? {},
    }));

    const { data: inserted, error: insertErr } = await db
      .from("sms_messages")
      .insert(insertRows)
      .select("id, recipient_phone");

    if (insertErr || !inserted) {
      return failure(
        insertErr?.message ?? "Failed to create SMS records",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Dispatch batch
    const batchResult = await dispatchSmsBatch(
      toSend.map((r, i) => ({
        recipient_phone: r.phone,
        message_body: data.message_body,
        sender_id: cfg.sender_id as string,
        reference: (inserted[i]?.id as string) ?? undefined,
      })),
      {
        provider: cfg.provider as "messagemedia" | "burst",
        api_key_enc: cfg.api_key_enc as string,
        api_secret_enc: cfg.api_secret_enc as string | null,
      },
    );

    // Update each row based on batch result
    let sentCount = 0;
    let failedCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < inserted.length; i++) {
      const res = batchResult.results[i];
      const id = inserted[i]?.id as string;
      if (!id) continue;

      if (res?.message_id) {
        await db
          .from("sms_messages")
          .update({
            status: "sent",
            provider_message_id: res.message_id,
            sent_at: now,
          })
          .eq("id", id);
        sentCount++;
      } else {
        await db
          .from("sms_messages")
          .update({
            status: "failed",
            error_message: res?.error ?? "Unknown error",
            failed_at: now,
          })
          .eq("id", id);
        failedCount++;
      }
    }

    await logAudit({
      context: ctx,
      action: AuditActions.SMS_BROADCAST_SENT,
      entityType: "sms_broadcast",
      entityId: ctx.tenant.id,
      metadata: {
        total: data.recipients.length,
        sent: sentCount,
        failed: failedCount,
        opted_out: optedOutCount,
        message_type: data.message_type,
      },
    });

    return success({
      sent: sentCount,
      failed: failedCount,
      opted_out: optedOutCount,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Message Log
// ============================================================

/** List SMS messages with filters and pagination. */
export async function listSmsMessages(
  input: Partial<ListSmsMessagesInput> = {},
): Promise<PaginatedResponse<SmsMessageWithStudent>> {
  const { paginatedFailure, paginated } = await import("@/types/api");
  try {
    const ctx = await requirePermission(Permissions.VIEW_SMS_GATEWAY);
    const parsed = ListSmsMessagesSchema.safeParse(input);
    if (!parsed.success) {
      return paginatedFailure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const {
      status,
      message_type,
      student_id,
      date_from,
      date_to,
      search,
      page,
      per_page,
    } = parsed.data;
    const db = await createSupabaseServerClient();
    const offset = (page - 1) * per_page;

    let query = db
      .from("sms_messages")
      .select(`*, student:students(id, first_name, last_name)`, {
        count: "exact",
      })
      .eq("tenant_id", ctx.tenant.id)
      .order("queued_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (status) query = query.eq("status", status);
    if (message_type) query = query.eq("message_type", message_type);
    if (student_id) query = query.eq("student_id", student_id);
    if (date_from) query = query.gte("queued_at", date_from);
    if (date_to) query = query.lte("queued_at", date_to + "T23:59:59Z");
    if (search) query = query.ilike("recipient_phone", `%${search}%`);

    const { data, error, count } = await query;
    if (error)
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);

    return paginated(
      data as unknown as SmsMessageWithStudent[],
      count ?? 0,
      page,
      per_page,
    );
  } catch (err) {
    return paginatedFailure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Dashboard
// ============================================================

export async function getSmsDashboard(): Promise<
  ActionResponse<SmsDashboardData>
> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const db = await createSupabaseAdminClient();

    // Config
    const { data: rawCfg } = await db
      .from("sms_gateway_config")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    const config: SmsGatewayConfigSafe | null = rawCfg
      ? {
          tenant_id: rawCfg.tenant_id as string,
          provider: rawCfg.provider as "messagemedia" | "burst",
          has_api_key: Boolean(rawCfg.api_key_enc as string),
          sender_id: rawCfg.sender_id as string,
          enabled: rawCfg.enabled as boolean,
          daily_limit: rawCfg.daily_limit as number,
          opt_out_count: ((rawCfg.opt_out_list as string[]) ?? []).length,
          created_at: rawCfg.created_at as string,
          updated_at: rawCfg.updated_at as string,
        }
      : null;

    // 30-day stats
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: msgs30 } = await db
      .from("sms_messages")
      .select("status, segment_count, queued_at")
      .eq("tenant_id", ctx.tenant.id)
      .gte("queued_at", thirtyDaysAgo);

    const today = new Date().toISOString().slice(0, 10);
    const todayMsgs = (msgs30 ?? []).filter((m) =>
      (m.queued_at as string).startsWith(today),
    );
    const segmentsToday = todayMsgs.reduce(
      (acc, m) => acc + ((m.segment_count as number) ?? 1),
      0,
    );

    const statuses = (msgs30 ?? []).reduce<Record<string, number>>((acc, m) => {
      acc[m.status as string] = (acc[m.status as string] ?? 0) + 1;
      return acc;
    }, {});
    const total = msgs30?.length ?? 0;
    const delivered = statuses["delivered"] ?? 0;

    const stats30d: SmsDeliveryStats = {
      total,
      sent: (statuses["sent"] ?? 0) + delivered,
      delivered,
      failed: statuses["failed"] ?? 0,
      pending: statuses["pending"] ?? 0,
      opted_out: statuses["opted_out"] ?? 0,
      delivery_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      segments_used_today: segmentsToday,
      daily_limit: (rawCfg?.daily_limit as number) ?? 500,
    };

    // Recent messages with student
    const { data: recent } = await db
      .from("sms_messages")
      .select("*, student:students(id, first_name, last_name)")
      .eq("tenant_id", ctx.tenant.id)
      .order("queued_at", { ascending: false })
      .limit(20);

    // Failed messages
    const { data: failed } = await db
      .from("sms_messages")
      .select("*")
      .eq("tenant_id", ctx.tenant.id)
      .eq("status", "failed")
      .order("queued_at", { ascending: false })
      .limit(10);

    return success({
      config,
      stats_30d: stats30d,
      recent_messages: recent as unknown as SmsMessageWithStudent[],
      failed_messages: failed as unknown as SmsMessage[],
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Opt-out Management
// ============================================================

export async function getOptOutList(): Promise<ActionResponse<string[]>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const db = await createSupabaseAdminClient();

    const { data, error } = await db
      .from("sms_gateway_config")
      .select("opt_out_list")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data?.opt_out_list as string[]) ?? []);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function addOptOut(
  input: AddOptOutInput,
): Promise<ActionResponse<{ opt_out_count: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const parsed = AddOptOutSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );

    const db = await createSupabaseAdminClient();

    // Use array_append - idempotent with array_remove first
    const { data: cfg } = await db
      .from("sms_gateway_config")
      .select("opt_out_list")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (!cfg)
      return failure(
        "Gateway not configured.",
        ErrorCodes.SMS_GATEWAY_NOT_CONFIGURED,
      );

    const current = (cfg.opt_out_list as string[]) ?? [];
    if (current.includes(parsed.data.phone)) {
      return success({ opt_out_count: current.length });
    }

    const updated = [...current, parsed.data.phone];
    const { error } = await db
      .from("sms_gateway_config")
      .update({ opt_out_list: updated })
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context: ctx,
      action: AuditActions.SMS_OPT_OUT_ADDED,
      entityType: "sms_gateway_config",
      entityId: ctx.tenant.id,
      metadata: { phone: parsed.data.phone },
    });

    // Mark any pending/sent messages to this number as opted_out
    await db
      .from("sms_messages")
      .update({ status: "opted_out" })
      .eq("tenant_id", ctx.tenant.id)
      .eq("recipient_phone", parsed.data.phone)
      .in("status", ["pending", "sent"]);

    return success({ opt_out_count: updated.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function removeOptOut(
  input: RemoveOptOutInput,
): Promise<ActionResponse<{ opt_out_count: number }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const parsed = RemoveOptOutSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );

    const db = await createSupabaseAdminClient();

    const { data: cfg } = await db
      .from("sms_gateway_config")
      .select("opt_out_list")
      .eq("tenant_id", ctx.tenant.id)
      .maybeSingle();

    if (!cfg)
      return failure(
        "Gateway not configured.",
        ErrorCodes.SMS_GATEWAY_NOT_CONFIGURED,
      );

    const current = (cfg.opt_out_list as string[]) ?? [];
    const updated = current.filter((p) => p !== parsed.data.phone);

    const { error } = await db
      .from("sms_gateway_config")
      .update({ opt_out_list: updated })
      .eq("tenant_id", ctx.tenant.id);

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context: ctx,
      action: AuditActions.SMS_OPT_OUT_REMOVED,
      entityType: "sms_gateway_config",
      entityId: ctx.tenant.id,
      metadata: { phone: parsed.data.phone },
    });

    return success({ opt_out_count: updated.length });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Webhook - Delivery Receipt
// ============================================================

/**
 * Update message status from a provider delivery receipt webhook.
 * Called from the webhook route handler - uses admin client.
 */
export async function processSmsDeliveryWebhook(
  input: SmsWebhookInput,
): Promise<ActionResponse<{ updated: boolean }>> {
  try {
    const parsed = SmsWebhookSchema.safeParse(input);
    if (!parsed.success)
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );

    const { provider_message_id, status, error_message } = parsed.data;
    const db = await createSupabaseAdminClient();

    const updateFields: Record<string, unknown> = { status };
    if (status === "delivered")
      updateFields.delivered_at = new Date().toISOString();
    if (status === "failed") updateFields.failed_at = new Date().toISOString();
    if (status === "bounced") updateFields.failed_at = new Date().toISOString();
    if (error_message) updateFields.error_message = error_message;

    const { data, error } = await db
      .from("sms_messages")
      .update(updateFields)
      .eq("provider_message_id", provider_message_id)
      .select("id")
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    return success({ updated: Boolean(data) });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Export
// ============================================================

export async function exportSmsMessages(
  input: Partial<ListSmsMessagesInput> = {},
): Promise<ActionResponse<{ csv: string; filename: string }>> {
  try {
    const ctx = await requirePermission(Permissions.MANAGE_SMS_GATEWAY);
    const parsed = ListSmsMessagesSchema.safeParse({
      ...input,
      per_page: 5000,
    });
    if (!parsed.success)
      return failure(
        parsed.error.issues[0].message,
        ErrorCodes.VALIDATION_ERROR,
      );

    const db = await createSupabaseServerClient();
    const { status, message_type, student_id, date_from, date_to } =
      parsed.data;

    let query = db
      .from("sms_messages")
      .select(
        "queued_at, recipient_phone, recipient_name, message_type, status, message_body, segment_count, error_message, provider_message_id",
      )
      .eq("tenant_id", ctx.tenant.id)
      .order("queued_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (message_type) query = query.eq("message_type", message_type);
    if (student_id) query = query.eq("student_id", student_id);
    if (date_from) query = query.gte("queued_at", date_from);
    if (date_to) query = query.lte("queued_at", date_to + "T23:59:59Z");

    const { data: rows, error } = await query;
    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const headers = [
      "Date/Time",
      "Phone",
      "Recipient Name",
      "Type",
      "Status",
      "Message",
      "Segments",
      "Error",
      "Provider Message ID",
    ];
    const csvRows = (rows ?? []).map((r) =>
      [
        r.queued_at as string,
        r.recipient_phone as string,
        (r.recipient_name as string) ?? "",
        r.message_type as string,
        r.status as string,
        `"${((r.message_body as string) ?? "").replace(/"/g, '""')}"`,
        String(r.segment_count ?? 1),
        `"${((r.error_message as string) ?? "").replace(/"/g, '""')}"`,
        (r.provider_message_id as string) ?? "",
      ].join(","),
    );

    const csv = [headers.join(","), ...csvRows].join("\n");
    const filename = `sms-messages-${new Date().toISOString().slice(0, 10)}.csv`;

    await logAudit({
      context: ctx,
      action: AuditActions.SMS_EXPORTED,
      entityType: "sms_messages",
      entityId: ctx.tenant.id,
      metadata: { row_count: rows?.length ?? 0 },
    });

    return success({ csv, filename });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Unexpected error",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
