// src/lib/validations/wellbeing.ts
//
// ============================================================
// WattleOS V2 - Wellbeing & Pastoral Care (Module P)
// ============================================================
// Zod schemas for all five wellbeing entities:
//   - Wellbeing Flags
//   - Student Referrals
//   - Counsellor Case Notes
//   - Wellbeing Check-ins
//   - Pastoral Care Records
// ============================================================

import { z } from "zod";

// ── Shared enums ──────────────────────────────────────────────

export const wellbeingFlagSeverityEnum = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const wellbeingFlagStatusEnum = z.enum([
  "open",
  "in_progress",
  "resolved",
  "archived",
]);

export const pastoralCategoryEnum = z.enum([
  "behaviour",
  "emotional",
  "social",
  "family",
  "health",
  "academic",
  "other",
]);

export const referralTypeEnum = z.enum(["internal", "external"]);

export const referralStatusEnum = z.enum([
  "pending",
  "accepted",
  "in_progress",
  "closed",
  "declined",
]);

export const referralSpecialtyEnum = z.enum([
  "speech_pathology",
  "occupational_therapy",
  "psychology",
  "social_work",
  "physiotherapy",
  "paediatrics",
  "counselling",
  "other",
]);

export const counsellorNoteTypeEnum = z.enum([
  "initial_assessment",
  "follow_up",
  "crisis_intervention",
  "parent_consultation",
  "external_liaison",
  "closure",
]);

export const checkInStatusEnum = z.enum([
  "scheduled",
  "completed",
  "rescheduled",
  "no_show",
]);

// ── Wellbeing Flags ───────────────────────────────────────────────────

export const createWellbeingFlagSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  severity: wellbeingFlagSeverityEnum,
  category: pastoralCategoryEnum,
  summary: z
    .string()
    .trim()
    .min(5, "Summary must be at least 5 characters")
    .max(500, "Summary must be under 500 characters"),
  context: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  assigned_to: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type CreateWellbeingFlagInput = z.infer<
  typeof createWellbeingFlagSchema
>;

export const updateWellbeingFlagSchema = z.object({
  severity: wellbeingFlagSeverityEnum.optional(),
  category: pastoralCategoryEnum.optional(),
  summary: z.string().trim().min(5).max(500).optional(),
  context: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  status: wellbeingFlagStatusEnum.optional(),
  assigned_to: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  resolved_reason: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateWellbeingFlagInput = z.infer<
  typeof updateWellbeingFlagSchema
>;

export const listWellbeingFlagsSchema = z.object({
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  severity: wellbeingFlagSeverityEnum.nullish(),
  status: wellbeingFlagStatusEnum.nullish(),
  category: pastoralCategoryEnum.nullish(),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListWellbeingFlagsInput = z.input<typeof listWellbeingFlagsSchema>;

// ── Student Referrals ──────────────────────────────────────────────────

export const createReferralSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  referral_type: referralTypeEnum,
  specialty: referralSpecialtyEnum,
  referral_reason: z
    .string()
    .trim()
    .min(10, "Referral reason must be at least 10 characters")
    .max(2000),
  referred_to_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  referred_to_organisation: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  follow_up_date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
  linked_flag_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const updateReferralSchema = z.object({
  specialty: referralSpecialtyEnum.optional(),
  referral_reason: z.string().trim().min(10).max(2000).optional(),
  referred_to_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  referred_to_organisation: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  follow_up_date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
  outcome_notes: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;

export const updateReferralStatusSchema = z.object({
  status: referralStatusEnum,
  outcome_notes: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateReferralStatusInput = z.infer<
  typeof updateReferralStatusSchema
>;

export const listReferralsSchema = z.object({
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  status: referralStatusEnum.nullish(),
  specialty: referralSpecialtyEnum.nullish(),
  referral_type: referralTypeEnum.nullish(),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListReferralsInput = z.input<typeof listReferralsSchema>;

// ── Counsellor Case Notes ─────────────────────────────────────────────────

export const createCaseNoteSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  note_type: counsellorNoteTypeEnum,
  content: z
    .string()
    .trim()
    .min(10, "Note content must be at least 10 characters")
    .max(10000),
  session_date: z.string().date("Invalid session date"),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(480)
    .nullish()
    .transform((v) => v || null),
  linked_flag_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  linked_referral_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  is_confidential: z.boolean().default(true),
  follow_up_required: z.boolean().default(false),
  follow_up_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateCaseNoteInput = z.infer<typeof createCaseNoteSchema>;

export const updateCaseNoteSchema = z.object({
  note_type: counsellorNoteTypeEnum.optional(),
  content: z.string().trim().min(10).max(10000).optional(),
  session_date: z.string().date().optional(),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(480)
    .nullish()
    .transform((v) => v || null),
  is_confidential: z.boolean().optional(),
  follow_up_required: z.boolean().optional(),
  follow_up_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateCaseNoteInput = z.infer<typeof updateCaseNoteSchema>;

export const listCaseNotesSchema = z.object({
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  note_type: counsellorNoteTypeEnum.nullish(),
  follow_up_required: z.boolean().nullish(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListCaseNotesInput = z.input<typeof listCaseNotesSchema>;

// ── Wellbeing Check-ins ───────────────────────────────────────────────────

export const scheduleCheckInSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  scheduled_for: z
    .string()
    .datetime({ message: "Invalid scheduled date/time" }),
  linked_flag_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type ScheduleCheckInInput = z.infer<typeof scheduleCheckInSchema>;

export const completeCheckInSchema = z.object({
  mood_rating: z.coerce
    .number()
    .int()
    .min(1)
    .max(5)
    .nullish()
    .transform((v) => v || null),
  wellbeing_areas: z.array(z.string().trim().max(100)).max(10).optional(),
  observations: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  student_goals: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
  action_items: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
  follow_up_date: z
    .string()
    .date()
    .nullish()
    .transform((v) => v || null),
});

export type CompleteCheckInInput = z.infer<typeof completeCheckInSchema>;

export const rescheduleCheckInSchema = z.object({
  scheduled_for: z.string().datetime({ message: "Invalid date/time" }),
});

export type RescheduleCheckInInput = z.infer<typeof rescheduleCheckInSchema>;

export const listCheckInsSchema = z.object({
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  status: checkInStatusEnum.nullish(),
  from_date: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  to_date: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListCheckInsInput = z.input<typeof listCheckInsSchema>;

// ── Pastoral Care Records ──────────────────────────────────────────────────

export const createPastoralRecordSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  category: pastoralCategoryEnum,
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000),
  date_of_concern: z.string().date("Invalid date"),
  parent_contacted: z.boolean().default(false),
  parent_contacted_at: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  parent_contact_notes: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
  action_taken: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
  linked_flag_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type CreatePastoralRecordInput = z.infer<
  typeof createPastoralRecordSchema
>;

export const updatePastoralRecordSchema = z.object({
  category: pastoralCategoryEnum.optional(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  date_of_concern: z.string().date().optional(),
  parent_contacted: z.boolean().optional(),
  parent_contacted_at: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  parent_contact_notes: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
  action_taken: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdatePastoralRecordInput = z.infer<
  typeof updatePastoralRecordSchema
>;

export const listPastoralRecordsSchema = z.object({
  student_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  category: pastoralCategoryEnum.nullish(),
  parent_contacted: z.boolean().nullish(),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListPastoralRecordsInput = z.input<
  typeof listPastoralRecordsSchema
>;
