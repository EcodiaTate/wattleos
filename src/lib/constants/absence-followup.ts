// src/lib/constants/absence-followup.ts
//
// ============================================================
// Unexplained Absence Follow-up - Constants
// ============================================================

import type {
  AbsenceAlertStatus,
  AbsenceNotificationChannel,
  ExplanationSource,
} from "@/types/domain";

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_CUTOFF_TIME = "09:30";

export const DEFAULT_NOTIFICATION_TEMPLATE =
  "Hi {guardian_name}, {student_name} has been marked absent today ({date}). " +
  "Please contact the school to provide an explanation.";

export const DEFAULT_ESCALATION_MINUTES = 120;

// ============================================================
// Alert Status Configuration
// ============================================================

export const ALERT_STATUS_CONFIG: Record<
  AbsenceAlertStatus,
  {
    label: string;
    description: string;
    cssVar: string;
    sortOrder: number;
  }
> = {
  pending: {
    label: "Pending",
    description: "Absence has not yet been explained or acknowledged",
    cssVar: "pending",
    sortOrder: 0,
  },
  escalated: {
    label: "Escalated",
    description: "No response received - escalated to head of school",
    cssVar: "escalated",
    sortOrder: 1,
  },
  notified: {
    label: "Notified",
    description: "Guardian has been notified, awaiting response",
    cssVar: "notified",
    sortOrder: 2,
  },
  explained: {
    label: "Explained",
    description: "Guardian has provided an explanation for the absence",
    cssVar: "explained",
    sortOrder: 3,
  },
  dismissed: {
    label: "Dismissed",
    description: "Alert dismissed - no follow-up required",
    cssVar: "dismissed",
    sortOrder: 4,
  },
} as const;

// ============================================================
// Explanation Source Options
// ============================================================

export const EXPLANATION_SOURCE_OPTIONS: Array<{
  value: ExplanationSource;
  label: string;
}> = [
  { value: "guardian_call", label: "Guardian called the school" },
  { value: "guardian_app", label: "Guardian responded via app" },
  { value: "staff_entry", label: "Staff recorded explanation" },
  { value: "auto", label: "Auto-resolved" },
];

// ============================================================
// Notification Channel Options
// ============================================================

export const NOTIFICATION_CHANNEL_OPTIONS: Array<{
  value: AbsenceNotificationChannel;
  label: string;
  available: boolean;
  unavailableReason?: string;
}> = [
  { value: "push", label: "Push Notification", available: true },
  {
    value: "sms",
    label: "SMS",
    available: false,
    unavailableReason: "SMS gateway not configured",
  },
  {
    value: "email",
    label: "Email",
    available: false,
    unavailableReason: "Email dispatch not configured",
  },
];

// ============================================================
// Notification Template Placeholder Hints
// ============================================================

export const TEMPLATE_PLACEHOLDERS = [
  { key: "{guardian_name}", description: "Guardian's first name" },
  { key: "{student_name}", description: "Student's preferred or first name" },
  { key: "{date}", description: "Absence date (e.g. Monday 24 Feb)" },
  { key: "{school_name}", description: "Your school's name" },
] as const;

// ============================================================
// Escalation Minutes Options (for config form)
// ============================================================

export const ESCALATION_MINUTES_OPTIONS: Array<{
  value: number;
  label: string;
}> = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours (end of day)" },
];
