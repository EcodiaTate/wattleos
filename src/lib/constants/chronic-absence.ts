// src/lib/constants/chronic-absence.ts
//
// ============================================================
// Chronic Absence Monitoring - Constants
// ============================================================
// Attendance thresholds and configuration defaults for the
// chronic absence monitoring module. These match Australian
// state education department definitions:
//
//   "Regular attendance" - 90%+ (we use this as floor for "good")
//   "At risk"            - 85–89% (early-intervention territory)
//   "Chronically absent" - 80–84% (formal monitoring required)
//   "Severely absent"    - <80%   (welfare referral may be needed)
//
// Individual tenants can adjust these in their config.
// ============================================================

import type {
  ChronicAbsenceStatus,
  FollowUpMethod,
  FollowUpOutcome,
  AbsenceFlagStatus,
} from "@/types/domain";

// ============================================================
// Default Thresholds
// ============================================================

export const DEFAULT_THRESHOLDS = {
  at_risk: 90, // Below 90% → at risk (was 85 in migration, configurable)
  chronic: 80, // Below 80% → chronic
  severe: 70, // Below 70% → severe
} as const;

export const DEFAULT_ROLLING_WINDOW_DAYS = 90;

// ============================================================
// Absence Status Config
// ============================================================

export const CHRONIC_ABSENCE_STATUS_CONFIG: Record<
  ChronicAbsenceStatus,
  {
    label: string;
    description: string;
    cssVar: string; // --chronic-absence-<name>
    sortOrder: number; // For sorting (severe first)
  }
> = {
  severe: {
    label: "Severely Absent",
    description:
      "Attendance is critically low - welfare referral may be warranted",
    cssVar: "severe",
    sortOrder: 0,
  },
  chronic: {
    label: "Chronically Absent",
    description:
      "Formally absent beyond the chronic threshold - monitoring required",
    cssVar: "chronic",
    sortOrder: 1,
  },
  at_risk: {
    label: "At Risk",
    description:
      "Attendance trending toward the chronic threshold - early intervention",
    cssVar: "at-risk",
    sortOrder: 2,
  },
  good: {
    label: "Regular Attendance",
    description: "Attendance is within acceptable range",
    cssVar: "good",
    sortOrder: 3,
  },
} as const;

// ============================================================
// Follow-Up Method Config
// ============================================================

export const FOLLOW_UP_METHOD_OPTIONS: Array<{
  value: FollowUpMethod;
  label: string;
}> = [
  { value: "phone_call", label: "Phone Call" },
  { value: "sms", label: "SMS / Text" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In Person" },
  { value: "letter", label: "Letter" },
  { value: "welfare_check", label: "Welfare Check" },
  { value: "referral", label: "External Referral" },
  { value: "other", label: "Other" },
];

// ============================================================
// Follow-Up Outcome Config
// ============================================================

export const FOLLOW_UP_OUTCOME_OPTIONS: Array<{
  value: FollowUpOutcome;
  label: string;
}> = [
  { value: "contacted", label: "Successfully Contacted" },
  { value: "no_answer", label: "No Answer" },
  { value: "message_left", label: "Message Left" },
  { value: "referred", label: "Referred to Agency" },
  { value: "resolved", label: "Matter Resolved" },
  { value: "escalated", label: "Escalated" },
  { value: "other", label: "Other" },
];

// ============================================================
// Flag Status Config
// ============================================================

export const FLAG_STATUS_CONFIG: Record<
  AbsenceFlagStatus,
  { label: string; description: string }
> = {
  active: { label: "Active", description: "Student is under monitoring" },
  resolved: {
    label: "Resolved",
    description: "Attendance improved or concern addressed",
  },
  dismissed: {
    label: "Dismissed",
    description: "Flag was a false positive or data issue",
  },
} as const;

// ============================================================
// Rolling Window Options (for config UI)
// ============================================================

export const ROLLING_WINDOW_OPTIONS = [
  { value: 14, label: "2 weeks" },
  { value: 28, label: "4 weeks" },
  { value: 42, label: "6 weeks (1 term approx.)" },
  { value: 90, label: "90 days (1 term)" },
  { value: 180, label: "6 months (2 terms)" },
  { value: 365, label: "Full year" },
] as const;
