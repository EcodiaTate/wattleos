// src/lib/actions/debt.ts
//
// ============================================================
// WattleOS V2 - Debt Management Server Actions
// ============================================================
// Manages the full debt collection lifecycle:
//   1. Auto-create collection stage when invoice becomes overdue
//   2. Send reminder sequences (automated or manual)
//   3. Create + track payment plans with installments
//   4. Escalate / refer to external collection
//   5. Write-off approval workflow (requires approve_write_offs)
//   6. Dashboard aggregates + CSV export
//
// AUDIT: All mutations are logged for financial compliance.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AuditActions, logAudit } from "@/lib/utils/audit";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  DebtCollectionRecord,
  DebtCollectionRecordWithDetails,
  DebtDashboardData,
  DebtPaymentPlan,
  DebtPaymentPlanItem,
  DebtPaymentPlanWithItems,
  DebtReminderLogEntry,
  DebtReminderSequence,
  DebtWriteOff,
} from "@/types/domain";
import {
  advanceDebtStageSchema,
  createDebtStageSchema,
  createPaymentPlanSchema,
  debtExportSchema,
  listDebtStagesSchema,
  recordInstallmentPaymentSchema,
  requestWriteOffSchema,
  sendReminderSchema,
  updateDebtStageNotesSchema,
  updatePaymentPlanSchema,
  upsertReminderSequenceSchema,
  type AdvanceDebtStageInput,
  type CreateDebtStageInput,
  type CreatePaymentPlanInput,
  type DebtExportInput,
  type ListDebtStagesInput,
  type RecordInstallmentPaymentInput,
  type RequestWriteOffInput,
  type SendReminderInput,
  type UpdateDebtStageNotesInput,
  type UpdatePaymentPlanInput,
  type UpsertReminderSequenceInput,
} from "@/lib/validations/debt";

// ── Default reminder sequence templates ──────────────────────
const DEFAULT_REMINDER_SEQUENCES = [
  {
    sequence_number: 1,
    trigger_days_overdue: 7,
    subject_template:
      "Payment overdue: Invoice {{invoice_number}} for {{student_name}}",
    body_template: `Dear {{guardian_name}},

We wanted to let you know that Invoice {{invoice_number}} for {{student_name}} (amount: {{amount_owing}}) was due on {{due_date}} and remains outstanding.

If you have already made payment, please disregard this notice. Otherwise, please arrange payment at your earliest convenience.

If you have any questions or would like to discuss payment options, please contact our office.

Regards,
{{school_name}}`,
    send_via_notification: true,
    send_via_email: true,
    is_active: true,
  },
  {
    sequence_number: 2,
    trigger_days_overdue: 14,
    subject_template: "Second notice: Invoice {{invoice_number}} overdue",
    body_template: `Dear {{guardian_name}},

This is a second notice that Invoice {{invoice_number}} for {{student_name}} (amount: {{amount_owing}}) remains outstanding as of {{due_date}}.

We encourage you to contact our office to discuss payment or explore a payment plan arrangement.

Regards,
{{school_name}}`,
    send_via_notification: true,
    send_via_email: true,
    is_active: true,
  },
  {
    sequence_number: 3,
    trigger_days_overdue: 30,
    subject_template:
      "Final notice: Invoice {{invoice_number}} - action required",
    body_template: `Dear {{guardian_name}},

This is a final courtesy notice regarding Invoice {{invoice_number}} for {{student_name}} (amount: {{amount_owing}}), which remains unpaid.

If payment or a payment plan is not arranged within 7 days, this account may be escalated. Please contact us immediately.

Regards,
{{school_name}}`,
    send_via_notification: true,
    send_via_email: true,
    is_active: true,
  },
];

// ── Helper: days overdue ──────────────────────────────────────
function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

// ── Helper: render template ───────────────────────────────────
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => vars[key] ?? `{{${key}}}`,
  );
}

// ── Helper: format cents as AUD string ───────────────────────
function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getDebtDashboard(): Promise<
  ActionResponse<DebtDashboardData>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Active collection stages (not resolved/written-off)
    const { data: stages, error: stagesErr } = await supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, outstanding_cents, created_at,
         invoice:invoices(id, invoice_number, total_cents, amount_paid_cents, due_date, status, student_id, guardian_id,
           student:students(id, first_name, last_name),
           guardian:guardians(id, user:users(id, first_name, last_name, email))
         ),
         payment_plan:debt_payment_plans(id, status),
         write_off:debt_write_offs(id)`,
      )
      .eq("tenant_id", tenantId)
      .not("stage", "in", "(resolved)")
      .order("created_at", { ascending: false });

    if (stagesErr) {
      return failure("Failed to load debt data", ErrorCodes.DATABASE_ERROR);
    }

    const all = stages ?? [];

    // Compute aging using current invoice due_date
    const buckets = {
      "1_30": { count: 0, total: 0 },
      "31_60": { count: 0, total: 0 },
      "61_90": { count: 0, total: 0 },
      "91_plus": { count: 0, total: 0 },
    };

    all.forEach((s) => {
      const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
      const days = inv ? daysOverdue(inv.due_date) : 0;
      const outstanding = inv
        ? inv.total_cents - inv.amount_paid_cents
        : s.outstanding_cents;
      if (days <= 30) {
        buckets["1_30"].count++;
        buckets["1_30"].total += outstanding;
      } else if (days <= 60) {
        buckets["31_60"].count++;
        buckets["31_60"].total += outstanding;
      } else if (days <= 90) {
        buckets["61_90"].count++;
        buckets["61_90"].total += outstanding;
      } else {
        buckets["91_plus"].count++;
        buckets["91_plus"].total += outstanding;
      }
    });

    // Stage breakdown
    const stageMap = new Map<string, { count: number; total: number }>();
    all.forEach((s) => {
      const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
      const outstanding = inv
        ? inv.total_cents - inv.amount_paid_cents
        : s.outstanding_cents;
      const existing = stageMap.get(s.stage) ?? { count: 0, total: 0 };
      stageMap.set(s.stage, {
        count: existing.count + 1,
        total: existing.total + outstanding,
      });
    });

    // Written off YTD
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: writeOffs } = await supabase
      .from("debt_write_offs")
      .select("write_off_amount_cents")
      .eq("tenant_id", tenantId)
      .gte("created_at", yearStart);

    const writtenOffYtd = (writeOffs ?? []).reduce(
      (sum, w) => sum + w.write_off_amount_cents,
      0,
    );

    // Payment plans with missed installments
    const { data: missedItems } = await supabase
      .from("debt_payment_plan_items")
      .select("plan_id")
      .eq("tenant_id", tenantId)
      .eq("status", "missed");

    const plansAtRisk = new Set((missedItems ?? []).map((i) => i.plan_id)).size;

    const { data: activePlans } = await supabase
      .from("debt_payment_plans")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    // Recently resolved (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: recentlyResolved } = await supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, outstanding_cents, created_at, resolved_at,
         invoice:invoices(id, invoice_number, total_cents, amount_paid_cents, due_date, status,
           student:students(id, first_name, last_name),
           guardian:guardians(id, user:users(id, first_name, last_name, email))
         )`,
      )
      .eq("tenant_id", tenantId)
      .eq("stage", "resolved")
      .gte("resolved_at", thirtyDaysAgo)
      .order("resolved_at", { ascending: false })
      .limit(10);

    const totalOutstandingCents = all.reduce((sum, s) => {
      const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
      return (
        sum +
        (inv ? inv.total_cents - inv.amount_paid_cents : s.outstanding_cents)
      );
    }, 0);

    const dashboard: DebtDashboardData = {
      total_overdue_cents: totalOutstandingCents,
      total_overdue_count: all.length,
      by_stage: Array.from(stageMap.entries()).map(([stage, v]) => ({
        stage: stage as DebtDashboardData["by_stage"][number]["stage"],
        count: v.count,
        total_cents: v.total,
      })),
      aging_buckets: [
        {
          bucket: "1_30",
          count: buckets["1_30"].count,
          total_cents: buckets["1_30"].total,
        },
        {
          bucket: "31_60",
          count: buckets["31_60"].count,
          total_cents: buckets["31_60"].total,
        },
        {
          bucket: "61_90",
          count: buckets["61_90"].count,
          total_cents: buckets["61_90"].total,
        },
        {
          bucket: "91_plus",
          count: buckets["91_plus"].count,
          total_cents: buckets["91_plus"].total,
        },
      ],
      active_payment_plans: (activePlans ?? []).length,
      payment_plans_at_risk: plansAtRisk,
      written_off_ytd_cents: writtenOffYtd,
      recently_resolved: (recentlyResolved ?? []).map(mapStageRow),
    };

    return success(dashboard);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] getDebtDashboard error:", err);
    return failure("Failed to load dashboard", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// COLLECTION STAGES - LIST
// ============================================================

export async function listDebtStages(
  input: ListDebtStagesInput = {},
): Promise<ActionResponse<DebtCollectionRecordWithDetails[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = listDebtStagesSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    let query = supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, outstanding_cents, assigned_to_user_id, internal_notes, resolved_at, resolved_by_user_id, created_at, updated_at, invoice_id, tenant_id,
         invoice:invoices(id, invoice_number, total_cents, amount_paid_cents, due_date, status,
           student:students(id, first_name, last_name),
           guardian:guardians(id, user:users(id, first_name, last_name, email))
         ),
         payment_plan:debt_payment_plans(id, status, frequency, total_agreed_cents, first_due_date),
         write_off:debt_write_offs(id, write_off_amount_cents, reason),
         latest_reminder:debt_reminder_log(id, sent_at, sequence_number, subject)`,
      )
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .range(v.offset, v.offset + v.limit - 1);

    if (v.stage) query = query.eq("stage", v.stage);
    if (v.assigned_to_user_id)
      query = query.eq("assigned_to_user_id", v.assigned_to_user_id);
    if (!v.include_resolved)
      query = query.not("stage", "in", "(resolved,written_off)");

    const { data, error } = await query;
    if (error)
      return failure("Failed to list debt stages", ErrorCodes.DATABASE_ERROR);

    return success((data ?? []).map(mapStageRow));
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] listDebtStages error:", err);
    return failure("Failed to list debt stages", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// COLLECTION STAGES - GET ONE
// ============================================================

export async function getDebtStage(
  collectionStageId: string,
): Promise<ActionResponse<DebtCollectionRecordWithDetails>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, outstanding_cents, assigned_to_user_id, internal_notes, resolved_at, resolved_by_user_id, created_at, updated_at, invoice_id, tenant_id, days_overdue_at_creation,
         invoice:invoices(id, invoice_number, total_cents, amount_paid_cents, due_date, status,
           student:students(id, first_name, last_name),
           guardian:guardians(id, user:users(id, first_name, last_name, email))
         ),
         payment_plan:debt_payment_plans(id, status, frequency, total_agreed_cents, first_due_date, guardian_agreed, terms_notes),
         write_off:debt_write_offs(id, write_off_amount_cents, reason, reason_notes, approved_at, write_off_reference),
         reminders:debt_reminder_log(id, sent_at, sequence_number, subject, reminder_type)`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("id", collectionStageId)
      .single();

    if (error || !data)
      return failure("Debt record not found", ErrorCodes.NOT_FOUND);

    return success(mapStageRow(data));
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to load debt record", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// COLLECTION STAGES - CREATE (mark invoice as in collection)
// ============================================================

export async function createDebtStage(
  input: CreateDebtStageInput,
): Promise<ActionResponse<DebtCollectionRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = createDebtStageSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Load invoice to compute outstanding
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, total_cents, amount_paid_cents, due_date, status")
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.invoice_id)
      .single();

    if (invErr || !invoice) {
      return failure("Invoice not found", ErrorCodes.NOT_FOUND);
    }

    const outstanding = invoice.total_cents - invoice.amount_paid_cents;
    const days = daysOverdue(invoice.due_date);

    const { data, error } = await supabase
      .from("debt_collection_stages")
      .insert({
        tenant_id: context.tenant.id,
        invoice_id: v.invoice_id,
        stage: "overdue",
        days_overdue_at_creation: days,
        outstanding_cents: outstanding,
        assigned_to_user_id: v.assigned_to_user_id,
        internal_notes: v.internal_notes,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "This invoice already has an active collection record",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure("Failed to create debt record", ErrorCodes.DATABASE_ERROR);
    }

    // Mark invoice as overdue if not already
    if (invoice.status !== "overdue") {
      await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .eq("id", v.invoice_id)
        .eq("tenant_id", context.tenant.id);
    }

    await logAudit({
      context,
      action: AuditActions.DEBT_STAGE_CREATED,
      entityType: "debt_collection_stage",
      entityId: data.id,
      metadata: {
        invoice_id: v.invoice_id,
        outstanding_cents: outstanding,
        days_overdue: days,
      },
    });

    return success(data as DebtCollectionRecord);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] createDebtStage error:", err);
    return failure("Failed to create debt record", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// COLLECTION STAGES - ADVANCE STAGE
// ============================================================

export async function advanceDebtStage(
  input: AdvanceDebtStageInput,
): Promise<ActionResponse<DebtCollectionRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = advanceDebtStageSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const resolvedAt =
      v.stage === "resolved" || v.stage === "written_off"
        ? new Date().toISOString()
        : null;
    const resolvedBy =
      v.stage === "resolved" || v.stage === "written_off"
        ? context.user.id
        : null;

    const { data, error } = await supabase
      .from("debt_collection_stages")
      .update({
        stage: v.stage,
        ...(v.internal_notes !== null
          ? { internal_notes: v.internal_notes }
          : {}),
        ...(resolvedAt
          ? { resolved_at: resolvedAt, resolved_by_user_id: resolvedBy }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.collection_stage_id)
      .select()
      .single();

    if (error || !data)
      return failure("Failed to advance stage", ErrorCodes.DATABASE_ERROR);

    const auditAction =
      v.stage === "escalated"
        ? AuditActions.DEBT_ESCALATED
        : v.stage === "referred"
          ? AuditActions.DEBT_REFERRED
          : v.stage === "resolved"
            ? AuditActions.DEBT_RESOLVED
            : AuditActions.DEBT_STAGE_ADVANCED;

    await logAudit({
      context,
      action: auditAction,
      entityType: "debt_collection_stage",
      entityId: v.collection_stage_id,
      metadata: { new_stage: v.stage },
    });

    return success(data as DebtCollectionRecord);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to advance stage", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// COLLECTION STAGES - UPDATE NOTES / ASSIGNMENT
// ============================================================

export async function updateDebtStageNotes(
  input: UpdateDebtStageNotesInput,
): Promise<ActionResponse<DebtCollectionRecord>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = updateDebtStageNotesSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("debt_collection_stages")
      .update({
        ...(v.internal_notes !== null
          ? { internal_notes: v.internal_notes }
          : {}),
        ...(v.assigned_to_user_id !== null
          ? { assigned_to_user_id: v.assigned_to_user_id }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.collection_stage_id)
      .select()
      .single();

    if (error || !data)
      return failure("Failed to update debt record", ErrorCodes.DATABASE_ERROR);

    return success(data as DebtCollectionRecord);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to update debt record", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// REMINDERS - SEND
// ============================================================

export async function sendDebtReminder(
  input: SendReminderInput,
): Promise<ActionResponse<DebtReminderLogEntry>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = sendReminderSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Load collection stage with invoice + guardian
    const { data: stage, error: stageErr } = await supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, invoice_id,
         invoice:invoices(id, invoice_number, total_cents, amount_paid_cents, due_date,
           student:students(id, first_name, last_name),
           guardian:guardians(id, user:users(id, first_name, last_name, email))
         )`,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.collection_stage_id)
      .single();

    if (stageErr || !stage)
      return failure("Collection record not found", ErrorCodes.NOT_FOUND);

    const inv = Array.isArray(stage.invoice) ? stage.invoice[0] : stage.invoice;
    if (!inv) return failure("Invoice not found", ErrorCodes.NOT_FOUND);

    const studentRaw = Array.isArray(inv.student)
      ? inv.student[0]
      : inv.student;
    const guardianRaw = Array.isArray(inv.guardian)
      ? inv.guardian[0]
      : inv.guardian;
    const userRaw = guardianRaw
      ? Array.isArray(guardianRaw.user)
        ? guardianRaw.user[0]
        : guardianRaw.user
      : null;

    // Determine sequence to use
    let seqNum = v.sequence_number;
    if (!seqNum) {
      // Auto-pick next sequence based on current stage
      const stageSeqMap: Record<string, number> = {
        overdue: 1,
        reminder_1_sent: 2,
        reminder_2_sent: 3,
        reminder_3_sent: 3,
      };
      seqNum = stageSeqMap[stage.stage] ?? 1;
    }

    // Load sequence template
    const { data: seqData } = await supabase
      .from("debt_reminder_sequences")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("sequence_number", seqNum)
      .eq("is_active", true)
      .maybeSingle();

    // Fallback to default if not configured yet
    const seq = seqData ?? DEFAULT_REMINDER_SEQUENCES[seqNum - 1];
    if (!seq)
      return failure(
        "No reminder template found for this sequence",
        ErrorCodes.NOT_FOUND,
      );

    const outstanding = inv.total_cents - inv.amount_paid_cents;
    const templateVars: Record<string, string> = {
      invoice_number: inv.invoice_number ?? "",
      student_name: studentRaw
        ? `${studentRaw.first_name} ${studentRaw.last_name}`
        : "your child",
      guardian_name: userRaw
        ? `${userRaw.first_name ?? ""} ${userRaw.last_name ?? ""}`.trim()
        : "Parent/Guardian",
      amount_owing: formatCents(outstanding),
      due_date: new Date(inv.due_date).toLocaleDateString("en-AU"),
      school_name: context.tenant.name ?? "the school",
    };

    const subject = renderTemplate(seq.subject_template, templateVars);
    const body = renderTemplate(seq.body_template, templateVars);

    // Determine new stage after this reminder
    const nextStageMap: Record<number, string> = {
      1: "reminder_1_sent",
      2: "reminder_2_sent",
      3: "reminder_3_sent",
    };
    const nextStage = nextStageMap[seqNum];

    // Log reminder entry
    const { data: logEntry, error: logErr } = await supabase
      .from("debt_reminder_log")
      .insert({
        tenant_id: context.tenant.id,
        collection_stage_id: v.collection_stage_id,
        invoice_id: stage.invoice_id,
        sequence_number: seqNum,
        reminder_type: "manual",
        sent_by_user_id: context.user.id,
        subject,
        body,
        sent_via_notification: seq.send_via_notification,
        sent_via_email: seq.send_via_email,
        sent_via_sms: v.send_via_sms,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logErr || !logEntry)
      return failure("Failed to log reminder", ErrorCodes.DATABASE_ERROR);

    // Advance stage to match reminder number
    if (nextStage) {
      await supabase
        .from("debt_collection_stages")
        .update({ stage: nextStage, updated_at: new Date().toISOString() })
        .eq("id", v.collection_stage_id)
        .eq("tenant_id", context.tenant.id);
    }

    await logAudit({
      context,
      action: AuditActions.DEBT_REMINDER_MANUAL,
      entityType: "debt_collection_stage",
      entityId: v.collection_stage_id,
      metadata: { sequence_number: seqNum, invoice_id: stage.invoice_id },
    });

    return success(logEntry as DebtReminderLogEntry);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] sendDebtReminder error:", err);
    return failure("Failed to send reminder", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// REMINDER SEQUENCES - LIST
// ============================================================

export async function listReminderSequences(): Promise<
  ActionResponse<DebtReminderSequence[]>
> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("debt_reminder_sequences")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .order("sequence_number");

    if (error)
      return failure(
        "Failed to load reminder sequences",
        ErrorCodes.DATABASE_ERROR,
      );

    // If no sequences configured yet, return the defaults without persisting
    if (!data || data.length === 0) {
      return success(DEFAULT_REMINDER_SEQUENCES as DebtReminderSequence[]);
    }

    return success(data as DebtReminderSequence[]);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure(
      "Failed to load reminder sequences",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// REMINDER SEQUENCES - UPSERT
// ============================================================

export async function upsertReminderSequence(
  input: UpsertReminderSequenceInput,
): Promise<ActionResponse<DebtReminderSequence>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = upsertReminderSequenceSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("debt_reminder_sequences")
      .upsert(
        {
          tenant_id: context.tenant.id,
          ...v,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,sequence_number" },
      )
      .select()
      .single();

    if (error || !data)
      return failure(
        "Failed to save reminder sequence",
        ErrorCodes.DATABASE_ERROR,
      );

    return success(data as DebtReminderSequence);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure(
      "Failed to save reminder sequence",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// PAYMENT PLANS - CREATE
// ============================================================

export async function createPaymentPlan(
  input: CreatePaymentPlanInput,
): Promise<ActionResponse<DebtPaymentPlanWithItems>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = createPaymentPlanSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Create plan
    const { data: plan, error: planErr } = await supabase
      .from("debt_payment_plans")
      .insert({
        tenant_id: context.tenant.id,
        collection_stage_id: v.collection_stage_id,
        invoice_id: v.invoice_id,
        total_agreed_cents: v.total_agreed_cents,
        frequency: v.frequency,
        status: "active",
        created_by_user_id: context.user.id,
        guardian_agreed: v.guardian_agreed,
        guardian_agreed_at: v.guardian_agreed ? new Date().toISOString() : null,
        terms_notes: v.terms_notes,
        first_due_date: v.first_due_date,
      })
      .select()
      .single();

    if (planErr) {
      if (planErr.code === "23505") {
        return failure(
          "A payment plan already exists for this invoice",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(
        "Failed to create payment plan",
        ErrorCodes.DATABASE_ERROR,
      );
    }

    // Generate installment schedule
    const installmentAmount = Math.floor(
      v.total_agreed_cents / v.installment_count,
    );
    const remainder =
      v.total_agreed_cents - installmentAmount * v.installment_count;

    const freqDays: Record<string, number> = {
      weekly: 7,
      fortnightly: 14,
      monthly: 30,
    };
    const dayStep = freqDays[v.frequency];

    const items: Array<{
      tenant_id: string;
      plan_id: string;
      installment_number: number;
      due_date: string;
      amount_cents: number;
      status: string;
    }> = [];

    const firstDue = new Date(v.first_due_date);
    for (let i = 0; i < v.installment_count; i++) {
      const dueDate = new Date(firstDue);
      if (v.frequency === "monthly") {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else {
        dueDate.setDate(dueDate.getDate() + i * dayStep);
      }
      items.push({
        tenant_id: context.tenant.id,
        plan_id: plan.id,
        installment_number: i + 1,
        due_date: dueDate.toISOString().split("T")[0],
        // Last installment absorbs the remainder
        amount_cents:
          i === v.installment_count - 1
            ? installmentAmount + remainder
            : installmentAmount,
        status: "pending",
      });
    }

    const { data: insertedItems, error: itemsErr } = await supabase
      .from("debt_payment_plan_items")
      .insert(items)
      .select();

    if (itemsErr)
      return failure(
        "Failed to create installment schedule",
        ErrorCodes.DATABASE_ERROR,
      );

    // Advance collection stage to payment_plan
    await supabase
      .from("debt_collection_stages")
      .update({ stage: "payment_plan", updated_at: new Date().toISOString() })
      .eq("id", v.collection_stage_id)
      .eq("tenant_id", context.tenant.id);

    await logAudit({
      context,
      action: AuditActions.DEBT_PLAN_CREATED,
      entityType: "debt_payment_plan",
      entityId: plan.id,
      metadata: {
        invoice_id: v.invoice_id,
        total_agreed_cents: v.total_agreed_cents,
        installment_count: v.installment_count,
        frequency: v.frequency,
      },
    });

    const typedItems = (insertedItems ?? []) as DebtPaymentPlanItem[];
    const totalPaid = typedItems.reduce((s, i) => s + i.paid_amount_cents, 0);
    const nextDue = typedItems.find((i) => i.status === "pending") ?? null;

    return success({
      ...(plan as DebtPaymentPlan),
      items: typedItems,
      total_paid_cents: totalPaid,
      total_remaining_cents: v.total_agreed_cents - totalPaid,
      next_due_item: nextDue,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] createPaymentPlan error:", err);
    return failure("Failed to create payment plan", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// PAYMENT PLANS - GET (with items)
// ============================================================

export async function getPaymentPlan(
  planId: string,
): Promise<ActionResponse<DebtPaymentPlanWithItems>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const { data: plan, error: planErr } = await supabase
      .from("debt_payment_plans")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("id", planId)
      .single();

    if (planErr || !plan)
      return failure("Payment plan not found", ErrorCodes.NOT_FOUND);

    const { data: items, error: itemsErr } = await supabase
      .from("debt_payment_plan_items")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("plan_id", planId)
      .order("installment_number");

    if (itemsErr)
      return failure("Failed to load installments", ErrorCodes.DATABASE_ERROR);

    const typedItems = (items ?? []) as DebtPaymentPlanItem[];
    const totalPaid = typedItems.reduce((s, i) => s + i.paid_amount_cents, 0);
    const nextDue = typedItems.find((i) => i.status === "pending") ?? null;

    return success({
      ...(plan as DebtPaymentPlan),
      items: typedItems,
      total_paid_cents: totalPaid,
      total_remaining_cents: plan.total_agreed_cents - totalPaid,
      next_due_item: nextDue,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to load payment plan", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// PAYMENT PLANS - UPDATE (status / terms)
// ============================================================

export async function updatePaymentPlan(
  input: UpdatePaymentPlanInput,
): Promise<ActionResponse<DebtPaymentPlan>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = updatePaymentPlanSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (v.guardian_agreed !== null) {
      updates.guardian_agreed = v.guardian_agreed;
      if (v.guardian_agreed)
        updates.guardian_agreed_at = new Date().toISOString();
    }
    if (v.terms_notes !== null) updates.terms_notes = v.terms_notes;
    if (v.status !== null) {
      updates.status = v.status;
      if (v.status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancelled_reason = v.cancelled_reason;
      }
    }

    const { data, error } = await supabase
      .from("debt_payment_plans")
      .update(updates)
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.plan_id)
      .select()
      .single();

    if (error || !data)
      return failure(
        "Failed to update payment plan",
        ErrorCodes.DATABASE_ERROR,
      );

    const auditAction =
      v.status === "cancelled"
        ? AuditActions.DEBT_PLAN_CANCELLED
        : AuditActions.DEBT_PLAN_UPDATED;

    await logAudit({
      context,
      action: auditAction,
      entityType: "debt_payment_plan",
      entityId: v.plan_id,
      metadata: { status: v.status },
    });

    return success(data as DebtPaymentPlan);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to update payment plan", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// PAYMENT PLANS - RECORD INSTALLMENT PAYMENT
// ============================================================

export async function recordInstallmentPayment(
  input: RecordInstallmentPaymentInput,
): Promise<ActionResponse<DebtPaymentPlanItem>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = recordInstallmentPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("debt_payment_plan_items")
      .update({
        status: "paid",
        paid_amount_cents: v.paid_amount_cents,
        paid_at: new Date().toISOString(),
        payment_id: v.payment_id,
        notes: v.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", context.tenant.id)
      .eq("id", v.item_id)
      .select()
      .single();

    if (error || !data)
      return failure("Failed to record payment", ErrorCodes.DATABASE_ERROR);

    // Check if all installments are now paid → complete the plan
    const { data: remainingItems } = await supabase
      .from("debt_payment_plan_items")
      .select("id, status")
      .eq("plan_id", data.plan_id)
      .eq("tenant_id", context.tenant.id)
      .not("status", "in", "(paid,waived)");

    if (!remainingItems || remainingItems.length === 0) {
      await supabase
        .from("debt_payment_plans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.plan_id)
        .eq("tenant_id", context.tenant.id);

      // Resolve the collection stage
      await supabase
        .from("debt_collection_stages")
        .update({
          stage: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by_user_id: context.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("collection_stage_id", data.plan_id) // linked via plan
        .eq("tenant_id", context.tenant.id);

      await logAudit({
        context,
        action: AuditActions.DEBT_PLAN_COMPLETED,
        entityType: "debt_payment_plan",
        entityId: data.plan_id,
        metadata: {},
      });
    }

    await logAudit({
      context,
      action: AuditActions.DEBT_INSTALLMENT_PAID,
      entityType: "debt_payment_plan_item",
      entityId: v.item_id,
      metadata: {
        plan_id: data.plan_id,
        paid_amount_cents: v.paid_amount_cents,
      },
    });

    return success(data as DebtPaymentPlanItem);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to record payment", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// WRITE-OFFS - REQUEST (logged, then approved separately)
// ============================================================

export async function requestWriteOff(
  input: RequestWriteOffInput,
): Promise<ActionResponse<DebtWriteOff>> {
  try {
    // Requestor only needs manage_debt_management; approver needs approve_write_offs
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = requestWriteOffSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    // Check if user also has approve_write_offs - if so, auto-approve
    const canAutoApprove =
      context.permissions?.includes(Permissions.APPROVE_WRITE_OFFS) ?? false;

    const { data, error } = await supabase
      .from("debt_write_offs")
      .insert({
        tenant_id: context.tenant.id,
        collection_stage_id: v.collection_stage_id,
        invoice_id: v.invoice_id,
        write_off_amount_cents: v.write_off_amount_cents,
        reason: v.reason,
        reason_notes: v.reason_notes,
        approved_by_user_id: context.user.id, // auto-approve if they have permission
        approved_at: new Date().toISOString(),
        requested_by_user_id: context.user.id,
        write_off_reference: v.write_off_reference,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return failure(
          "A write-off already exists for this invoice",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      // Permission denied on approver FK if user doesn't have approve_write_offs
      if (error.code === "42501" || !canAutoApprove) {
        return failure(
          "You do not have permission to approve write-offs. Please request approval from an authorised user.",
          ErrorCodes.FORBIDDEN,
        );
      }
      return failure("Failed to process write-off", ErrorCodes.DATABASE_ERROR);
    }

    // Advance stage to written_off
    await supabase
      .from("debt_collection_stages")
      .update({
        stage: "written_off",
        resolved_at: new Date().toISOString(),
        resolved_by_user_id: context.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", v.collection_stage_id)
      .eq("tenant_id", context.tenant.id);

    // Void the invoice
    await supabase
      .from("invoices")
      .update({ status: "void", voided_at: new Date().toISOString() })
      .eq("id", v.invoice_id)
      .eq("tenant_id", context.tenant.id);

    await logAudit({
      context,
      action: AuditActions.DEBT_WRITE_OFF_APPROVED,
      entityType: "debt_write_off",
      entityId: data.id,
      metadata: {
        invoice_id: v.invoice_id,
        write_off_amount_cents: v.write_off_amount_cents,
        reason: v.reason,
        reference: v.write_off_reference,
      },
    });

    return success(data as DebtWriteOff);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] requestWriteOff error:", err);
    return failure("Failed to process write-off", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// EXPORT - CSV
// ============================================================

export async function exportDebtRegister(
  input: DebtExportInput = {},
): Promise<ActionResponse<string>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const parsed = debtExportSchema.safeParse(input);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message ?? "Invalid input",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    const v = parsed.data;

    const { data, error } = await supabase
      .from("debt_collection_stages")
      .select(
        `id, stage, outstanding_cents, created_at, updated_at,
         invoice:invoices(invoice_number, total_cents, amount_paid_cents, due_date,
           student:students(first_name, last_name),
           guardian:guardians(user:users(first_name, last_name, email))
         )`,
      )
      .eq("tenant_id", context.tenant.id)
      .in("stage", v.stages)
      .order("created_at", { ascending: false });

    if (error)
      return failure(
        "Failed to export debt register",
        ErrorCodes.DATABASE_ERROR,
      );

    const rows = (data ?? []).map((s) => {
      const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
      const student =
        inv && (Array.isArray(inv.student) ? inv.student[0] : inv.student);
      const guardian =
        inv && (Array.isArray(inv.guardian) ? inv.guardian[0] : inv.guardian);
      const user =
        guardian &&
        (Array.isArray(guardian.user) ? guardian.user[0] : guardian.user);
      const outstanding = inv
        ? inv.total_cents - inv.amount_paid_cents
        : s.outstanding_cents;
      const days = inv ? daysOverdue(inv.due_date) : 0;
      return [
        inv?.invoice_number ?? "",
        student ? `${student.first_name} ${student.last_name}` : "",
        user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "",
        user?.email ?? "",
        inv?.due_date ?? "",
        days,
        formatCents(outstanding),
        s.stage,
        new Date(s.created_at).toLocaleDateString("en-AU"),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const header = [
      "Invoice #",
      "Student",
      "Guardian",
      "Email",
      "Due Date",
      "Days Overdue",
      "Outstanding",
      "Stage",
      "In Collection Since",
    ].join(",");
    const csv = [header, ...rows].join("\n");

    await logAudit({
      context,
      action: AuditActions.DEBT_EXPORTED,
      entityType: "debt_register",
      entityId: context.tenant.id,
      metadata: { row_count: rows.length, stages: v.stages },
    });

    return success(csv);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to export debt register", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// REMINDER LOG - LIST for a stage
// ============================================================

export async function listReminderLog(
  collectionStageId: string,
): Promise<ActionResponse<DebtReminderLogEntry[]>> {
  try {
    const context = await requirePermission(Permissions.VIEW_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("debt_reminder_log")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("collection_stage_id", collectionStageId)
      .order("sent_at", { ascending: false });

    if (error)
      return failure("Failed to load reminder log", ErrorCodes.DATABASE_ERROR);

    return success((data ?? []) as DebtReminderLogEntry[]);
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    return failure("Failed to load reminder log", ErrorCodes.DATABASE_ERROR);
  }
}

// ============================================================
// AUTO-SCAN: Mark overdue invoices and create stages
// ============================================================
// Called by a cron job or from the dashboard "sync" button.

export async function syncOverdueInvoices(): Promise<
  ActionResponse<{ created: number; already_tracked: number }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_DEBT_MANAGEMENT);
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().split("T")[0];

    // Find invoices that are past due and not already in collection
    const { data: overdueInvoices, error } = await supabase
      .from("invoices")
      .select("id, total_cents, amount_paid_cents, due_date, status")
      .eq("tenant_id", context.tenant.id)
      .in("status", ["sent", "partially_paid"])
      .lt("due_date", today);

    if (error)
      return failure("Failed to query invoices", ErrorCodes.DATABASE_ERROR);

    const { data: existingStages } = await supabase
      .from("debt_collection_stages")
      .select("invoice_id")
      .eq("tenant_id", context.tenant.id);

    const trackedIds = new Set((existingStages ?? []).map((s) => s.invoice_id));

    const toCreate = (overdueInvoices ?? []).filter(
      (inv) => !trackedIds.has(inv.id),
    );

    let created = 0;
    for (const inv of toCreate) {
      const outstanding = inv.total_cents - inv.amount_paid_cents;
      if (outstanding <= 0) continue;

      const days = daysOverdue(inv.due_date);
      const { error: insertErr } = await supabase
        .from("debt_collection_stages")
        .insert({
          tenant_id: context.tenant.id,
          invoice_id: inv.id,
          stage: "overdue",
          days_overdue_at_creation: days,
          outstanding_cents: outstanding,
        });

      if (!insertErr) {
        // Mark invoice overdue
        await supabase
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", inv.id)
          .eq("tenant_id", context.tenant.id);
        created++;
      }
    }

    if (created > 0) {
      await logAudit({
        context,
        action: AuditActions.DEBT_STAGE_CREATED,
        entityType: "debt_collection_stage",
        entityId: context.tenant.id,
        metadata: { created_count: created, scan_date: today },
      });
    }

    return success({ created, already_tracked: trackedIds.size });
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return failure(err.message, ErrorCodes.FORBIDDEN);
    }
    console.error("[debt] syncOverdueInvoices error:", err);
    return failure(
      "Failed to sync overdue invoices",
      ErrorCodes.DATABASE_ERROR,
    );
  }
}

// ============================================================
// HELPER: Map raw DB row to DebtCollectionRecordWithDetails
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStageRow(s: any): DebtCollectionRecordWithDetails {
  const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
  const studentRaw =
    inv && (Array.isArray(inv.student) ? inv.student[0] : inv.student);
  const guardianRaw =
    inv && (Array.isArray(inv.guardian) ? inv.guardian[0] : inv.guardian);
  const userRaw =
    guardianRaw &&
    (Array.isArray(guardianRaw.user) ? guardianRaw.user[0] : guardianRaw.user);

  const planRaw = Array.isArray(s.payment_plan)
    ? s.payment_plan[0]
    : s.payment_plan;
  const writeOffRaw = Array.isArray(s.write_off) ? s.write_off[0] : s.write_off;
  const remindersRaw: unknown[] = Array.isArray(s.latest_reminder)
    ? s.latest_reminder
    : Array.isArray(s.reminders)
      ? s.reminders
      : s.latest_reminder
        ? [s.latest_reminder]
        : [];

  const latestReminder =
    remindersRaw.length > 0
      ? (remindersRaw.sort((a: unknown, b: unknown) => {
          const aDate = (a as { sent_at: string }).sent_at;
          const bDate = (b as { sent_at: string }).sent_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })[0] as DebtReminderLogEntry)
      : null;

  const days = inv ? daysOverdue(inv.due_date) : 0;

  return {
    id: s.id,
    tenant_id: s.tenant_id,
    invoice_id: s.invoice_id,
    stage: s.stage,
    days_overdue_at_creation: s.days_overdue_at_creation ?? 0,
    outstanding_cents: s.outstanding_cents,
    assigned_to_user_id: s.assigned_to_user_id ?? null,
    internal_notes: s.internal_notes ?? null,
    resolved_at: s.resolved_at ?? null,
    resolved_by_user_id: s.resolved_by_user_id ?? null,
    created_at: s.created_at,
    updated_at: s.updated_at,
    invoice: inv
      ? {
          id: inv.id,
          invoice_number: inv.invoice_number,
          total_cents: inv.total_cents,
          amount_paid_cents: inv.amount_paid_cents,
          due_date: inv.due_date,
          status: inv.status,
        }
      : null,
    student: studentRaw
      ? {
          id: studentRaw.id,
          first_name: studentRaw.first_name,
          last_name: studentRaw.last_name,
        }
      : null,
    guardian: guardianRaw
      ? {
          id: guardianRaw.id,
          user: userRaw ?? undefined,
        }
      : null,
    latest_reminder: latestReminder,
    payment_plan: planRaw ?? null,
    write_off: writeOffRaw ?? null,
    days_overdue: days,
  };
}
