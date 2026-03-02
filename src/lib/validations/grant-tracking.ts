// src/lib/validations/grant-tracking.ts
//
// ============================================================
// WattleOS V2 - Grant Tracking Validations
// ============================================================

import { z } from "zod";

// ── Grant CRUD ──────────────────────────────────────────────

export const createGrantSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Grant name is required")
      .max(200, "Name is too long"),
    reference_number: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((v) => v ?? null),
    funding_body: z.string().trim().min(1, "Funding body is required").max(200),
    amount_cents: z
      .number({ message: "Amount is required" })
      .int("Amount must be a whole number (cents)")
      .min(0, "Amount must be zero or positive")
      .max(999_999_999, "Amount exceeds maximum"),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    acquittal_due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .nullish()
      .transform((v) => v ?? null),
    status: z
      .enum(["draft", "submitted", "approved", "active", "acquitted", "closed"])
      .default("draft"),
    category: z
      .enum([
        "general",
        "capital",
        "professional_dev",
        "curriculum",
        "technology",
        "community",
        "research",
        "other",
      ])
      .default("general"),
    managed_by_user_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v ?? null),
    description: z
      .string()
      .trim()
      .max(5000)
      .nullish()
      .transform((v) => v ?? null),
    conditions: z
      .string()
      .trim()
      .max(5000)
      .nullish()
      .transform((v) => v ?? null),
    internal_notes: z
      .string()
      .trim()
      .max(2000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });
export type CreateGrantInput = z.infer<typeof createGrantSchema>;

export const updateGrantSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  reference_number: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  funding_body: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  amount_cents: z
    .number()
    .int()
    .min(0)
    .max(999_999_999)
    .nullish()
    .transform((v) => v ?? null),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  acquittal_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  status: z
    .enum(["draft", "submitted", "approved", "active", "acquitted", "closed"])
    .nullish()
    .transform((v) => v ?? null),
  category: z
    .enum([
      "general",
      "capital",
      "professional_dev",
      "curriculum",
      "technology",
      "community",
      "research",
      "other",
    ])
    .nullish()
    .transform((v) => v ?? null),
  managed_by_user_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  description: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v ?? null),
  conditions: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((v) => v ?? null),
  internal_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type UpdateGrantInput = z.infer<typeof updateGrantSchema>;

export const listGrantsSchema = z.object({
  status: z
    .enum(["draft", "submitted", "approved", "active", "acquitted", "closed"])
    .nullish()
    .transform((v) => v ?? null),
  category: z
    .enum([
      "general",
      "capital",
      "professional_dev",
      "curriculum",
      "technology",
      "community",
      "research",
      "other",
    ])
    .nullish()
    .transform((v) => v ?? null),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
export type ListGrantsInput = z.input<typeof listGrantsSchema>;

// ── Milestones ──────────────────────────────────────────────

export const createMilestoneSchema = z.object({
  grant_id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.object({
  id: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .nullish()
    .transform((v) => v ?? null),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  status: z
    .enum(["pending", "in_progress", "completed", "overdue"])
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ── Expenditures ────────────────────────────────────────────

export const createExpenditureSchema = z.object({
  grant_id: z.string().uuid(),
  description: z.string().trim().min(1, "Description is required").max(500),
  amount_cents: z
    .number({ message: "Amount is required" })
    .int("Amount must be a whole number (cents)")
    .min(1, "Amount must be positive")
    .max(999_999_999, "Amount exceeds maximum"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  category: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  receipt_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type CreateExpenditureInput = z.infer<typeof createExpenditureSchema>;

export const updateExpenditureSchema = z.object({
  id: z.string().uuid(),
  description: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .nullish()
    .transform((v) => v ?? null),
  amount_cents: z
    .number()
    .int()
    .min(1)
    .max(999_999_999)
    .nullish()
    .transform((v) => v ?? null),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .transform((v) => v ?? null),
  category: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v ?? null),
  receipt_reference: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
});
export type UpdateExpenditureInput = z.infer<typeof updateExpenditureSchema>;

// ── Export ──────────────────────────────────────────────────

export const grantExportSchema = z.object({
  statuses: z
    .array(
      z.enum([
        "draft",
        "submitted",
        "approved",
        "active",
        "acquitted",
        "closed",
      ]),
    )
    .default(["active", "approved"]),
  include_expenditures: z.boolean().default(true),
  include_milestones: z.boolean().default(true),
});
export type GrantExportInput = z.input<typeof grantExportSchema>;
