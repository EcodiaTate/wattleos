// src/lib/constants/sign-in-out.ts
//
// ============================================================
// WattleOS V2 - Sign-In/Out Kiosk Constants
// ============================================================
// Reason codes, labels, and configs for late arrival and
// early departure kiosk events.
// ============================================================

import type {
  EarlyDepartureReasonCode,
  LateArrivalReasonCode,
  SignInOutType,
} from "@/types/domain";

// ── Reason Code Configs ────────────────────────────────────

export interface ReasonCodeConfig {
  value: string;
  label: string;
  description: string;
}

export const LATE_ARRIVAL_REASONS: ReasonCodeConfig[] = [
  {
    value: "appointment" satisfies LateArrivalReasonCode,
    label: "Medical / Appointment",
    description: "Doctor, dentist, or other scheduled appointment",
  },
  {
    value: "transport" satisfies LateArrivalReasonCode,
    label: "Transport Issue",
    description: "Bus delay, traffic, or car trouble",
  },
  {
    value: "family_reason" satisfies LateArrivalReasonCode,
    label: "Family Reason",
    description: "Personal or family circumstances",
  },
  {
    value: "overslept" satisfies LateArrivalReasonCode,
    label: "Late Rising",
    description: "Child or family overslept",
  },
  {
    value: "illness_onset" satisfies LateArrivalReasonCode,
    label: "Feeling Unwell (Arrived)",
    description: "Child felt unwell but came to school",
  },
  {
    value: "weather" satisfies LateArrivalReasonCode,
    label: "Weather Conditions",
    description: "Severe weather delayed travel",
  },
  {
    value: "other" satisfies LateArrivalReasonCode,
    label: "Other",
    description: "Reason not listed above - use notes",
  },
];

export const EARLY_DEPARTURE_REASONS: ReasonCodeConfig[] = [
  {
    value: "appointment" satisfies EarlyDepartureReasonCode,
    label: "Medical / Appointment",
    description: "Doctor, dentist, or other scheduled appointment",
  },
  {
    value: "illness" satisfies EarlyDepartureReasonCode,
    label: "Child Unwell",
    description: "Child became unwell during the school day",
  },
  {
    value: "family_emergency" satisfies EarlyDepartureReasonCode,
    label: "Family Emergency",
    description: "Urgent family matter requiring early collection",
  },
  {
    value: "family_event" satisfies EarlyDepartureReasonCode,
    label: "Family Event",
    description: "Planned family occasion or activity",
  },
  {
    value: "transport" satisfies EarlyDepartureReasonCode,
    label: "Early Transport",
    description: "Bus, carpool, or transport arrangement",
  },
  {
    value: "bereavement" satisfies EarlyDepartureReasonCode,
    label: "Bereavement",
    description: "Funeral or bereavement-related",
  },
  {
    value: "other" satisfies EarlyDepartureReasonCode,
    label: "Other",
    description: "Reason not listed above - use notes",
  },
];

// ── Type Labels ─────────────────────────────────────────────

export const SIGN_IN_OUT_TYPE_CONFIG: Record<
  SignInOutType,
  {
    label: string;
    verb: string;
    action: string;
    icon: string;
    colorVar: string;
    fgVar: string;
  }
> = {
  late_arrival: {
    label: "Late Arrival",
    verb: "Arrived Late",
    action: "Sign In",
    icon: "→",
    colorVar: "var(--kiosk-late-arrival)",
    fgVar: "var(--kiosk-late-arrival-fg)",
  },
  early_departure: {
    label: "Early Departure",
    verb: "Left Early",
    action: "Sign Out",
    icon: "←",
    colorVar: "var(--kiosk-early-departure)",
    fgVar: "var(--kiosk-early-departure-fg)",
  },
};

// ── Relationship Options ────────────────────────────────────

export const RELATIONSHIP_OPTIONS = [
  "Parent / Carer",
  "Grandparent",
  "Sibling (18+)",
  "Aunt / Uncle",
  "Family Friend",
  "Other Authorised Person",
] as const;

// ── Helpers ─────────────────────────────────────────────────

export function getReasonsForType(type: SignInOutType): ReasonCodeConfig[] {
  return type === "late_arrival"
    ? LATE_ARRIVAL_REASONS
    : EARLY_DEPARTURE_REASONS;
}

export function getReasonLabel(
  type: SignInOutType,
  reasonCode: string,
): string {
  const reasons = getReasonsForType(type);
  return reasons.find((r) => r.value === reasonCode)?.label ?? reasonCode;
}
