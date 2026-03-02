// src/lib/validations/fee-notice-comms.ts
//
// ============================================================
// Zod Schemas - Fee Notice Communications
// ============================================================
// Validates configuration, manual notice creation, and approval
// inputs for billing-triggered comms.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Enum values (must match DB enums + domain types)
// ────────────────────────────────────────────────────────────

const feeNoticeTriggers = [
  "invoice_sent",
  "invoice_overdue",
  "payment_received",
  "payment_failed",
  "reminder_1",
  "reminder_2",
  "reminder_3",
] as const;

const feeNoticeChannels = ["email", "sms", "push"] as const;

// ────────────────────────────────────────────────────────────
// Upsert Config
// ────────────────────────────────────────────────────────────

export const upsertFeeNoticeConfigSchema = z.object({
  enabled_triggers: z
    .array(z.enum(feeNoticeTriggers))
    .min(1, "At least one trigger must be enabled"),

  enabled_channels: z
    .array(z.enum(feeNoticeChannels))
    .min(1, "At least one channel must be enabled"),

  reminder_1_days: z
    .number()
    .int()
    .min(1, "Must be at least 1 day")
    .max(90, "Maximum 90 days"),

  reminder_2_days: z
    .number()
    .int()
    .min(1, "Must be at least 1 day")
    .max(120, "Maximum 120 days"),

  reminder_3_days: z
    .number()
    .int()
    .min(1, "Must be at least 1 day")
    .max(180, "Maximum 180 days"),

  auto_send: z.boolean(),

  include_payment_link: z.boolean(),

  template_invoice_sent: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  template_invoice_overdue: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  template_payment_received: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  template_payment_failed: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  template_reminder: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpsertFeeNoticeConfigInput = z.infer<
  typeof upsertFeeNoticeConfigSchema
>;

// ────────────────────────────────────────────────────────────
// Queue Notice (manual send)
// ────────────────────────────────────────────────────────────

export const queueFeeNoticeSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID"),

  trigger_type: z.enum(feeNoticeTriggers),

  custom_message: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type QueueFeeNoticeInput = z.infer<typeof queueFeeNoticeSchema>;

// ────────────────────────────────────────────────────────────
// Approve Notices (batch)
// ────────────────────────────────────────────────────────────

export const approveFeeNoticesSchema = z.object({
  notice_ids: z
    .array(z.string().uuid())
    .min(1, "At least one notice must be selected")
    .max(100, "Maximum 100 notices per batch"),
});

export type ApproveFeeNoticesInput = z.infer<typeof approveFeeNoticesSchema>;

// ────────────────────────────────────────────────────────────
// List Filter
// ────────────────────────────────────────────────────────────

export const listFeeNoticesFilterSchema = z.object({
  status: z
    .enum(["pending", "sent", "delivered", "failed", "skipped"])
    .optional(),
  trigger_type: z.enum(feeNoticeTriggers).optional(),
  student_id: z.string().uuid().optional(),
  guardian_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ListFeeNoticesFilter = z.infer<typeof listFeeNoticesFilterSchema>;
