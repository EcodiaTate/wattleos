// src/lib/constants/wellbeing.ts
//
// ============================================================
// WattleOS V2 - Wellbeing & Pastoral Care (Module P)
// ============================================================
// Configuration constants for wellbeing entities:
// labels, colours (CSS var references), descriptions,
// and workflow transition rules.
// ============================================================

import type {
  WellbeingFlagSeverity,
  WellbeingFlagStatus,
  ReferralStatus,
  ReferralSpecialty,
  CounsellorNoteType,
  CheckInStatus,
  PastoralCategory,
} from "@/types/domain";

// ── Severity config ───────────────────────────────────────────────

export const WELLBEING_SEVERITY_CONFIG: Record<
  WellbeingFlagSeverity,
  { label: string; color: string; description: string; order: number }
> = {
  low: {
    label: "Low",
    color: "var(--wellbeing-low)",
    description: "Minor concern, monitor and document",
    order: 1,
  },
  medium: {
    label: "Medium",
    color: "var(--wellbeing-medium)",
    description: "Moderate concern, follow-up action needed",
    order: 2,
  },
  high: {
    label: "High",
    color: "var(--wellbeing-high)",
    description: "Serious concern, prompt intervention required",
    order: 3,
  },
  critical: {
    label: "Critical",
    color: "var(--wellbeing-critical)",
    description: "Immediate intervention required, notify leadership",
    order: 4,
  },
};

// ── Flag status config ──────────────────────────────────────────────

export const WELLBEING_STATUS_CONFIG: Record<
  WellbeingFlagStatus,
  { label: string; color: string; description: string }
> = {
  open: {
    label: "Open",
    color: "var(--wellbeing-open)",
    description: "Active concern requiring attention",
  },
  in_progress: {
    label: "In Progress",
    color: "var(--wellbeing-in-progress)",
    description: "Intervention underway",
  },
  resolved: {
    label: "Resolved",
    color: "var(--wellbeing-resolved)",
    description: "Concern addressed and closed",
  },
  archived: {
    label: "Archived",
    color: "var(--wellbeing-archived)",
    description: "Archived for historical reference",
  },
};

export const VALID_FLAG_STATUS_TRANSITIONS: Record<
  WellbeingFlagStatus,
  WellbeingFlagStatus[]
> = {
  open: ["in_progress", "resolved"],
  in_progress: ["open", "resolved"],
  resolved: ["archived", "open"],
  archived: [],
};

// ── Referral status config ────────────────────────────────────────────

export const REFERRAL_STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; color: string; description: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--referral-pending)",
    description: "Referral submitted, awaiting response",
  },
  accepted: {
    label: "Accepted",
    color: "var(--referral-accepted)",
    description: "Referral accepted by specialist",
  },
  in_progress: {
    label: "In Progress",
    color: "var(--referral-in-progress)",
    description: "Active engagement with specialist",
  },
  closed: {
    label: "Closed",
    color: "var(--referral-closed)",
    description: "Referral process complete",
  },
  declined: {
    label: "Declined",
    color: "var(--referral-declined)",
    description: "Referral not accepted",
  },
};

export const VALID_REFERRAL_STATUS_TRANSITIONS: Record<
  ReferralStatus,
  ReferralStatus[]
> = {
  pending: ["accepted", "declined"],
  accepted: ["in_progress", "declined"],
  in_progress: ["closed"],
  closed: ["pending"],
  declined: ["pending"],
};

// ── Specialty config ───────────────────────────────────────────────

export const REFERRAL_SPECIALTY_CONFIG: Record<
  ReferralSpecialty,
  { label: string; emoji: string }
> = {
  speech_pathology: { label: "Speech Pathology", emoji: "🗣️" },
  occupational_therapy: { label: "Occupational Therapy", emoji: "✋" },
  psychology: { label: "Psychology", emoji: "🧠" },
  social_work: { label: "Social Work", emoji: "🤝" },
  physiotherapy: { label: "Physiotherapy", emoji: "🏃" },
  paediatrics: { label: "Paediatrics", emoji: "👶" },
  counselling: { label: "Counselling", emoji: "💬" },
  other: { label: "Other", emoji: "📋" },
};

// ── Case note type config ─────────────────────────────────────────────

export const CASE_NOTE_TYPE_CONFIG: Record<
  CounsellorNoteType,
  { label: string; description: string }
> = {
  initial_assessment: {
    label: "Initial Assessment",
    description: "First contact and needs assessment",
  },
  follow_up: {
    label: "Follow-up Session",
    description: "Ongoing support session",
  },
  crisis_intervention: {
    label: "Crisis Intervention",
    description: "Emergency or crisis response",
  },
  parent_consultation: {
    label: "Parent Consultation",
    description: "Meeting with parent/guardian",
  },
  external_liaison: {
    label: "External Liaison",
    description: "Coordination with external specialist or agency",
  },
  closure: {
    label: "Case Closure",
    description: "Final session and case summary",
  },
};

// ── Check-in status config ────────────────────────────────────────────

export const CHECKIN_STATUS_CONFIG: Record<
  CheckInStatus,
  { label: string; color: string }
> = {
  scheduled: { label: "Scheduled", color: "var(--checkin-scheduled)" },
  completed: { label: "Completed", color: "var(--checkin-completed)" },
  rescheduled: { label: "Rescheduled", color: "var(--checkin-rescheduled)" },
  no_show: { label: "No Show", color: "var(--checkin-no-show)" },
};

// ── Pastoral category config ────────────────────────────────────────────

export const PASTORAL_CATEGORY_CONFIG: Record<
  PastoralCategory,
  { label: string; color: string; emoji: string }
> = {
  behaviour: {
    label: "Behaviour",
    color: "var(--pastoral-behaviour)",
    emoji: "⚡",
  },
  emotional: {
    label: "Emotional",
    color: "var(--pastoral-emotional)",
    emoji: "💜",
  },
  social: {
    label: "Social",
    color: "var(--pastoral-social)",
    emoji: "👥",
  },
  family: {
    label: "Family",
    color: "var(--pastoral-family)",
    emoji: "🏠",
  },
  health: {
    label: "Health",
    color: "var(--pastoral-health)",
    emoji: "🩺",
  },
  academic: {
    label: "Academic",
    color: "var(--pastoral-academic)",
    emoji: "📚",
  },
  other: {
    label: "Other",
    color: "var(--pastoral-other)",
    emoji: "📋",
  },
};

// ── Wellbeing areas for check-in ─────────────────────────────────────────

export const WELLBEING_CHECK_IN_AREAS = [
  "Friendships & social connection",
  "Safety at school",
  "Feelings about learning",
  "Home life",
  "Physical health",
  "Sleep & energy",
  "Worry or anxiety",
  "Concentration & focus",
  "Self-esteem & confidence",
  "Transitions & change",
] as const;

export type WellbeingCheckInArea = (typeof WELLBEING_CHECK_IN_AREAS)[number];

// ── Mood rating labels ──────────────────────────────────────────────

export const MOOD_RATING_CONFIG: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Very Sad", emoji: "😢", color: "var(--wellbeing-critical)" },
  2: { label: "Sad", emoji: "😟", color: "var(--wellbeing-high)" },
  3: { label: "Okay", emoji: "😐", color: "var(--wellbeing-medium)" },
  4: { label: "Good", emoji: "🙂", color: "var(--wellbeing-low)" },
  5: { label: "Great", emoji: "😄", color: "var(--wellbeing-resolved)" },
};
