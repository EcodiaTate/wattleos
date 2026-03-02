import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const sickBayVisitTypeEnum = z.enum([
  "injury",
  "illness",
  "medication_given",
  "first_aid",
  "other",
]);

export const sickBayVisitStatusEnum = z.enum(["open", "resolved", "referred"]);

// ============================================================
// Create Schema
// ============================================================

export const createSickBayVisitSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  visit_type: sickBayVisitTypeEnum,
  visit_date: z.string().date("Visit date must be YYYY-MM-DD"),
  arrived_at: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  presenting_complaint: z
    .string()
    .trim()
    .max(2000, "Presenting complaint must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  treatment_given: z
    .string()
    .trim()
    .max(2000, "Treatment given must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  parent_notified: z.boolean().default(false),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type CreateSickBayVisitInput = z.infer<typeof createSickBayVisitSchema>;

// ============================================================
// Update Schema
// ============================================================

export const updateSickBayVisitSchema = z.object({
  visit_type: sickBayVisitTypeEnum.optional(),
  status: sickBayVisitStatusEnum.optional(),
  departed_at: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  treatment_given: z
    .string()
    .trim()
    .max(2000, "Treatment given must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  outcome: z
    .string()
    .trim()
    .max(2000, "Outcome must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
  parent_notified: z.boolean().optional(),
  parent_notified_at: z
    .string()
    .datetime()
    .nullish()
    .transform((v) => v || null),
  ambulance_called: z.boolean().optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type UpdateSickBayVisitInput = z.infer<typeof updateSickBayVisitSchema>;

// ============================================================
// List Filter Schema
// ============================================================

export const listSickBayVisitFilterSchema = z.object({
  status: sickBayVisitStatusEnum.nullish(),
  visit_type: sickBayVisitTypeEnum.nullish(),
  student_id: z.string().uuid().nullish(),
  date_from: z.string().date().nullish().transform((v) => v || null),
  date_to: z.string().date().nullish().transform((v) => v || null),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListSickBayVisitFilter = z.infer<typeof listSickBayVisitFilterSchema>;
