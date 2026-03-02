// src/lib/validations/chronic-absence.ts
//
// ============================================================
// Chronic Absence Monitoring - Zod Validation Schemas
// ============================================================

import { z } from "zod";

// ============================================================
// Config
// ============================================================

export const UpdateAbsenceConfigSchema = z
  .object({
    at_risk_threshold: z.number().int().min(50).max(99),
    chronic_threshold: z.number().int().min(50).max(98),
    severe_threshold: z.number().int().min(10).max(97),
    rolling_window_days: z.number().int().min(14).max(365),
    count_late_as_absent: z.boolean(),
    count_half_day_as_absent: z.boolean(),
    auto_flag_enabled: z.boolean(),
  })
  .refine(
    (v) =>
      v.severe_threshold < v.chronic_threshold &&
      v.chronic_threshold < v.at_risk_threshold,
    { message: "Thresholds must be in order: severe < chronic < at_risk" },
  );

export type UpdateAbsenceConfigInput = z.infer<
  typeof UpdateAbsenceConfigSchema
>;

// ============================================================
// Flags
// ============================================================

export const CreateAbsenceFlagSchema = z.object({
  student_id: z.string().uuid(),
  notes: z.string().max(2000).nullish(),
});

export type CreateAbsenceFlagInput = z.infer<typeof CreateAbsenceFlagSchema>;

export const UpdateAbsenceFlagSchema = z.object({
  flag_id: z.string().uuid(),
  notes: z.string().max(2000).nullish(),
});

export type UpdateAbsenceFlagInput = z.infer<typeof UpdateAbsenceFlagSchema>;

export const ResolveAbsenceFlagSchema = z.object({
  flag_id: z.string().uuid(),
  resolution_note: z.string().max(2000).nullish(),
});

export type ResolveAbsenceFlagInput = z.infer<typeof ResolveAbsenceFlagSchema>;

export const DismissAbsenceFlagSchema = z.object({
  flag_id: z.string().uuid(),
  resolution_note: z.string().max(2000).nullish(),
});

export type DismissAbsenceFlagInput = z.infer<typeof DismissAbsenceFlagSchema>;

// ============================================================
// Follow-Up Log
// ============================================================

const FollowUpMethodEnum = z.enum([
  "phone_call",
  "sms",
  "email",
  "in_person",
  "letter",
  "welfare_check",
  "referral",
  "other",
]);

const FollowUpOutcomeEnum = z.enum([
  "contacted",
  "no_answer",
  "message_left",
  "referred",
  "resolved",
  "escalated",
  "other",
]);

export const LogFollowUpSchema = z.object({
  flag_id: z.string().uuid(),
  student_id: z.string().uuid(),
  contact_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  method: FollowUpMethodEnum,
  outcome: FollowUpOutcomeEnum,
  contact_name: z.string().max(200).nullish(),
  notes: z.string().max(3000).nullish(),
  next_follow_up: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
});

export type LogFollowUpInput = z.infer<typeof LogFollowUpSchema>;

// ============================================================
// Filter / List
// ============================================================

export const ListAbsenceStudentsSchema = z.object({
  status_filter: z
    .enum(["all", "at_risk", "chronic", "severe", "good"])
    .default("all"),
  flagged_only: z.boolean().default(false),
  class_id: z.string().uuid().nullish(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
});

export type ListAbsenceStudentsInput = z.infer<
  typeof ListAbsenceStudentsSchema
>;
