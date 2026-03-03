// src/lib/validations/sms-gateway.ts
//
// ============================================================
// WattleOS - SMS Gateway Zod Schemas
// ============================================================

import { z } from "zod";

// ── Phone number ─────────────────────────────────────────────
// E.164-ish: optional + prefix, 7–15 digits
const PhoneSchema = z
  .string()
  .min(7, "Phone number too short")
  .max(16, "Phone number too long")
  .regex(
    /^\+?[0-9]{7,15}$/,
    "Invalid phone number - use digits only, optionally starting with +",
  );

// ── Config ───────────────────────────────────────────────────

export const UpsertSmsConfigSchema = z.object({
  provider: z.enum(["messagemedia", "burst"]),
  api_key: z.string().min(1, "API key is required"),
  /** Required for MessageMedia; ignored for Burst. */
  api_secret: z.string().optional(),
  sender_id: z
    .string()
    .min(1, "Sender ID is required")
    .max(11, "Sender ID max 11 characters"),
  enabled: z.boolean(),
  daily_limit: z
    .number()
    .int()
    .min(1, "Daily limit must be at least 1")
    .max(50000, "Daily limit too high"),
});

export type UpsertSmsConfigInput = z.infer<typeof UpsertSmsConfigSchema>;

// ── Send individual SMS ──────────────────────────────────────

export const SendSmsSchema = z.object({
  recipient_phone: PhoneSchema,
  recipient_name: z.string().max(100).nullish(),
  message_body: z
    .string()
    .min(1, "Message body is required")
    .max(1600, "Message too long (max 1600 characters)"),
  message_type: z
    .enum(["general", "absence_alert", "emergency", "reminder", "broadcast"])
    .default("general"),
  student_id: z.string().uuid().nullish(),
  guardian_id: z.string().uuid().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendSmsInput = z.infer<typeof SendSmsSchema>;

// ── Broadcast to multiple recipients ────────────────────────

export const BroadcastSmsSchema = z.object({
  recipients: z
    .array(
      z.object({
        phone: PhoneSchema,
        name: z.string().max(100).optional(),
        student_id: z.string().uuid().optional(),
        guardian_id: z.string().uuid().optional(),
      }),
    )
    .min(1, "At least one recipient required")
    .max(500, "Maximum 500 recipients per broadcast"),
  message_body: z
    .string()
    .min(1, "Message body is required")
    .max(1600, "Message too long (max 1600 characters)"),
  message_type: z
    .enum(["general", "absence_alert", "emergency", "reminder", "broadcast"])
    .default("broadcast"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BroadcastSmsInput = z.infer<typeof BroadcastSmsSchema>;

// ── Message list filter ──────────────────────────────────────

export const ListSmsMessagesSchema = z.object({
  status: z
    .enum(["pending", "sent", "delivered", "failed", "bounced", "opted_out"])
    .optional(),
  message_type: z
    .enum(["general", "absence_alert", "emergency", "reminder", "broadcast"])
    .optional(),
  student_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
});

export type ListSmsMessagesInput = z.infer<typeof ListSmsMessagesSchema>;

// ── Opt-out management ───────────────────────────────────────

export const AddOptOutSchema = z.object({
  phone: PhoneSchema,
});
export type AddOptOutInput = z.infer<typeof AddOptOutSchema>;

export const RemoveOptOutSchema = z.object({
  phone: PhoneSchema,
});
export type RemoveOptOutInput = z.infer<typeof RemoveOptOutSchema>;

// ── Webhook (delivery receipt) ───────────────────────────────

export const SmsWebhookSchema = z.object({
  provider_message_id: z.string(),
  status: z.enum(["sent", "delivered", "failed", "bounced", "opted_out"]),
  timestamp: z.string().optional(),
  error_message: z.string().optional(),
});

export type SmsWebhookInput = z.infer<typeof SmsWebhookSchema>;
