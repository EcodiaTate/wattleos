// src/lib/validations/naplan.ts
//
// Zod schemas for the NAPLAN Coordination module.

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

const NaplanWindowStatusSchema = z.enum(["draft", "active", "closed"]);

const NaplanDomainSchema = z.enum([
  "reading",
  "writing",
  "spelling",
  "language_conventions",
  "numeracy",
]);

const NaplanProficiencySchema = z.enum([
  "needs_additional_support",
  "developing",
  "strong",
  "exceeding",
]);

// ============================================================
// Test window
// ============================================================

export const CreateTestWindowSchema = z.object({
  collection_year: z
    .number()
    .int()
    .min(2020, "Year must be 2020 or later")
    .max(2099, "Year must be 2099 or earlier"),
  test_start_date: z.string().nullable().optional(),
  test_end_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateTestWindowInput = z.infer<typeof CreateTestWindowSchema>;

export const UpdateTestWindowSchema = z.object({
  id: z.string().uuid(),
  collection_year: z
    .number()
    .int()
    .min(2020)
    .max(2099)
    .optional(),
  test_start_date: z.string().nullable().optional(),
  test_end_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type UpdateTestWindowInput = z.infer<typeof UpdateTestWindowSchema>;

export const SetWindowStatusSchema = z.object({
  id: z.string().uuid(),
  status: NaplanWindowStatusSchema,
});

export type SetWindowStatusInput = z.infer<typeof SetWindowStatusSchema>;

// ============================================================
// Cohort
// ============================================================

export const GenerateCohortSchema = z.object({
  window_id: z.string().uuid(),
});

export type GenerateCohortInput = z.infer<typeof GenerateCohortSchema>;

export const AddCohortEntrySchema = z.object({
  window_id: z.string().uuid(),
  student_id: z.string().uuid(),
  year_level: z.union([
    z.literal(3),
    z.literal(5),
    z.literal(7),
    z.literal(9),
  ]),
  notes: z.string().max(1000).nullable().optional(),
});

export type AddCohortEntryInput = z.infer<typeof AddCohortEntrySchema>;

export const RecordOptOutSchema = z.object({
  cohort_entry_id: z.string().uuid(),
  opt_out_reason: z.string().max(500).nullable().optional(),
});

export type RecordOptOutInput = z.infer<typeof RecordOptOutSchema>;

export const RemoveOptOutSchema = z.object({
  cohort_entry_id: z.string().uuid(),
});

export type RemoveOptOutInput = z.infer<typeof RemoveOptOutSchema>;

// ============================================================
// Domain results
// ============================================================

export const RecordDomainResultSchema = z.object({
  cohort_entry_id: z.string().uuid(),
  domain: NaplanDomainSchema,
  proficiency_level: NaplanProficiencySchema,
  scaled_score: z.number().int().min(0).max(1000).nullable().optional(),
  national_average_score: z.number().int().min(0).max(1000).nullable().optional(),
  state_average_score: z.number().int().min(0).max(1000).nullable().optional(),
  above_national_minimum: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type RecordDomainResultInput = z.infer<typeof RecordDomainResultSchema>;

export const BatchRecordResultsSchema = z.object({
  cohort_entry_id: z.string().uuid(),
  results: z.array(RecordDomainResultSchema.omit({ cohort_entry_id: true })).min(1),
});

export type BatchRecordResultsInput = z.infer<typeof BatchRecordResultsSchema>;

// ============================================================
// Filters
// ============================================================

export const ListCohortSchema = z.object({
  window_id: z.string().uuid(),
  year_level: z.union([
    z.literal(3),
    z.literal(5),
    z.literal(7),
    z.literal(9),
  ]).optional(),
  opted_out_only: z.boolean().optional(),
  results_pending_only: z.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type ListCohortInput = z.input<typeof ListCohortSchema>;
