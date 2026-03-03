// src/lib/validations/previous-school-records.ts
//
// ============================================================
// WattleOS V2 - Previous School Records: Zod Schemas
// ============================================================

import { z } from "zod";

// ── Shared option lists ───────────────────────────────────────

export const SCHOOL_TYPE_OPTIONS = [
  { value: "government", label: "Government" },
  { value: "independent", label: "Independent" },
  { value: "catholic", label: "Catholic" },
  { value: "international", label: "International" },
  { value: "homeschool", label: "Homeschool" },
  { value: "other", label: "Other" },
] as const;

export type SchoolType = (typeof SCHOOL_TYPE_OPTIONS)[number]["value"];

export const AUSTRALIAN_STATES = [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
] as const;

// ── Create ───────────────────────────────────────────────────

const previousSchoolRecordBaseSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),

  school_name: z.string().min(1, "School name is required").max(200),
  school_type: z
    .enum([
      "government",
      "independent",
      "catholic",
      "international",
      "homeschool",
      "other",
    ])
    .nullish()
    .transform((v) => v ?? null),
  suburb: z
    .string()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  state: z
    .string()
    .max(10)
    .nullish()
    .transform((v) => v ?? null),
  country: z.string().min(1).max(100).default("Australia"),

  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v ?? null),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v ?? null),
  year_levels: z
    .array(z.string().max(50))
    .max(20)
    .nullish()
    .transform((v) => v ?? null),

  principal_name: z
    .string()
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  contact_phone: z
    .string()
    .max(30)
    .nullish()
    .transform((v) => v ?? null),
  contact_email: z
    .string()
    .email("Invalid email")
    .max(200)
    .nullish()
    .transform((v) => v ?? null),

  reason_for_leaving: z
    .string()
    .max(1000)
    .nullish()
    .transform((v) => v ?? null),
  transfer_document_url: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});

const dateRangeRefinement = {
  check: (d: { start_date?: string | null; end_date?: string | null }) => {
    if (d.start_date && d.end_date) {
      return d.end_date >= d.start_date;
    }
    return true;
  },
  message: {
    message: "End date must be on or after start date",
    path: ["end_date"],
  },
};

export const createPreviousSchoolRecordSchema =
  previousSchoolRecordBaseSchema.refine(
    dateRangeRefinement.check,
    dateRangeRefinement.message,
  );

export type CreatePreviousSchoolRecordInput = z.input<
  typeof createPreviousSchoolRecordSchema
>;

// ── Update ───────────────────────────────────────────────────

export const updatePreviousSchoolRecordSchema = previousSchoolRecordBaseSchema
  .omit({ student_id: true })
  .partial()
  .extend({
    school_name: z.string().min(1, "School name is required").max(200),
  })
  .refine(
    dateRangeRefinement.check,
    dateRangeRefinement.message,
  );

export type UpdatePreviousSchoolRecordInput = z.input<
  typeof updatePreviousSchoolRecordSchema
>;

// ── List filter ──────────────────────────────────────────────

export const listPreviousSchoolRecordsFilterSchema = z.object({
  student_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListPreviousSchoolRecordsFilter = z.input<
  typeof listPreviousSchoolRecordsFilterSchema
>;
