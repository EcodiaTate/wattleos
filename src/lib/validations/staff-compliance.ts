// src/lib/validations/staff-compliance.ts
//
// ============================================================
// Zod Schemas - Staff Compliance (Reg 136/145/146)
// ============================================================
// Validates WWCC, qualification, Geccko, Worker Register,
// and certificate data before database writes.
// ============================================================

import { z } from "zod";

const qualificationLevelEnum = z.enum([
  "cert3",
  "diploma",
  "ect",
  "working_towards",
  "other",
  "none",
]);

const certTypeEnum = z.enum([
  "first_aid",
  "cpr",
  "anaphylaxis",
  "asthma",
  "child_safety",
  "mandatory_reporting",
  "food_safety",
  "other",
]);

const australianStateEnum = z.enum([
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
]);

// ────────────────────────────────────────────────────────────
// Upsert Compliance Profile
// ────────────────────────────────────────────────────────────

export const upsertComplianceProfileSchema = z.object({
  // WWCC
  wwcc_state: australianStateEnum.nullish().transform((v) => v || null),
  wwcc_number: z
    .string()
    .trim()
    .max(50, "WWCC number is too long")
    .nullish()
    .transform((v) => v || null),
  wwcc_expiry: z
    .string()
    .nullish()
    .transform((v) => v || null),

  // Qualifications
  highest_qualification: qualificationLevelEnum
    .nullish()
    .transform((v) => v || null),
  qualification_detail: z
    .string()
    .trim()
    .max(300, "Qualification detail is too long")
    .nullish()
    .transform((v) => v || null),
  acecqa_approval_number: z
    .string()
    .trim()
    .max(50, "ACECQA number is too long")
    .nullish()
    .transform((v) => v || null),
  working_towards_rto: z
    .string()
    .trim()
    .max(200, "RTO name is too long")
    .nullish()
    .transform((v) => v || null),
  working_towards_expected: z
    .string()
    .nullish()
    .transform((v) => v || null),

  // Geccko child safety training
  geccko_module: z
    .string()
    .trim()
    .max(200, "Module name is too long")
    .nullish()
    .transform((v) => v || null),
  geccko_completion_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  geccko_record_id: z
    .string()
    .trim()
    .max(100, "Geccko record ID is too long")
    .nullish()
    .transform((v) => v || null),

  // Worker Register data (NQA ITS)
  employment_start_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  employment_end_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  position_title: z
    .string()
    .trim()
    .max(200, "Position title is too long")
    .nullish()
    .transform((v) => v || null),
  date_of_birth: z
    .string()
    .nullish()
    .transform((v) => v || null),
  contact_address: z
    .string()
    .trim()
    .max(500, "Address is too long")
    .nullish()
    .transform((v) => v || null),
});

export type UpsertComplianceProfileInput = z.infer<
  typeof upsertComplianceProfileSchema
>;

// ────────────────────────────────────────────────────────────
// Upsert Certificate
// ────────────────────────────────────────────────────────────

export const upsertCertificateSchema = z.object({
  id: z
    .string()
    .uuid("Invalid certificate ID")
    .nullish()
    .transform((v) => v || null),

  user_id: z.string("Staff member is required").uuid("Invalid user ID"),

  cert_type: certTypeEnum,

  cert_name: z
    .string()
    .trim()
    .min(1, "Certificate name is required")
    .max(200, "Certificate name is too long"),

  issue_date: z
    .string("Issue date is required")
    .min(1, "Issue date is required"),

  expiry_date: z
    .string()
    .nullish()
    .transform((v) => v || null),

  cert_number: z
    .string()
    .trim()
    .max(100, "Certificate number is too long")
    .nullish()
    .transform((v) => v || null),

  provider: z
    .string()
    .trim()
    .max(200, "Provider name is too long")
    .nullish()
    .transform((v) => v || null),

  document_url: z
    .string()
    .url("Invalid document URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .nullish()
    .transform((v) => v || null),
});

export type UpsertCertificateInput = z.infer<typeof upsertCertificateSchema>;

// ────────────────────────────────────────────────────────────
// Compliance Settings
// ────────────────────────────────────────────────────────────

export const updateComplianceSettingsSchema = z.object({
  ect_children_per_educator: z
    .number()
    .int()
    .min(1, "Must be at least 1")
    .max(200, "Must be 200 or less"),
  qualification_target_pct: z
    .number()
    .int()
    .min(0, "Must be 0% or more")
    .max(100, "Must be 100% or less"),
  expiry_warning_days: z
    .number()
    .int()
    .min(7, "Must be at least 7 days")
    .max(365, "Must be 365 days or less"),
  nominated_supervisor_id: z
    .string()
    .uuid("Invalid user ID")
    .nullish()
    .transform((v) => v || null),
});

export type UpdateComplianceSettingsInput = z.infer<
  typeof updateComplianceSettingsSchema
>;

// ────────────────────────────────────────────────────────────
// Bulk Certificate Import
// ────────────────────────────────────────────────────────────

export const bulkCertificateRowSchema = z.object({
  user_email: z.string().trim().email("Invalid email address"),
  cert_type: certTypeEnum,
  cert_name: z
    .string()
    .trim()
    .min(1, "Certificate name is required")
    .max(200, "Certificate name is too long"),
  issue_date: z.string().min(1, "Issue date is required"),
  expiry_date: z
    .string()
    .nullish()
    .transform((v) => v || null),
  cert_number: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),
  provider: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});

export const bulkCertificateImportSchema = z.object({
  rows: z
    .array(bulkCertificateRowSchema)
    .min(1, "At least one row is required")
    .max(500, "Maximum 500 rows per import"),
});

export type BulkCertificateRow = z.infer<typeof bulkCertificateRowSchema>;
export type BulkCertificateImportInput = z.infer<
  typeof bulkCertificateImportSchema
>;
