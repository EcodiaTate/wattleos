// src/lib/validations/volunteers.ts
//
// ============================================================
// Volunteer Coordination - Zod Schemas
// ============================================================

import { z } from "zod";

// ── Volunteer profile ──────────────────────────────────────

export const CreateVolunteerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : (v ?? null))),
  phone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => v ?? null),
  wwcc_number: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v ?? null),
  wwcc_expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .transform((v) => v ?? null),
  wwcc_state: z
    .enum(["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"])
    .optional()
    .transform((v) => v ?? null),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => v ?? null),
});

export const UpdateVolunteerSchema = CreateVolunteerSchema.extend({
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

// ── Assignment ─────────────────────────────────────────────

export const CreateAssignmentSchema = z.object({
  volunteer_id: z.string().uuid(),
  excursion_id: z
    .string()
    .uuid()
    .optional()
    .transform((v) => v ?? null),
  event_name: z.string().min(1).max(200),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  role: z.string().min(1).max(100),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => v ?? null),
});

export const UpdateAssignmentSchema = z.object({
  status: z.enum(["invited", "confirmed", "declined", "attended", "no_show"]),
  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => v ?? null),
});

// ── List / filter ──────────────────────────────────────────

export const ListVolunteersSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  wwcc_status: z
    .enum(["current", "expiring_soon", "expired", "missing"])
    .optional(),
  search: z.string().max(100).optional(),
});

export const ListAssignmentsSchema = z.object({
  volunteer_id: z.string().uuid().optional(),
  excursion_id: z.string().uuid().optional(),
  status: z
    .enum(["invited", "confirmed", "declined", "attended", "no_show"])
    .optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ── Inferred input types ───────────────────────────────────

export type CreateVolunteerInput = z.infer<typeof CreateVolunteerSchema>;
export type UpdateVolunteerInput = z.infer<typeof UpdateVolunteerSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
export type ListVolunteersInput = z.infer<typeof ListVolunteersSchema>;
export type ListAssignmentsInput = z.infer<typeof ListAssignmentsSchema>;
