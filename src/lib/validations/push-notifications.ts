// src/lib/validations/push-notifications.ts
//
// ============================================================
// Push Notification Dispatch - Zod Validation Schemas
// ============================================================

import { z } from "zod";

const NOTIFICATION_TOPICS = [
  "announcements",
  "messages",
  "observations",
  "attendance",
  "events",
  "incidents",
  "bookings",
  "reports",
  "emergency",
  "billing",
  "rostering",
  "general",
] as const;

const NOTIFICATION_TARGET_TYPES = [
  "all_staff",
  "all_parents",
  "all_users",
  "specific_class",
  "specific_program",
  "specific_users",
] as const;

// ============================================================
// Create / Update Dispatch
// ============================================================

export const CreateDispatchSchema = z
  .object({
    topic: z.enum(NOTIFICATION_TOPICS),
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    data: z.record(z.string(), z.unknown()).default({}),
    target_type: z.enum(NOTIFICATION_TARGET_TYPES),
    target_class_id: z.string().uuid().nullish(),
    target_program_id: z.string().uuid().nullish(),
    target_user_ids: z.array(z.string().uuid()).nullish(),
    scheduled_for: z.string().datetime().nullish(), // ISO string or null
  })
  .refine(
    (v) => {
      if (v.target_type === "specific_class") return !!v.target_class_id;
      if (v.target_type === "specific_program") return !!v.target_program_id;
      if (v.target_type === "specific_users")
        return (v.target_user_ids?.length ?? 0) > 0;
      return true;
    },
    { message: "Target ID or user list required for the selected target type" },
  );

export type CreateDispatchInput = z.infer<typeof CreateDispatchSchema>;

export const UpdateDispatchSchema = z.object({
  dispatch_id: z.string().uuid(),
  topic: z.enum(NOTIFICATION_TOPICS).optional(),
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  target_type: z.enum(NOTIFICATION_TARGET_TYPES).optional(),
  target_class_id: z.string().uuid().nullish(),
  target_program_id: z.string().uuid().nullish(),
  target_user_ids: z.array(z.string().uuid()).nullish(),
  scheduled_for: z.string().datetime().nullish(),
});

export type UpdateDispatchInput = z.infer<typeof UpdateDispatchSchema>;

// ============================================================
// Send / Schedule / Cancel
// ============================================================

export const SendDispatchSchema = z.object({
  dispatch_id: z.string().uuid(),
});

export type SendDispatchInput = z.infer<typeof SendDispatchSchema>;

export const CancelDispatchSchema = z.object({
  dispatch_id: z.string().uuid(),
});

export type CancelDispatchInput = z.infer<typeof CancelDispatchSchema>;

// ============================================================
// Topic Preference Update
// ============================================================

export const UpdateTopicPrefSchema = z.object({
  topic: z.enum(NOTIFICATION_TOPICS),
  push_enabled: z.boolean(),
  email_enabled: z.boolean(),
});

export type UpdateTopicPrefInput = z.infer<typeof UpdateTopicPrefSchema>;

export const BulkUpdateTopicPrefsSchema = z.object({
  prefs: z.array(UpdateTopicPrefSchema),
});

export type BulkUpdateTopicPrefsInput = z.infer<
  typeof BulkUpdateTopicPrefsSchema
>;

// ============================================================
// List / Filter
// ============================================================

export const ListDispatchesSchema = z.object({
  status: z
    .enum(["draft", "scheduled", "sending", "sent", "cancelled", "failed"])
    .optional(),
  topic: z.enum(NOTIFICATION_TOPICS).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
});

export type ListDispatchesInput = z.input<typeof ListDispatchesSchema>;
