// src/lib/validations/qip.ts
//
// ============================================================
// WattleOS V2 - Module E: QIP Builder Validation Schemas
// (Reg 55)
// ============================================================

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

const qipRatingEnum = z.enum(["working_towards", "meeting", "exceeding"]);
const qipGoalStatusEnum = z.enum(["not_started", "in_progress", "achieved"]);
const qipEvidenceTypeEnum = z.enum([
  "observation",
  "incident",
  "policy",
  "photo",
  "document",
  "other",
]);

const nqsElementIdPattern = /^\d+\.\d+\.\d+$/;

// ============================================================
// Assessment Schemas
// ============================================================

export const upsertAssessmentSchema = z.object({
  nqs_element_id: z
    .string()
    .regex(nqsElementIdPattern, "Invalid NQS element ID (expected X.X.X)"),
  rating: qipRatingEnum.nullable(),
  strengths: z
    .string()
    .trim()
    .max(5000, "Strengths text must be under 5000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type UpsertAssessmentInput = z.infer<typeof upsertAssessmentSchema>;

// ============================================================
// Goal Schemas
// ============================================================

export const createGoalSchema = z.object({
  nqs_element_id: z
    .string()
    .regex(nqsElementIdPattern, "Invalid NQS element ID"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Description must be under 2000 characters"),
  strategies: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v || null),
  responsible_person_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  success_measures: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(2000).optional(),
  strategies: z.string().trim().max(5000).nullish(),
  responsible_person_id: z.string().uuid().nullish(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  success_measures: z.string().trim().max(2000).nullish(),
  status: qipGoalStatusEnum.optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// ============================================================
// Evidence Schemas
// ============================================================

export const attachEvidenceSchema = z
  .object({
    nqs_element_id: z
      .string()
      .regex(nqsElementIdPattern)
      .nullish()
      .transform((v) => v || null),
    qip_goal_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v || null),
    evidence_type: qipEvidenceTypeEnum,
    evidence_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v || null),
    title: z.string().trim().min(1, "Title is required").max(500),
    notes: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((v) => v || null),
  })
  .refine((d) => d.nqs_element_id || d.qip_goal_id, {
    message: "Evidence must be linked to an NQS element or a QIP goal",
  });

export type AttachEvidenceInput = z.infer<typeof attachEvidenceSchema>;

// ============================================================
// Philosophy Schemas
// ============================================================

export const publishPhilosophySchema = z.object({
  content: z
    .string()
    .trim()
    .min(10, "Philosophy statement must be at least 10 characters")
    .max(50000, "Philosophy statement must be under 50,000 characters"),
});

export type PublishPhilosophyInput = z.infer<typeof publishPhilosophySchema>;
