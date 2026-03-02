"use server";

// src/lib/actions/fee-notice-comms.ts
//
// ============================================================
// WattleOS V2 - Fee Notice Communications Server Actions
// ============================================================
// Billing-triggered multi-channel comms: email, SMS, push.
//
// FLOW:
//   1. Admin configures triggers + channels + templates
//   2. System (or admin manually) queues notices when invoice
//      status changes (sent, overdue, paid, failed)
//   3. If auto_send is on, notices dispatch immediately
//   4. If off, admin approves queued notices → then dispatch
//   5. Each channel gets a delivery row for tracking
//
// CHANNELS:
//   - Email: Resend transactional via sendTransactionalEmail()
//   - SMS: dispatchSms() via SMS gateway integration
//   - Push: notification_dispatches insert (billing topic)
//
// AUDIT: All sends and config changes logged.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import { type ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  FeeNoticeConfig,
  FeeNotice,
  FeeNoticeWithDetails,
  FeeNoticeCommsData,
  FeeNoticeChannel,
} from "@/types/domain";
import {
  upsertFeeNoticeConfigSchema,
  queueFeeNoticeSchema,
  approveFeeNoticesSchema,
  listFeeNoticesFilterSchema,
  type UpsertFeeNoticeConfigInput,
  type QueueFeeNoticeInput,
  type ApproveFeeNoticesInput,
  type ListFeeNoticesFilter,
} from "@/lib/validations/fee-notice-comms";
import { sendTransactionalEmail } from "@/lib/integrations/email/send";

// ============================================================
// HELPERS
// ============================================================

const NOTICE_SELECT = `
  *,
  student:students(id, first_name, last_name),
  guardian:guardians(id, user_id, relationship, user:users(id, first_name, last_name, email)),
  invoice:invoices(id, invoice_number, status, total_cents, due_date),
  deliveries:fee_notice_deliveries(*),
  queued_by_user:users!fee_notices_queued_by_fkey(id, first_name, last_name)
`;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Build the notice body from template + invoice data. */
function buildNoticeBody(
  template: string | null,
  data: {
    student_name: string;
    invoice_number: string;
    amount: string;
    due_date: string;
    trigger_type: string;
    payment_link?: string | null;
    school_name: string;
  },
): string {
  const defaultTemplates: Record<string, string> = {
    invoice_sent: `Dear Parent/Guardian,\n\nInvoice {{invoice_number}} for {{student_name}} has been issued for {{amount}}, due {{due_date}}.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
    invoice_overdue: `Dear Parent/Guardian,\n\nInvoice {{invoice_number}} for {{student_name}} ({{amount}}) is now overdue. The due date was {{due_date}}. Please arrange payment at your earliest convenience.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
    payment_received: `Dear Parent/Guardian,\n\nThank you - we have received your payment of {{amount}} for invoice {{invoice_number}} ({{student_name}}).\n\nKind regards,\n{{school_name}}`,
    payment_failed: `Dear Parent/Guardian,\n\nUnfortunately your payment for invoice {{invoice_number}} ({{student_name}}, {{amount}}) could not be processed. Please check your payment details or contact us.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
    reminder_1: `Dear Parent/Guardian,\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{student_name}} ({{amount}}) is overdue since {{due_date}}.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
    reminder_2: `Dear Parent/Guardian,\n\nSecond reminder: Invoice {{invoice_number}} for {{student_name}} ({{amount}}) remains unpaid since {{due_date}}. Please arrange payment or contact us to discuss options.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
    reminder_3: `Dear Parent/Guardian,\n\nFinal reminder: Invoice {{invoice_number}} for {{student_name}} ({{amount}}) has been overdue since {{due_date}}. Please contact us urgently to avoid further action.{{payment_link_line}}\n\nKind regards,\n{{school_name}}`,
  };

  const tpl =
    template ||
    defaultTemplates[data.trigger_type] ||
    defaultTemplates.invoice_sent;

  const paymentLinkLine = data.payment_link
    ? `\n\nPay online: ${data.payment_link}`
    : "";

  return tpl
    .replace(/\{\{student_name\}\}/g, data.student_name)
    .replace(/\{\{invoice_number\}\}/g, data.invoice_number)
    .replace(/\{\{amount\}\}/g, data.amount)
    .replace(/\{\{due_date\}\}/g, data.due_date)
    .replace(/\{\{school_name\}\}/g, data.school_name)
    .replace(/\{\{payment_link_line\}\}/g, paymentLinkLine);
}

function triggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    invoice_sent: "Invoice Sent",
    invoice_overdue: "Invoice Overdue",
    payment_received: "Payment Received",
    payment_failed: "Payment Failed",
    reminder_1: "Reminder 1",
    reminder_2: "Reminder 2",
    reminder_3: "Reminder 3",
  };
  return labels[trigger] ?? trigger;
}

// ============================================================
// CONFIG
// ============================================================

export async function getFeeNoticeConfig(): Promise<
  ActionResponse<FeeNoticeConfig | null>
> {
  try {
    await requirePermission(Permissions.VIEW_FEE_NOTICE_COMMS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("fee_notice_configs")
      .select("*")
      .maybeSingle();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success(data as FeeNoticeConfig | null);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function upsertFeeNoticeConfig(
  input: UpsertFeeNoticeConfigInput,
): Promise<ActionResponse<FeeNoticeConfig>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = upsertFeeNoticeConfigSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    // Validate reminder day ordering
    if (v.reminder_2_days <= v.reminder_1_days) {
      return failure(
        "Reminder 2 must be after Reminder 1",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (v.reminder_3_days <= v.reminder_2_days) {
      return failure(
        "Reminder 3 must be after Reminder 2",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("fee_notice_configs")
      .upsert(
        {
          tenant_id: context.tenant.id,
          enabled_triggers: v.enabled_triggers,
          enabled_channels: v.enabled_channels,
          reminder_1_days: v.reminder_1_days,
          reminder_2_days: v.reminder_2_days,
          reminder_3_days: v.reminder_3_days,
          auto_send: v.auto_send,
          include_payment_link: v.include_payment_link,
          template_invoice_sent: v.template_invoice_sent,
          template_invoice_overdue: v.template_invoice_overdue,
          template_payment_received: v.template_payment_received,
          template_payment_failed: v.template_payment_failed,
          template_reminder: v.template_reminder,
        },
        { onConflict: "tenant_id" },
      )
      .select()
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    await logAudit({
      context,
      action: AuditActions.FEE_NOTICE_CONFIG_UPDATED,
      entityType: "fee_notice_config",
      entityId: context.tenant.id,
      metadata: {
        auto_send: v.auto_send,
        enabled_triggers: v.enabled_triggers,
        enabled_channels: v.enabled_channels,
      },
    });

    return success(data as FeeNoticeConfig);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// QUEUE NOTICE (manual or system-triggered)
// ============================================================

export async function queueFeeNotice(
  input: QueueFeeNoticeInput,
): Promise<ActionResponse<FeeNotice>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = queueFeeNoticeSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const v = parsed.data;

    // Fetch invoice with student + guardian
    const { data: invoice } = await supabase
      .from("invoices")
      .select(
        `
        id, invoice_number, total_cents, due_date, status,
        student_id, guardian_id,
        stripe_hosted_url
      `,
      )
      .eq("id", v.invoice_id)
      .is("deleted_at", null)
      .single();

    if (!invoice) return failure("Invoice not found", ErrorCodes.NOT_FOUND);

    // Check for duplicate: same invoice + trigger_type + pending/sent
    const { data: existing } = await supabase
      .from("fee_notices")
      .select("id")
      .eq("invoice_id", v.invoice_id)
      .eq("trigger_type", v.trigger_type)
      .in("status", ["pending", "sent"])
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return failure(
        `A ${triggerLabel(v.trigger_type)} notice already exists for this invoice`,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Load config to check auto_send
    const { data: config } = await supabase
      .from("fee_notice_configs")
      .select("auto_send")
      .maybeSingle();

    const autoSend =
      (config as { auto_send: boolean } | null)?.auto_send ?? false;

    const { data: notice, error } = await supabase
      .from("fee_notices")
      .insert({
        tenant_id: context.tenant.id,
        invoice_id: invoice.id,
        guardian_id: invoice.guardian_id as string,
        student_id: invoice.student_id as string,
        trigger_type: v.trigger_type,
        invoice_number: invoice.invoice_number as string,
        amount_cents: invoice.total_cents as number,
        due_date: invoice.due_date as string,
        queued_by: context.user.id,
        custom_message: v.custom_message,
        status: autoSend ? "sent" : "pending",
        sent_at: autoSend ? new Date().toISOString() : null,
        approved_by: autoSend ? context.user.id : null,
        approved_at: autoSend ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error || !notice) {
      return failure(
        error?.message ?? "Failed to create notice",
        ErrorCodes.CREATE_FAILED,
      );
    }

    await logAudit({
      context,
      action: AuditActions.FEE_NOTICE_QUEUED,
      entityType: "fee_notice",
      entityId: notice.id as string,
      metadata: {
        invoice_id: invoice.id,
        trigger_type: v.trigger_type,
        auto_send: autoSend,
      },
    });

    // If auto_send, dispatch immediately
    if (autoSend) {
      // Fire and forget - dispatch in background
      dispatchNotice(notice.id as string, context.tenant.id).catch(() => {
        // Errors are logged inside dispatchNotice
      });
    }

    return success(notice as FeeNotice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// APPROVE NOTICES (batch)
// ============================================================

export async function approveFeeNotices(
  input: ApproveFeeNoticesInput,
): Promise<ActionResponse<{ approved: number; dispatched: number }>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    );
    const supabase = await createSupabaseServerClient();

    const parsed = approveFeeNoticesSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const now = new Date().toISOString();

    const { data: notices, error } = await supabase
      .from("fee_notices")
      .update({
        status: "sent",
        approved_by: context.user.id,
        approved_at: now,
        sent_at: now,
      })
      .in("id", parsed.data.notice_ids)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select("id");

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const approvedIds = (notices ?? []).map((n) => n.id as string);

    // Log approval
    for (const id of approvedIds) {
      await logAudit({
        context,
        action: AuditActions.FEE_NOTICE_APPROVED,
        entityType: "fee_notice",
        entityId: id,
        metadata: { batch_size: approvedIds.length },
      });
    }

    // Dispatch each notice
    let dispatched = 0;
    for (const id of approvedIds) {
      dispatchNotice(id, context.tenant.id).catch(() => {});
      dispatched++;
    }

    return success({ approved: approvedIds.length, dispatched });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DISPATCH (internal - sends via configured channels)
// ============================================================

async function dispatchNotice(
  noticeId: string,
  tenantId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();

  // Load notice with full details
  const { data: notice } = await admin
    .from("fee_notices")
    .select(
      `
      *,
      student:students(id, first_name, last_name),
      guardian:guardians(id, user_id, relationship, user:users(id, first_name, last_name, email, phone)),
      invoice:invoices(id, invoice_number, stripe_hosted_url)
    `,
    )
    .eq("id", noticeId)
    .single();

  if (!notice) return;

  // Load config
  const { data: config } = await admin
    .from("fee_notice_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!config) return;

  // Load tenant name
  const { data: tenant } = await admin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const schoolName = (tenant?.name as string) ?? "School";
  const enabledChannels = (config.enabled_channels ?? []) as FeeNoticeChannel[];
  const includePaymentLink = config.include_payment_link as boolean;

  const guardianArr = Array.isArray(notice.guardian)
    ? notice.guardian
    : [notice.guardian];
  const guardian = guardianArr[0] as {
    id: string;
    user_id: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
    } | null;
  } | null;

  const studentArr = Array.isArray(notice.student)
    ? notice.student
    : [notice.student];
  const student = studentArr[0] as {
    id: string;
    first_name: string;
    last_name: string;
  } | null;

  const invoiceArr = Array.isArray(notice.invoice)
    ? notice.invoice
    : [notice.invoice];
  const invoiceData = invoiceArr[0] as {
    id: string;
    invoice_number: string;
    stripe_hosted_url: string | null;
  } | null;

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Student";

  // Determine which template to use
  const trigger = notice.trigger_type as string;
  let templateText: string | null = null;
  if (trigger === "invoice_sent")
    templateText = config.template_invoice_sent as string | null;
  else if (trigger === "invoice_overdue")
    templateText = config.template_invoice_overdue as string | null;
  else if (trigger === "payment_received")
    templateText = config.template_payment_received as string | null;
  else if (trigger === "payment_failed")
    templateText = config.template_payment_failed as string | null;
  else templateText = config.template_reminder as string | null;

  // Use custom_message override if present
  const finalTemplate =
    (notice.custom_message as string | null) || templateText;

  const body = buildNoticeBody(finalTemplate, {
    student_name: studentName,
    invoice_number: notice.invoice_number as string,
    amount: formatCents(notice.amount_cents as number),
    due_date: notice.due_date as string,
    trigger_type: trigger,
    payment_link: includePaymentLink
      ? (invoiceData?.stripe_hosted_url ?? null)
      : null,
    school_name: schoolName,
  });

  const subject = `${triggerLabel(trigger)} - ${notice.invoice_number as string} (${studentName})`;

  // Dispatch per channel
  for (const channel of enabledChannels) {
    const deliveryRow: Record<string, unknown> = {
      fee_notice_id: noticeId,
      channel,
      status: "pending",
    };

    if (channel === "email") {
      const email = guardian?.user?.email;
      deliveryRow.recipient_address = email ?? null;

      if (email) {
        try {
          const result = await sendTransactionalEmail({
            to: email,
            subject,
            text: body,
            html: `<div style="font-family:sans-serif;white-space:pre-wrap;">${body.replace(/\n/g, "<br>")}</div>`,
            fromName: schoolName,
          });

          if (result.error) {
            deliveryRow.status = "failed";
            deliveryRow.error_message = result.error;
            deliveryRow.failed_at = new Date().toISOString();
          } else {
            deliveryRow.status = "sent";
            deliveryRow.sent_at = new Date().toISOString();
            deliveryRow.email_message_id = result.data?.id ?? null;
          }
        } catch (err) {
          deliveryRow.status = "failed";
          deliveryRow.error_message =
            err instanceof Error ? err.message : "Email send failed";
          deliveryRow.failed_at = new Date().toISOString();
        }
      } else {
        deliveryRow.status = "skipped";
        deliveryRow.error_message = "No email address on file";
      }
    } else if (channel === "sms") {
      const phone = guardian?.user?.phone ?? null;
      deliveryRow.recipient_address = phone;

      if (phone) {
        // Insert SMS message row via sms_messages table
        try {
          const { data: smsMsg, error: smsErr } = await admin
            .from("sms_messages")
            .insert({
              tenant_id: tenantId,
              recipient_phone: phone,
              recipient_name: guardian?.user
                ? `${guardian.user.first_name} ${guardian.user.last_name}`
                : null,
              student_id: notice.student_id,
              guardian_id: notice.guardian_id,
              message_body: body.substring(0, 1600), // SMS char limit safety
              message_type: "reminder",
              status: "pending",
              metadata: { fee_notice_id: noticeId },
            })
            .select("id")
            .single();

          if (smsErr) {
            deliveryRow.status = "failed";
            deliveryRow.error_message = smsErr.message;
            deliveryRow.failed_at = new Date().toISOString();
          } else {
            deliveryRow.status = "sent";
            deliveryRow.sent_at = new Date().toISOString();
            deliveryRow.sms_message_id = smsMsg?.id ?? null;
          }
        } catch (err) {
          deliveryRow.status = "failed";
          deliveryRow.error_message =
            err instanceof Error ? err.message : "SMS queue failed";
          deliveryRow.failed_at = new Date().toISOString();
        }
      } else {
        deliveryRow.status = "skipped";
        deliveryRow.error_message = "No phone number on file";
      }
    } else if (channel === "push") {
      // Create a push notification dispatch targeting the guardian's user
      const userId = guardian?.user?.id ?? null;

      if (userId) {
        try {
          const { data: dispatch, error: pushErr } = await admin
            .from("notification_dispatches")
            .insert({
              tenant_id: tenantId,
              created_by: notice.queued_by ?? userId,
              topic: "billing",
              title: subject,
              body: body.substring(0, 500),
              data: { invoice_id: notice.invoice_id, fee_notice_id: noticeId },
              target_type: "specific_users",
              target_user_ids: [userId],
              status: "sent",
              sent_at: new Date().toISOString(),
              recipient_count: 1,
            })
            .select("id")
            .single();

          if (pushErr) {
            deliveryRow.status = "failed";
            deliveryRow.error_message = pushErr.message;
            deliveryRow.failed_at = new Date().toISOString();
          } else {
            deliveryRow.status = "sent";
            deliveryRow.sent_at = new Date().toISOString();
            deliveryRow.push_dispatch_id = dispatch?.id ?? null;
          }
        } catch (err) {
          deliveryRow.status = "failed";
          deliveryRow.error_message =
            err instanceof Error ? err.message : "Push dispatch failed";
          deliveryRow.failed_at = new Date().toISOString();
        }
      } else {
        deliveryRow.status = "skipped";
        deliveryRow.error_message = "No user account linked to guardian";
      }
    }

    // Insert delivery row
    await admin.from("fee_notice_deliveries").insert(deliveryRow);
  }

  // Update notice overall status based on deliveries
  const { data: deliveries } = await admin
    .from("fee_notice_deliveries")
    .select("status")
    .eq("fee_notice_id", noticeId);

  const statuses = (deliveries ?? []).map((d) => d.status as string);
  const hasAnySent =
    statuses.includes("sent") || statuses.includes("delivered");
  const allFailed = statuses.every((s) => s === "failed" || s === "skipped");

  const overallStatus = allFailed ? "failed" : hasAnySent ? "sent" : "pending";

  await admin
    .from("fee_notices")
    .update({ status: overallStatus, sent_at: new Date().toISOString() })
    .eq("id", noticeId);
}

// ============================================================
// LIST & QUERY
// ============================================================

export async function listFeeNotices(
  filter?: ListFeeNoticesFilter,
): Promise<ActionResponse<FeeNoticeWithDetails[]>> {
  try {
    await requirePermission(Permissions.VIEW_FEE_NOTICE_COMMS);
    const supabase = await createSupabaseServerClient();

    const parsed = filter
      ? listFeeNoticesFilterSchema.safeParse(filter)
      : { success: true as const, data: {} as ListFeeNoticesFilter };
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid filter",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const f = parsed.data;
    let query = supabase
      .from("fee_notices")
      .select(NOTICE_SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(f.limit ?? 50);

    if (f.status) query = query.eq("status", f.status);
    if (f.trigger_type) query = query.eq("trigger_type", f.trigger_type);
    if (f.student_id) query = query.eq("student_id", f.student_id);
    if (f.guardian_id) query = query.eq("guardian_id", f.guardian_id);
    if (f.invoice_id) query = query.eq("invoice_id", f.invoice_id);
    if (f.offset) query = query.range(f.offset, f.offset + (f.limit ?? 50) - 1);

    const { data, error } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    return success((data ?? []) as FeeNoticeWithDetails[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

export async function getFeeNoticeDetails(
  noticeId: string,
): Promise<ActionResponse<FeeNoticeWithDetails>> {
  try {
    await requirePermission(Permissions.VIEW_FEE_NOTICE_COMMS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("fee_notices")
      .select(NOTICE_SELECT)
      .eq("id", noticeId)
      .is("deleted_at", null)
      .single();

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);
    if (!data) return failure("Notice not found", ErrorCodes.NOT_FOUND);

    return success(data as FeeNoticeWithDetails);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getFeeNoticeCommsDashboard(): Promise<
  ActionResponse<FeeNoticeCommsData>
> {
  try {
    await requirePermission(Permissions.VIEW_FEE_NOTICE_COMMS);
    const supabase = await createSupabaseServerClient();

    // Config
    const { data: config } = await supabase
      .from("fee_notice_configs")
      .select("*")
      .maybeSingle();

    // Recent notices (last 20)
    const { data: recent } = await supabase
      .from("fee_notices")
      .select(NOTICE_SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    // Pending approval
    const { data: pending } = await supabase
      .from("fee_notices")
      .select(NOTICE_SELECT)
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Stats: count by status
    const { count: totalSent } = await supabase
      .from("fee_notices")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .is("deleted_at", null);

    const { count: totalPending } = await supabase
      .from("fee_notices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null);

    const { count: totalFailed } = await supabase
      .from("fee_notices")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .is("deleted_at", null);

    // By trigger
    const triggerTypes = [
      "invoice_sent",
      "invoice_overdue",
      "payment_received",
      "payment_failed",
      "reminder_1",
      "reminder_2",
      "reminder_3",
    ] as const;
    const byTrigger: { trigger: string; count: number }[] = [];
    for (const t of triggerTypes) {
      const { count } = await supabase
        .from("fee_notices")
        .select("id", { count: "exact", head: true })
        .eq("trigger_type", t)
        .is("deleted_at", null);
      if ((count ?? 0) > 0) byTrigger.push({ trigger: t, count: count ?? 0 });
    }

    // By channel (from deliveries)
    const channels: FeeNoticeChannel[] = ["email", "sms", "push"];
    const byChannel: {
      channel: FeeNoticeChannel;
      sent: number;
      delivered: number;
      failed: number;
    }[] = [];
    for (const ch of channels) {
      const { count: sent } = await supabase
        .from("fee_notice_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", ch)
        .eq("status", "sent");
      const { count: delivered } = await supabase
        .from("fee_notice_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", ch)
        .eq("status", "delivered");
      const { count: failed } = await supabase
        .from("fee_notice_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", ch)
        .eq("status", "failed");
      byChannel.push({
        channel: ch,
        sent: sent ?? 0,
        delivered: delivered ?? 0,
        failed: failed ?? 0,
      });
    }

    // Overdue invoices without a notice
    const today = new Date().toISOString().split("T")[0];
    const { count: overdueWithout } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "overdue", "partially_paid"])
      .lt("due_date", today)
      .is("deleted_at", null)
      .not(
        "id",
        "in",
        `(${
          (
            await supabase
              .from("fee_notices")
              .select("invoice_id")
              .eq("trigger_type", "invoice_overdue")
              .is("deleted_at", null)
          ).data
            ?.map((n) => `"${n.invoice_id}"`)
            .join(",") || "''"
        })`,
      );

    return success({
      config: config as FeeNoticeConfig | null,
      recent_notices: (recent ?? []) as FeeNoticeWithDetails[],
      stats: {
        total_sent: totalSent ?? 0,
        total_pending: totalPending ?? 0,
        total_failed: totalFailed ?? 0,
        by_trigger: byTrigger as {
          trigger: (typeof triggerTypes)[number];
          count: number;
        }[],
        by_channel: byChannel,
      },
      pending_approval: (pending ?? []) as FeeNoticeWithDetails[],
      overdue_invoices_without_notice: overdueWithout ?? 0,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// CANCEL NOTICE
// ============================================================

export async function cancelFeeNotice(
  noticeId: string,
): Promise<ActionResponse<FeeNotice>> {
  try {
    const context = await requirePermission(
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    );
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("fee_notices")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", noticeId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select()
      .single();

    if (error || !data) {
      return failure("Notice not found or already sent", ErrorCodes.NOT_FOUND);
    }

    await logAudit({
      context,
      action: AuditActions.FEE_NOTICE_FAILED,
      entityType: "fee_notice",
      entityId: noticeId,
      metadata: { reason: "manually_cancelled" },
    });

    return success(data as FeeNotice);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}
