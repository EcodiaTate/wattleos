// src/lib/validations/acara.ts
//
// Zod schemas for ACARA Attendance Reporting

import { z } from "zod";

// ── Create report period ──────────────────────────────────────

export const createAcaraReportPeriodSchema = z.object({
  calendar_year: z.number().int().min(2000).max(2100),
  collection_type: z.enum([
    "annual_school_collection",
    "semester_1_snapshot",
    "semester_2_snapshot",
  ]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateAcaraReportPeriodInput = z.infer<typeof createAcaraReportPeriodSchema>;

// ── Update report period ──────────────────────────────────────

export const updateAcaraReportPeriodSchema = z.object({
  id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z
    .enum(["draft", "verified", "exported", "submitted"])
    .optional(),
});

export type UpdateAcaraReportPeriodInput = z.infer<typeof updateAcaraReportPeriodSchema>;

// ── Override a student record ─────────────────────────────────

export const overrideAcaraStudentRecordSchema = z.object({
  id: z.string().uuid(),
  possible_days: z.number().min(0).multipleOf(0.5),
  actual_days: z.number().min(0).multipleOf(0.5),
  unexplained_days: z.number().min(0).multipleOf(0.5),
  absent_explained: z.number().min(0).multipleOf(0.5),
  late_days: z.number().min(0).multipleOf(0.5),
  exempt_days: z.number().min(0).multipleOf(0.5),
  override_notes: z.string().min(1, "Reason is required when manually overriding").max(500),
}).refine(
  (d) => d.actual_days <= d.possible_days,
  { message: "Actual days cannot exceed possible days", path: ["actual_days"] },
).refine(
  (d) =>
    d.actual_days + d.unexplained_days + d.absent_explained + d.exempt_days <=
    d.possible_days + 0.01, // tolerance for float arithmetic
  { message: "Day totals exceed possible days", path: ["unexplained_days"] },
);

export type OverrideAcaraStudentRecordInput = z.infer<typeof overrideAcaraStudentRecordSchema>;

// ── List / filter ─────────────────────────────────────────────

export const listAcaraReportPeriodsSchema = z.object({
  calendar_year: z.number().int().optional(),
  status: z.enum(["draft", "verified", "exported", "submitted"]).optional(),
});

export type ListAcaraReportPeriodsFilter = z.input<typeof listAcaraReportPeriodsSchema>;

export const listAcaraStudentRecordsSchema = z.object({
  report_period_id: z.string().uuid(),
  search: z.string().optional(),
  below_threshold: z.number().min(0).max(100).optional(), // only return records below this rate
});

export type ListAcaraStudentRecordsFilter = z.input<typeof listAcaraStudentRecordsSchema>;

// ── Export student demographic profile ───────────────────────

export const exportAcaraStudentProfileSchema = z.object({
  calendar_year: z.number().int().min(2000).max(2100),
  enrollment_status: z
    .enum(["active", "withdrawn", "graduated"])
    .optional(),
  include_disability_flag: z.boolean().default(true),
});

export type ExportAcaraStudentProfileInput = z.infer<typeof exportAcaraStudentProfileSchema>;
