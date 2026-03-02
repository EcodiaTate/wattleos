// src/lib/validations/ratios.ts
//
// ============================================================
// Zod Schemas - Ratio Monitoring (Reg 123)
// ============================================================
// Validates floor sign-in/out, breach acknowledgement, and
// history query inputs.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Toggle Floor Sign-In
// ────────────────────────────────────────────────────────────

export const toggleFloorSignInSchema = z.object({
  class_id: z.string("Class is required").uuid("Invalid class ID"),
});

export type ToggleFloorSignInInput = z.infer<typeof toggleFloorSignInSchema>;

// ────────────────────────────────────────────────────────────
// Acknowledge Breach
// ────────────────────────────────────────────────────────────

export const acknowledgeBreachSchema = z.object({
  log_id: z.string("Ratio log ID is required").uuid("Invalid ratio log ID"),
});

export type AcknowledgeBreachInput = z.infer<typeof acknowledgeBreachSchema>;

// ────────────────────────────────────────────────────────────
// Ratio History (per class)
// ────────────────────────────────────────────────────────────

export const getRatioHistorySchema = z.object({
  class_id: z.string().uuid("Invalid class ID"),
  from_date: z.string().date("Invalid date format"),
  to_date: z.string().date("Invalid date format"),
});

export type GetRatioHistoryInput = z.infer<typeof getRatioHistorySchema>;

// ────────────────────────────────────────────────────────────
// Breach History (cross-class)
// ────────────────────────────────────────────────────────────

export const getBreachHistorySchema = z.object({
  from_date: z
    .string()
    .date("Invalid date format")
    .nullish()
    .transform((v) => v || null),
  to_date: z
    .string()
    .date("Invalid date format")
    .nullish()
    .transform((v) => v || null),
});

export type GetBreachHistoryInput = z.infer<typeof getBreachHistorySchema>;
