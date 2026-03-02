// src/lib/validations/accreditation.ts
//
// ============================================================
// AMI/AMS/MSAA Accreditation Checklist - Zod Schemas
// ============================================================

import { z } from "zod";

// ============================================================
// Shared enums
// ============================================================

const AccreditationBodyCodeSchema = z.enum(["ami", "ams", "msaa"]);

const AccreditationRatingSchema = z.enum([
  "not_started",
  "not_met",
  "partially_met",
  "met",
  "exceeds",
]);

const AccreditationCycleStatusSchema = z.enum([
  "draft",
  "self_study",
  "submitted",
  "under_review",
  "accredited",
  "conditional",
  "lapsed",
]);

const AccreditationEvidenceTypeSchema = z.enum([
  "document",
  "link",
  "observation",
  "photo",
  "note",
]);

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ============================================================
// Accreditation Cycle - Create
// ============================================================

export const CreateAccreditationCycleSchema = z.object({
  body_code: AccreditationBodyCodeSchema,
  cycle_label: z.string().min(1).max(200),
  self_study_start: DateStringSchema.nullish(),
  self_study_end: DateStringSchema.nullish(),
  submission_date: DateStringSchema.nullish(),
  lead_staff_id: z.string().uuid().nullish(),
  notes: z.string().max(4000).nullish(),
});

export type CreateAccreditationCycleInput = z.infer<
  typeof CreateAccreditationCycleSchema
>;

// ============================================================
// Accreditation Cycle - Update
// ============================================================

export const UpdateAccreditationCycleSchema = z.object({
  cycle_label: z.string().min(1).max(200).optional(),
  status: AccreditationCycleStatusSchema.optional(),
  self_study_start: DateStringSchema.nullish(),
  self_study_end: DateStringSchema.nullish(),
  submission_date: DateStringSchema.nullish(),
  decision_date: DateStringSchema.nullish(),
  decision_notes: z.string().max(4000).nullish(),
  accreditation_valid_from: DateStringSchema.nullish(),
  accreditation_valid_to: DateStringSchema.nullish(),
  lead_staff_id: z.string().uuid().nullish(),
  notes: z.string().max(4000).nullish(),
});

export type UpdateAccreditationCycleInput = z.infer<
  typeof UpdateAccreditationCycleSchema
>;

// ============================================================
// Cycle list filter
// ============================================================

export const ListAccreditationCyclesSchema = z.object({
  body_code: AccreditationBodyCodeSchema.nullish(),
  status: AccreditationCycleStatusSchema.nullish(),
});

export type ListAccreditationCyclesInput = z.input<
  typeof ListAccreditationCyclesSchema
>;

// ============================================================
// Assessment - Upsert (one row per cycle+criterion)
// ============================================================

export const UpsertAccreditationAssessmentSchema = z.object({
  cycle_id: z.string().uuid(),
  criterion_id: z.string().uuid(),
  rating: AccreditationRatingSchema,
  self_assessment: z.string().max(6000).nullish(),
  strengths: z.string().max(4000).nullish(),
  areas_for_growth: z.string().max(4000).nullish(),
  action_required: z.string().max(4000).nullish(),
  target_date: DateStringSchema.nullish(),
});

export type UpsertAccreditationAssessmentInput = z.infer<
  typeof UpsertAccreditationAssessmentSchema
>;

// ============================================================
// Evidence - Create
// ============================================================

export const CreateAccreditationEvidenceSchema = z.object({
  assessment_id: z.string().uuid(),
  evidence_type: AccreditationEvidenceTypeSchema,
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullish(),
  file_url: z.string().url().nullish(),
  external_url: z.string().url().nullish(),
  observation_id: z.string().uuid().nullish(),
});

export type CreateAccreditationEvidenceInput = z.infer<
  typeof CreateAccreditationEvidenceSchema
>;

// ============================================================
// Custom criterion - Create
// ============================================================

export const CreateCustomCriterionSchema = z.object({
  body_code: AccreditationBodyCodeSchema,
  domain_name: z.string().min(1).max(200),
  domain_order: z.number().int().min(0).max(99).optional(),
  criterion_code: z.string().min(1).max(50),
  criterion_title: z.string().min(1).max(400),
  description: z.string().max(2000).nullish(),
  guidance: z.string().max(2000).nullish(),
});

export type CreateCustomCriterionInput = z.infer<
  typeof CreateCustomCriterionSchema
>;
