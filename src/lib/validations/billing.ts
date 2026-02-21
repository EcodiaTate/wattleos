// src/lib/validations/billing.ts
//
// ============================================================
// Zod Schemas — Billing (Module 9 Integration)
// ============================================================
// Tier 2: Authenticated + permissioned, but FINANCIAL data.
// Wrong amounts or missing line items directly affect
// what parents are charged via Stripe.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Create Fee Schedule
// ────────────────────────────────────────────────────────────

export const createFeeScheduleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name is too long"),

  class_id: z
    .string()
    .uuid("Invalid class ID")
    .nullish()
    .transform((v) => v || null),

  amount_cents: z
    .number({ message: "Amount is required" })
    .int("Amount must be a whole number (cents)")
    .min(0, "Amount must be zero or positive")
    .max(99_999_999, "Amount exceeds maximum"),

  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code (e.g. AUD)")
    .optional(),

  frequency: z.string().trim().min(1, "Frequency is required").max(50),

  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),

  effective_from: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),

  effective_until: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),
});

export type CreateFeeScheduleInput = z.infer<typeof createFeeScheduleSchema>;

// ────────────────────────────────────────────────────────────
// Invoice Line Item (nested inside CreateInvoice)
// ────────────────────────────────────────────────────────────

const invoiceLineItemSchema = z.object({
  fee_schedule_id: z.string().uuid().optional(),

  description: z
    .string()
    .trim()
    .min(1, "Line item description is required")
    .max(500),

  quantity: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity exceeds maximum"),

  unit_amount_cents: z
    .number({ message: "Unit amount is required" })
    .int("Amount must be a whole number (cents)")
    .min(0, "Amount must be zero or positive")
    .max(99_999_999, "Amount exceeds maximum"),
});

// ────────────────────────────────────────────────────────────
// Create Invoice
// ────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  student_id: z.string("Student is required").uuid("Invalid student ID"),

  guardian_id: z.string("Guardian is required").uuid("Invalid guardian ID"),

  due_date: z
    .string("Due date is required")
    .date("Please enter a valid date (YYYY-MM-DD)"),

  period_start: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),

  period_end: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .optional(),

  notes: z.string().trim().max(1000).optional(),

  line_items: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required")
    .max(50, "Maximum 50 line items allowed"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
