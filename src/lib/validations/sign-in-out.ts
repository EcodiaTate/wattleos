// src/lib/validations/sign-in-out.ts
//
// ============================================================
// WattleOS V2 - Sign-In/Out Kiosk Validations
// ============================================================

import { z } from "zod";

// ── Create Record ───────────────────────────────────────────

export const CreateSignInOutSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  type: z.enum(["late_arrival", "early_departure"]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  occurredAt: z.string().datetime("Must be a valid ISO timestamp"),
  reasonCode: z.string().min(1, "Reason is required"),
  reasonNotes: z.string().max(500, "Notes must be 500 characters or fewer").nullable().optional(),
  signedByName: z.string().max(100, "Name must be 100 characters or fewer").nullable().optional(),
  signedByRelationship: z.string().max(60, "Relationship must be 60 characters or fewer").nullable().optional(),
});

export type CreateSignInOutInput = z.infer<typeof CreateSignInOutSchema>;

// ── List / Filter ───────────────────────────────────────────

export const ListSignInOutSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["late_arrival", "early_departure"]).optional(),
  studentId: z.string().uuid().optional(),
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(200).optional().default(50),
});

export type ListSignInOutInput = z.infer<typeof ListSignInOutSchema>;
