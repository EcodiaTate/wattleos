// src/lib/validations/emergency-coordination.ts
//
// ============================================================
// Zod Schemas - Live Emergency Coordination (Module M)
// ============================================================

import { z } from "zod";

// ── Enums ───────────────────────────────────────────────────

const eventTypes = [
  "fire_evacuation",
  "lockdown",
  "shelter_in_place",
  "medical_emergency",
  "other",
] as const;

const severities = ["critical", "high", "medium"] as const;

const zoneTypes = ["indoor", "outdoor", "assembly_point"] as const;

const zoneStatuses = [
  "pending",
  "evacuating",
  "clear",
  "needs_assistance",
  "blocked",
] as const;

const accountMethods = [
  "visual",
  "roll_call",
  "parent_collected",
  "absent_prior",
] as const;

const staffRoles = [
  "warden",
  "first_aid",
  "coordinator",
  "evacuator",
  "general",
] as const;

const staffStatuses = [
  "responding",
  "at_assembly",
  "assisting",
  "off_site",
] as const;

const eventStatuses = [
  "activated",
  "responding",
  "all_clear",
  "resolved",
  "cancelled",
] as const;

// ── Activate Emergency ────────────────────────────────────

export const activateEmergencySchema = z
  .object({
    event_type: z.enum(eventTypes, {
      message: "Select an emergency type",
    }),
    event_type_other: z
      .string()
      .trim()
      .max(200, "Must be under 200 characters")
      .nullish()
      .transform((v) => v || null),
    severity: z.enum(severities).default("high"),
    location_description: z
      .string()
      .trim()
      .max(500, "Must be under 500 characters")
      .nullish()
      .transform((v) => v || null),
    instructions: z
      .string()
      .trim()
      .max(2000, "Must be under 2000 characters")
      .nullish()
      .transform((v) => v || null),
    assembly_point: z
      .string()
      .trim()
      .max(500, "Must be under 500 characters")
      .nullish()
      .transform((v) => v || null),
    linked_drill_id: z
      .string()
      .uuid()
      .nullish()
      .transform((v) => v || null),
  })
  .refine(
    (d) =>
      d.event_type !== "other" ||
      (d.event_type_other && d.event_type_other.trim().length > 0),
    {
      message: "Describe the emergency type when selecting 'Other'",
      path: ["event_type_other"],
    },
  );

export type ActivateEmergencyInput = z.infer<typeof activateEmergencySchema>;

// ── Report Zone Status ───────────────────────────────────

export const reportZoneStatusSchema = z.object({
  event_zone_id: z.string().uuid(),
  status: z.enum(zoneStatuses, {
    message: "Select a zone status",
  }),
  notes: z
    .string()
    .trim()
    .max(1000, "Must be under 1000 characters")
    .nullish()
    .transform((v) => v || null),
  headcount_reported: z
    .number()
    .int()
    .min(0)
    .max(500)
    .nullish()
    .transform((v) => v ?? null),
});

export type ReportZoneStatusInput = z.infer<typeof reportZoneStatusSchema>;

// ── Account Student ──────────────────────────────────────

export const accountStudentSchema = z.object({
  student_id: z.string().uuid(),
  accounted_for: z.boolean(),
  method: z.enum(accountMethods).nullish(),
  zone_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(500, "Must be under 500 characters")
    .nullish()
    .transform((v) => v || null),
});

export type AccountStudentInput = z.infer<typeof accountStudentSchema>;

// ── Bulk Account Students ────────────────────────────────

export const bulkAccountStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, "Select at least one student"),
  method: z.enum(accountMethods).default("roll_call"),
  zone_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type BulkAccountStudentsInput = z.infer<
  typeof bulkAccountStudentsSchema
>;

// ── Account Staff ────────────────────────────────────────

export const accountStaffSchema = z.object({
  user_id: z.string().uuid(),
  role_during_event: z.enum(staffRoles).nullish(),
  status: z.enum(staffStatuses).default("at_assembly"),
  zone_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(500, "Must be under 500 characters")
    .nullish()
    .transform((v) => v || null),
});

export type AccountStaffInput = z.infer<typeof accountStaffSchema>;

// ── Add Event Note ───────────────────────────────────────

export const addEventNoteSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Enter a note")
    .max(2000, "Must be under 2000 characters"),
});

export type AddEventNoteInput = z.infer<typeof addEventNoteSchema>;

// ── Send Emergency Announcement ──────────────────────────

export const sendEmergencyAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title")
    .max(200, "Must be under 200 characters"),
  body: z
    .string()
    .trim()
    .min(1, "Enter a message")
    .max(2000, "Must be under 2000 characters"),
});

export type SendEmergencyAnnouncementInput = z.infer<
  typeof sendEmergencyAnnouncementSchema
>;

// ── Create Zone ──────────────────────────────────────────

export const createZoneSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Zone name is required")
    .max(200, "Must be under 200 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Must be under 1000 characters")
    .nullish()
    .transform((v) => v || null),
  zone_type: z.enum(zoneTypes, {
    message: "Select a zone type",
  }),
  location_details: z
    .string()
    .trim()
    .max(500, "Must be under 500 characters")
    .nullish()
    .transform((v) => v || null),
  primary_warden_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
  backup_warden_ids: z.array(z.string().uuid()).default([]),
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(1000)
    .nullish()
    .transform((v) => v ?? null),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

// ── Update Zone ──────────────────────────────────────────

export const updateZoneSchema = createZoneSchema.partial();

export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

// ── Event History Filter ─────────────────────────────────

export const eventHistoryFilterSchema = z.object({
  event_type: z.enum(eventTypes).nullish(),
  status: z.enum(eventStatuses).nullish(),
  from_date: z.string().date("Enter a valid date").nullish(),
  to_date: z.string().date("Enter a valid date").nullish(),
});

export type EventHistoryFilter = z.infer<typeof eventHistoryFilterSchema>;
