// src/lib/validations/incidents.ts
//
// ============================================================
// Zod Schemas - Module A: IITI Incident Register (Reg 87)
// ============================================================
// Validates all incident mutations before database writes.
// Serious incidents require a reason; regulator notification
// requires an NQA ITS reference number.
// ============================================================

import { z } from "zod";

const incidentTypeEnum = z.enum(["injury", "illness", "trauma", "near_miss"]);
const severityEnum = z.enum(["minor", "moderate", "serious"]);
const notificationMethodEnum = z.enum([
  "in_app",
  "phone",
  "email",
  "in_person",
]);
const incidentStatusEnum = z.enum([
  "open",
  "parent_notified",
  "regulator_notified",
  "closed",
]);

// ────────────────────────────────────────────────────────────
// Create Incident
// ────────────────────────────────────────────────────────────

export const createIncidentSchema = z
  .object({
    student_ids: z
      .array(z.string().uuid("Invalid student ID"))
      .min(1, "At least one student must be selected"),
    occurred_at: z
      .string()
      .min(1, "Occurrence date/time is required")
      .refine((v) => !isNaN(Date.parse(v)), "Invalid date/time"),
    location: z
      .string()
      .trim()
      .min(1, "Location is required")
      .max(200, "Location is too long"),
    incident_type: incidentTypeEnum,
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description is too long"),
    first_aid_administered: z
      .string()
      .trim()
      .max(2000, "First aid description is too long")
      .nullish()
      .transform((v) => v || null),
    first_aid_by: z
      .string()
      .uuid("Invalid user ID for first aid provider")
      .nullish()
      .transform((v) => v || null),
    witness_names: z.array(z.string().trim().max(200)).optional().default([]),
    severity: severityEnum,
    is_serious_incident: z.boolean(),
    serious_incident_reason: z
      .string()
      .trim()
      .max(2000, "Reason is too long")
      .nullish()
      .transform((v) => v || null),
  })
  .refine(
    (data) =>
      !data.is_serious_incident ||
      (data.serious_incident_reason && data.serious_incident_reason.length > 0),
    {
      message: "A reason is required for serious incidents (Reg 12)",
      path: ["serious_incident_reason"],
    },
  );

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

// ────────────────────────────────────────────────────────────
// Update Incident
// ────────────────────────────────────────────────────────────

export const updateIncidentSchema = z.object({
  location: z
    .string()
    .trim()
    .min(1, "Location cannot be empty")
    .max(200, "Location is too long")
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description is too long")
    .optional(),
  first_aid_administered: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
  first_aid_by: z
    .string()
    .uuid("Invalid user ID")
    .nullish()
    .transform((v) => v || null),
  witness_names: z.array(z.string().trim().max(200)).optional(),
  severity: severityEnum.optional(),
  is_serious_incident: z.boolean().optional(),
  serious_incident_reason: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

// ────────────────────────────────────────────────────────────
// Record Parent Notification
// ────────────────────────────────────────────────────────────

export const recordParentNotificationSchema = z.object({
  method: notificationMethodEnum,
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .nullish()
    .transform((v) => v || null),
});

export type RecordParentNotificationInput = z.infer<
  typeof recordParentNotificationSchema
>;

// ────────────────────────────────────────────────────────────
// Record Regulator Notification (NQA ITS - Serious Incidents)
// ────────────────────────────────────────────────────────────

export const recordRegulatorNotificationSchema = z.object({
  notified_at: z
    .string()
    .min(1, "Notification date/time is required")
    .refine((v) => !isNaN(Date.parse(v)), "Invalid date/time"),
  reference: z
    .string()
    .trim()
    .min(1, "NQA ITS reference number is required")
    .max(100, "Reference number is too long"),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .nullish()
    .transform((v) => v || null),
});

export type RecordRegulatorNotificationInput = z.infer<
  typeof recordRegulatorNotificationSchema
>;

// ────────────────────────────────────────────────────────────
// List Incidents Filter
// ────────────────────────────────────────────────────────────

export const listIncidentsFilterSchema = z.object({
  status: incidentStatusEnum.optional(),
  incident_type: incidentTypeEnum.optional(),
  is_serious_incident: z.boolean().optional(),
  student_id: z.string().uuid().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(25),
});

export type ListIncidentsFilter = z.infer<typeof listIncidentsFilterSchema>;
