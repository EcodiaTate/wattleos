// src/lib/validations/ccs.ts
//
// ============================================================
// Zod Schemas - CCS Session Reporting
// ============================================================
// Validates session reports, weekly bundles, absence coding,
// and list filters before database writes.
// ============================================================

import { z } from "zod";

// ============================================================
// Enums
// ============================================================

export const ccsSessionTypeEnum = z.enum([
  "long_day_care",
  "oshc",
  "vacation_care",
  "occasional",
]);

export const ccsReportStatusEnum = z.enum([
  "draft",
  "ready",
  "submitted",
  "accepted",
  "rejected",
]);

export const ccsBundleStatusEnum = z.enum([
  "draft",
  "ready",
  "submitted",
  "accepted",
  "rejected",
]);

// ============================================================
// Generate Reports Schema
// ============================================================

export const generateReportsSchema = z.object({
  week_start_date: z.string().date("Week start must be YYYY-MM-DD"),
  week_end_date: z.string().date("Week end must be YYYY-MM-DD"),
});

export type GenerateReportsInput = z.infer<typeof generateReportsSchema>;

// ============================================================
// Update Session Report Schema
// ============================================================

export const updateSessionReportSchema = z.object({
  absence_type_code: z
    .string()
    .max(10)
    .nullish()
    .transform((v) => v || null),
  prescribed_discount_cents: z.coerce.number().int().min(0).optional(),
  third_party_payment_cents: z.coerce.number().int().min(0).optional(),
  gap_fee_cents: z.coerce.number().int().min(0).optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be under 2000 characters")
    .nullish()
    .transform((v) => v || null),
});

export type UpdateSessionReportInput = z.infer<
  typeof updateSessionReportSchema
>;

// ============================================================
// Bundle Schemas
// ============================================================

export const createBundleSchema = z.object({
  week_start_date: z.string().date("Week start must be YYYY-MM-DD"),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;

export const submitBundleSchema = z.object({
  bundle_id: z.string().uuid("Invalid bundle ID"),
});

export type SubmitBundleInput = z.infer<typeof submitBundleSchema>;

// ============================================================
// List / Filter Schemas
// ============================================================

export const listBundlesFilterSchema = z.object({
  status: ccsBundleStatusEnum.nullish(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListBundlesFilter = z.infer<typeof listBundlesFilterSchema>;

export const absenceCapQuerySchema = z.object({
  student_id: z.string().uuid().nullish(),
  financial_year: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Financial year must be YYYY-YY format")
    .nullish(),
});

export type AbsenceCapQuery = z.infer<typeof absenceCapQuerySchema>;
