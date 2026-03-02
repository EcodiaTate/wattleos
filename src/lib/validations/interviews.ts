// src/lib/validations/interviews.ts
//
// ============================================================
// Zod Schemas - Parent-Teacher Interview Scheduling (Module X)
// ============================================================

import { z } from "zod";

// ── Session ──────────────────────────────────────────────────

export const createInterviewSessionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title is too long"),

    description: z.string().trim().max(1000).optional(),

    sessionStartDate: z
      .string()
      .date("Please enter a valid start date (YYYY-MM-DD)"),

    sessionEndDate: z
      .string()
      .date("Please enter a valid end date (YYYY-MM-DD)"),

    bookingOpenAt: z
      .string()
      .datetime({ message: "Invalid booking open time" })
      .nullish()
      .transform((v) => v || null),

    bookingCloseAt: z
      .string()
      .datetime({ message: "Invalid booking close time" })
      .nullish()
      .transform((v) => v || null),

    slotDurationMins: z
      .number()
      .int()
      .min(5, "Minimum slot duration is 5 minutes")
      .max(120, "Maximum slot duration is 120 minutes")
      .default(15),

    allowCancellation: z.boolean().default(true),

    cancellationCutoffHours: z
      .number()
      .int()
      .min(0)
      .max(168, "Cutoff cannot exceed 7 days")
      .default(24),

    notes: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.sessionEndDate >= d.sessionStartDate, {
    message: "End date must be on or after start date",
    path: ["sessionEndDate"],
  });

export type CreateInterviewSessionInput = z.infer<
  typeof createInterviewSessionSchema
>;

export const updateInterviewSessionSchema =
  createInterviewSessionSchema.partial();

export type UpdateInterviewSessionInput = z.infer<
  typeof updateInterviewSessionSchema
>;

// ── Slot Generation ──────────────────────────────────────────
// Staff or admin can generate a block of slots for one or more days

export const generateSlotsSchema = z
  .object({
    sessionId: z.string().uuid("Invalid session ID"),

    staffUserId: z.string().uuid("Invalid staff user ID"),

    dates: z
      .array(z.string().date("Invalid date"))
      .min(1, "At least one date is required")
      .max(60, "Cannot generate more than 60 days at once"),

    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),

    endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM"),

    location: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>;

// ── Single Slot Mutation ──────────────────────────────────────

export const blockSlotSchema = z.object({
  slotId: z.string().uuid("Invalid slot ID"),
  reason: z.string().trim().max(500).optional(),
});

export type BlockSlotInput = z.infer<typeof blockSlotSchema>;

// ── Booking ───────────────────────────────────────────────────

export const createBookingSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),

  slotId: z.string().uuid("Invalid slot ID"),

  studentId: z.string().uuid("Invalid student ID"),

  guardianName: z
    .string()
    .trim()
    .min(1, "Guardian name is required")
    .max(200, "Name is too long"),

  guardianEmail: z
    .string()
    .email("Invalid email address")
    .max(200)
    .nullish()
    .transform((v) => v || null),

  guardianPhone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ── Cancellation ─────────────────────────────────────────────

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  reason: z.string().trim().max(500).optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// ── Outcome ───────────────────────────────────────────────────

export const recordOutcomeSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  outcomeNotes: z
    .string()
    .trim()
    .min(1, "Outcome notes are required")
    .max(5000, "Notes are too long"),
  status: z.enum(["completed", "no_show"]),
});

export type RecordOutcomeInput = z.infer<typeof recordOutcomeSchema>;

// ── Filter / List ─────────────────────────────────────────────

export const listSessionsFilterSchema = z.object({
  status: z.enum(["draft", "open", "closed", "archived"]).optional(),
  includeArchived: z.boolean().default(false),
});

export type ListSessionsFilter = z.input<typeof listSessionsFilterSchema>;

export const listSlotsFilterSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  staffUserId: z.string().uuid().optional(),
  date: z.string().date().optional(),
  availableOnly: z.boolean().default(false),
});

export type ListSlotsFilter = z.input<typeof listSlotsFilterSchema>;
