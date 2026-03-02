// src/lib/validations/immunisation.ts
//
// ============================================================
// Zod Schemas - Immunisation Compliance (No Jab No Pay/Play)
// ============================================================
// Validates IHS records, status changes, exemption recording,
// and list filters before database writes.
// ============================================================

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const immunisationStatusEnum = z.enum([
  "up_to_date",
  "catch_up_schedule",
  "medical_exemption",
  "pending",
]);

// ============================================================
// Create / Update Schemas
// ============================================================

export const createImmunisationRecordSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  ihs_date: z
    .string()
    .date("IHS date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  status: immunisationStatusEnum,
  document_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  support_period_start: z
    .string()
    .date("Support period start must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  support_period_end: z
    .string()
    .date("Support period end must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  next_air_check_due: z
    .string()
    .date("Next AIR check date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type CreateImmunisationRecordInput = z.infer<
  typeof createImmunisationRecordSchema
>;

export const updateImmunisationRecordSchema = z.object({
  ihs_date: z
    .string()
    .date("IHS date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  status: immunisationStatusEnum.optional(),
  document_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  support_period_start: z
    .string()
    .date("Support period start must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  support_period_end: z
    .string()
    .date("Support period end must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  next_air_check_due: z
    .string()
    .date("Next AIR check date must be YYYY-MM-DD")
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type UpdateImmunisationRecordInput = z.infer<
  typeof updateImmunisationRecordSchema
>;

// ============================================================
// List / Filter Schema
// ============================================================

export const listImmunisationFilterSchema = z.object({
  status: immunisationStatusEnum.nullish(),
  search: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListImmunisationFilter = z.infer<
  typeof listImmunisationFilterSchema
>;
