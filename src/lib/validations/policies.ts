// src/lib/validations/policies.ts
//
// ============================================================
// Zod Schemas - Policies & Complaints (Reg 168/170)
// ============================================================
// Tier 2: Authenticated + permissioned, governance-critical.
// Policy lifecycle management, staff acknowledgements,
// and complaint register with escalation tracking.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Shared enums
// ────────────────────────────────────────────────────────────

const policyCategories = [
  "governance",
  "health_safety",
  "child_protection",
  "staffing",
  "curriculum",
  "inclusion",
  "families",
  "environment",
  "administration",
  "other",
] as const;

const complainantTypes = [
  "parent",
  "staff",
  "anonymous",
  "regulator",
  "other",
] as const;

// ────────────────────────────────────────────────────────────
// Create Policy
// ────────────────────────────────────────────────────────────

export const createPolicySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Policy title is required")
    .max(300, "Title is too long"),

  category: z.enum(policyCategories, {
    message: "Select a policy category",
  }),

  regulation_reference: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || undefined),

  content: z
    .string()
    .trim()
    .max(50000, "Content is too long")
    .optional()
    .transform((v) => v || undefined),

  document_url: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),

  effective_date: z.string().date("Enter a valid date").optional(),

  review_date: z.string().date("Enter a valid review date").optional(),

  requires_parent_notice: z.boolean().default(false),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

// ────────────────────────────────────────────────────────────
// Update Policy
// ────────────────────────────────────────────────────────────

export const updatePolicySchema = createPolicySchema.partial();

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

// ────────────────────────────────────────────────────────────
// Publish Policy (creates a version snapshot)
// ────────────────────────────────────────────────────────────

export const publishPolicySchema = z.object({
  policy_id: z.string().uuid(),
  change_summary: z
    .string()
    .trim()
    .min(1, "Describe what changed in this version")
    .max(1000),
});

export type PublishPolicyInput = z.infer<typeof publishPolicySchema>;

// ────────────────────────────────────────────────────────────
// Create Complaint
// ────────────────────────────────────────────────────────────

export const createComplaintSchema = z.object({
  received_at: z
    .string()
    .datetime({ message: "Enter a valid date/time" })
    .or(z.string().date("Enter a valid date")),

  complainant_type: z.enum(complainantTypes, {
    message: "Select the complainant type",
  }),

  complainant_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || undefined),

  complainant_contact: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || undefined),

  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(300, "Subject is too long"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description is too long"),

  assigned_to: z.string().uuid().optional(),

  target_resolution_date: z.string().date("Enter a valid date").optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

// ────────────────────────────────────────────────────────────
// Update Complaint
// ────────────────────────────────────────────────────────────

export const updateComplaintSchema = createComplaintSchema.partial();

export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;

// ────────────────────────────────────────────────────────────
// Complaint Response
// ────────────────────────────────────────────────────────────

export const complaintResponseSchema = z.object({
  complaint_id: z.string().uuid(),
  action_taken: z.string().trim().min(1, "Describe the action taken").max(2000),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
});

export type ComplaintResponseInput = z.infer<typeof complaintResponseSchema>;

// ────────────────────────────────────────────────────────────
// Resolve Complaint
// ────────────────────────────────────────────────────────────

export const resolveComplaintSchema = z.object({
  complaint_id: z.string().uuid(),
  resolution_outcome: z
    .string()
    .trim()
    .min(1, "Resolution outcome is required")
    .max(2000),
});

export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;

// ────────────────────────────────────────────────────────────
// Escalate Complaint
// ────────────────────────────────────────────────────────────

export const escalateComplaintSchema = z.object({
  complaint_id: z.string().uuid(),
  escalated_to: z
    .string()
    .trim()
    .min(1, "Specify who the complaint is escalated to")
    .max(300),
});

export type EscalateComplaintInput = z.infer<typeof escalateComplaintSchema>;
