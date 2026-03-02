// src/lib/validations/absence-followup.ts
//
// ============================================================
// Unexplained Absence Follow-up - Zod Schemas
// ============================================================

import { z } from "zod";

// ============================================================
// Config
// ============================================================

export const UpdateAbsenceFollowupConfigSchema = z.object({
  // HH:MM format validated by regex
  cutoff_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format (e.g. 09:30)"),
  auto_notify_guardians: z.boolean(),
  notification_message_template: z
    .string()
    .min(10, "Template must be at least 10 characters"),
  escalation_minutes: z
    .number()
    .int()
    .min(30, "Minimum 30 minutes")
    .max(480, "Maximum 480 minutes (8 hours)"),
  enabled: z.boolean(),
});

export type UpdateAbsenceFollowupConfigInput = z.infer<
  typeof UpdateAbsenceFollowupConfigSchema
>;

// ============================================================
// Generate Alerts
// ============================================================

export const GenerateAlertsSchema = z.object({
  // Optional - defaults to today in the action
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
});

export type GenerateAlertsInput = z.infer<typeof GenerateAlertsSchema>;

// ============================================================
// Record Explanation
// ============================================================

export const RecordExplanationSchema = z.object({
  alert_id: z.string().uuid("Invalid alert ID"),
  explanation: z.string().min(5, "Explanation must be at least 5 characters"),
  explanation_source: z.enum([
    "guardian_call",
    "guardian_app",
    "staff_entry",
    "auto",
  ]),
  // Optionally update the attendance record to 'excused'
  mark_attendance_excused: z.boolean().optional().default(false),
});

export type RecordExplanationInput = z.infer<typeof RecordExplanationSchema>;

// ============================================================
// Send Notification
// ============================================================

export const SendNotificationSchema = z.object({
  alert_id: z.string().uuid("Invalid alert ID"),
  guardian_ids: z
    .array(z.string().uuid())
    .min(1, "At least one guardian must be selected"),
  channel: z.enum(["push", "sms", "email"]),
});

export type SendNotificationInput = z.infer<typeof SendNotificationSchema>;

// ============================================================
// Dismiss Alert
// ============================================================

export const DismissAlertSchema = z.object({
  alert_id: z.string().uuid("Invalid alert ID"),
  reason: z.string().optional(),
});

export type DismissAlertInput = z.infer<typeof DismissAlertSchema>;

// ============================================================
// List / Filter Alerts
// ============================================================

export const ListAlertsFilterSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z
    .enum(["pending", "notified", "explained", "escalated", "dismissed"])
    .optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export type ListAlertsFilterInput = z.input<typeof ListAlertsFilterSchema>;
export type ListAlertsFilter = z.infer<typeof ListAlertsFilterSchema>;
