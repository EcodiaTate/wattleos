// src/lib/validations/debt.ts
//
// ============================================================
// WattleOS V2 - Debt Management Validations
// ============================================================

import { z } from "zod";

// ── Collection Stage ──────────────────────────────────────────

export const createDebtStageSchema = z.object({
  invoice_id: z.string().uuid(),
  internal_notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  assigned_to_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
});
export type CreateDebtStageInput = z.infer<typeof createDebtStageSchema>;

export const advanceDebtStageSchema = z.object({
  collection_stage_id: z.string().uuid(),
  stage: z.enum([
    "reminder_1_sent",
    "reminder_2_sent",
    "reminder_3_sent",
    "escalated",
    "payment_plan",
    "referred",
    "written_off",
    "resolved",
  ]),
  internal_notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type AdvanceDebtStageInput = z.infer<typeof advanceDebtStageSchema>;

export const updateDebtStageNotesSchema = z.object({
  collection_stage_id: z.string().uuid(),
  internal_notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  assigned_to_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
});
export type UpdateDebtStageNotesInput = z.infer<
  typeof updateDebtStageNotesSchema
>;

export const listDebtStagesSchema = z.object({
  stage: z
    .enum([
      "overdue",
      "reminder_1_sent",
      "reminder_2_sent",
      "reminder_3_sent",
      "escalated",
      "payment_plan",
      "referred",
      "written_off",
      "resolved",
    ])
    .nullish()
    .transform((v) => v ?? null),
  assigned_to_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  include_resolved: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
export type ListDebtStagesInput = z.input<typeof listDebtStagesSchema>;

// ── Payment Plans ─────────────────────────────────────────────

export const createPaymentPlanSchema = z
  .object({
    collection_stage_id: z.string().uuid(),
    invoice_id: z.string().uuid(),
    total_agreed_cents: z.number().int().min(1).max(999_999_99),
    frequency: z.enum(["weekly", "fortnightly", "monthly"]),
    first_due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    installment_count: z.number().int().min(1).max(52),
    guardian_agreed: z.boolean().default(false),
    terms_notes: z
      .string()
      .max(2000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .refine((d) => d.total_agreed_cents > 0, {
    message: "Total must be greater than zero",
    path: ["total_agreed_cents"],
  });
export type CreatePaymentPlanInput = z.infer<typeof createPaymentPlanSchema>;

export const updatePaymentPlanSchema = z.object({
  plan_id: z.string().uuid(),
  guardian_agreed: z
    .boolean()
    .nullish()
    .transform((v) => v ?? null),
  terms_notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  status: z
    .enum(["draft", "active", "cancelled"])
    .nullish()
    .transform((v) => v ?? null),
  cancelled_reason: z
    .string()
    .max(500)
    .nullish()
    .transform((v) => v ?? null),
});
export type UpdatePaymentPlanInput = z.infer<typeof updatePaymentPlanSchema>;

export const recordInstallmentPaymentSchema = z.object({
  item_id: z.string().uuid(),
  paid_amount_cents: z.number().int().min(1),
  payment_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .max(500)
    .nullish()
    .transform((v) => v ?? null),
});
export type RecordInstallmentPaymentInput = z.infer<
  typeof recordInstallmentPaymentSchema
>;

// ── Reminder Sequences ────────────────────────────────────────

export const upsertReminderSequenceSchema = z.object({
  sequence_number: z.number().int().min(1).max(5),
  trigger_days_overdue: z.number().int().min(1).max(365),
  subject_template: z.string().min(1).max(500),
  body_template: z.string().min(1).max(5000),
  send_via_notification: z.boolean().default(true),
  send_via_email: z.boolean().default(true),
  is_active: z.boolean().default(true),
});
export type UpsertReminderSequenceInput = z.infer<
  typeof upsertReminderSequenceSchema
>;

export const sendReminderSchema = z.object({
  collection_stage_id: z.string().uuid(),
  // null = auto-detect from sequence, or provide specific sequence
  sequence_number: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullish()
    .transform((v) => v ?? null),
  send_via_sms: z.boolean().default(false),
});
export type SendReminderInput = z.infer<typeof sendReminderSchema>;

// ── Write-Offs ────────────────────────────────────────────────

export const requestWriteOffSchema = z.object({
  collection_stage_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  write_off_amount_cents: z.number().int().min(1),
  reason: z.enum([
    "uncollectable",
    "hardship",
    "dispute_resolved",
    "deceased",
    "relocated",
    "statute_barred",
    "other",
  ]),
  reason_notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  write_off_reference: z
    .string()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
});
export type RequestWriteOffInput = z.infer<typeof requestWriteOffSchema>;

// ── Export / Filter ───────────────────────────────────────────

export const debtExportSchema = z.object({
  stages: z
    .array(
      z.enum([
        "overdue",
        "reminder_1_sent",
        "reminder_2_sent",
        "reminder_3_sent",
        "escalated",
        "payment_plan",
        "referred",
        "written_off",
        "resolved",
      ]),
    )
    .default([
      "overdue",
      "reminder_1_sent",
      "reminder_2_sent",
      "reminder_3_sent",
      "escalated",
      "referred",
    ]),
  include_resolved: z.boolean().default(false),
});
export type DebtExportInput = z.input<typeof debtExportSchema>;
