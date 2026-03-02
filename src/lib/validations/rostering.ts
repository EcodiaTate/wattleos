// src/lib/validations/rostering.ts
//
// ============================================================
// WattleOS V2 - Staff Rostering Validation Schemas (Module N)
// ============================================================
// Zod schemas for all rostering inputs: templates, weeks,
// shifts, availability, leave, swaps, and coverage.
// ============================================================

import { z } from "zod";

// ── Shared enums ─────────────────────────────────────────────

const shiftRoleEnum = z.enum([
  "lead",
  "co_educator",
  "general",
  "float",
  "admin",
  "kitchen",
  "maintenance",
]);

const leaveTypeEnum = z.enum([
  "sick_leave",
  "annual_leave",
  "unpaid_leave",
  "long_service_leave",
  "parental_leave",
  "compassionate_leave",
  "professional_development",
  "other",
]);

const coverageReasonEnum = z.enum([
  "sick_call",
  "approved_leave",
  "emergency",
  "no_show",
  "understaffed",
  "other",
]);

const coverageUrgencyEnum = z.enum(["low", "normal", "high", "critical"]);

const timeRegex = /^\d{2}:\d{2}$/;

// ── Roster Templates ─────────────────────────────────────────

export const createRosterTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  programId: z.string().uuid().optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
});

export type CreateRosterTemplateInput = z.infer<
  typeof createRosterTemplateSchema
>;

export const updateRosterTemplateSchema = createRosterTemplateSchema
  .partial()
  .extend({
    templateId: z.string().uuid(),
    isActive: z.boolean().optional(),
  });

export type UpdateRosterTemplateInput = z.infer<
  typeof updateRosterTemplateSchema
>;

export const createTemplateShiftSchema = z.object({
  templateId: z.string().uuid(),
  userId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  breakMinutes: z.number().int().min(0).max(120).default(30),
  classId: z.string().uuid().optional(),
  shiftRole: shiftRoleEnum.default("general"),
  notes: z.string().max(500).optional(),
});

export type CreateTemplateShiftInput = z.infer<
  typeof createTemplateShiftSchema
>;

// ── Roster Weeks ─────────────────────────────────────────────

export const createRosterWeekSchema = z.object({
  weekStartDate: z.string(),
  templateId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateRosterWeekInput = z.infer<typeof createRosterWeekSchema>;

export const publishRosterWeekSchema = z.object({
  rosterWeekId: z.string().uuid(),
});

// ── Shifts ───────────────────────────────────────────────────

export const createShiftSchema = z.object({
  rosterWeekId: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.string(),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  breakMinutes: z.number().int().min(0).max(120).default(30),
  classId: z.string().uuid().optional(),
  shiftRole: shiftRoleEnum.default("general"),
  coversForUserId: z.string().uuid().optional(),
  coverageRequestId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = z.object({
  shiftId: z.string().uuid(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  breakMinutes: z.number().int().min(0).max(120).optional(),
  classId: z.string().uuid().nullable().optional(),
  shiftRole: shiftRoleEnum.optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const cancelShiftSchema = z.object({
  shiftId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export type CancelShiftInput = z.infer<typeof cancelShiftSchema>;

// ── Staff Availability ───────────────────────────────────────

export const setRecurringAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isAvailable: z.boolean(),
  availableFrom: z.string().regex(timeRegex).optional(),
  availableUntil: z.string().regex(timeRegex).optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type SetRecurringAvailabilityInput = z.infer<
  typeof setRecurringAvailabilitySchema
>;

export const setSpecificDateAvailabilitySchema = z.object({
  specificDate: z.string(),
  isAvailable: z.boolean(),
  availableFrom: z.string().regex(timeRegex).optional(),
  availableUntil: z.string().regex(timeRegex).optional(),
  notes: z.string().max(500).optional(),
});

export type SetSpecificDateAvailabilityInput = z.infer<
  typeof setSpecificDateAvailabilitySchema
>;

// ── Leave Requests ───────────────────────────────────────────

export const createLeaveRequestSchema = z
  .object({
    leaveType: leaveTypeEnum,
    leaveTypeOther: z.string().max(100).optional(),
    startDate: z.string(),
    endDate: z.string(),
    isPartialDay: z.boolean().default(false),
    partialStartTime: z.string().regex(timeRegex).optional(),
    partialEndTime: z.string().regex(timeRegex).optional(),
    reason: z.string().max(1000).optional(),
    supportingDocumentUrl: z.string().url().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
  })
  .refine(
    (data) =>
      !data.isPartialDay || (data.partialStartTime && data.partialEndTime),
    { message: "Partial day requires both start and end times" },
  )
  .refine(
    (data) =>
      !data.isPartialDay ||
      !data.partialStartTime ||
      !data.partialEndTime ||
      data.partialEndTime > data.partialStartTime,
    { message: "End time must be after start time" },
  );

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({
  leaveRequestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reviewerNotes: z.string().max(1000).optional(),
});

export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;

// ── Shift Swaps ──────────────────────────────────────────────

export const requestShiftSwapSchema = z.object({
  offeredShiftId: z.string().uuid(),
  requestedShiftId: z.string().uuid().optional(),
  requestedFromUserId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});

export type RequestShiftSwapInput = z.infer<typeof requestShiftSwapSchema>;

export const respondToSwapSchema = z.object({
  swapRequestId: z.string().uuid(),
  accept: z.boolean(),
});

export type RespondToSwapInput = z.infer<typeof respondToSwapSchema>;

export const reviewSwapRequestSchema = z.object({
  swapRequestId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

export type ReviewSwapRequestInput = z.infer<typeof reviewSwapRequestSchema>;

// ── Coverage Requests ────────────────────────────────────────

export const createCoverageRequestSchema = z.object({
  originalShiftId: z.string().uuid(),
  reason: coverageReasonEnum,
  reasonDetail: z.string().max(500).optional(),
  leaveRequestId: z.string().uuid().optional(),
  broadcastToAllCasuals: z.boolean().default(true),
  offeredToUserIds: z.array(z.string().uuid()).optional(),
  urgency: coverageUrgencyEnum.default("normal"),
});

export type CreateCoverageRequestInput = z.infer<
  typeof createCoverageRequestSchema
>;

export const acceptCoverageRequestSchema = z.object({
  coverageRequestId: z.string().uuid(),
});

export type AcceptCoverageRequestInput = z.infer<
  typeof acceptCoverageRequestSchema
>;

export const resolveCoverageRequestSchema = z.object({
  coverageRequestId: z.string().uuid(),
  status: z.enum(["filled", "unfilled", "cancelled"]),
});

export type ResolveCoverageRequestInput = z.infer<
  typeof resolveCoverageRequestSchema
>;

// ── Filters ──────────────────────────────────────────────────

export const rosterFilterSchema = z.object({
  weekStartDate: z.string().optional(),
  classId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(["draft", "published", "locked"]).optional(),
});

export type RosterFilterInput = z.infer<typeof rosterFilterSchema>;

export const leaveFilterSchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "cancelled", "withdrawn"])
    .optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type LeaveFilterInput = z.infer<typeof leaveFilterSchema>;
