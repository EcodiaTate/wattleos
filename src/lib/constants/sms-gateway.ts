// src/lib/constants/sms-gateway.ts
//
// ============================================================
// WattleOS - SMS Gateway Constants
// ============================================================

import type { SmsProvider, SmsStatus, SmsMessageType } from "@/types/domain";

// ── Providers ────────────────────────────────────────────────

export const SMS_PROVIDER_OPTIONS: {
  value: SmsProvider;
  label: string;
  description: string;
  needs_secret: boolean;
}[] = [
  {
    value: "messagemedia",
    label: "MessageMedia",
    description:
      "Australian-based SMS provider. Requires API Key + API Secret.",
    needs_secret: true,
  },
  {
    value: "burst",
    label: "Burst SMS",
    description: "Australian-based SMS provider. Requires API Key only.",
    needs_secret: false,
  },
];

// ── Status config ────────────────────────────────────────────

export const SMS_STATUS_CONFIG: Record<
  SmsStatus,
  { label: string; cssVar: string; sortOrder: number }
> = {
  pending: { label: "Pending", cssVar: "pending", sortOrder: 0 },
  sent: { label: "Sent", cssVar: "sent", sortOrder: 1 },
  delivered: { label: "Delivered", cssVar: "delivered", sortOrder: 2 },
  failed: { label: "Failed", cssVar: "failed", sortOrder: 3 },
  bounced: { label: "Bounced", cssVar: "bounced", sortOrder: 4 },
  opted_out: { label: "Opted Out", cssVar: "opted-out", sortOrder: 5 },
};

// ── Message type labels ──────────────────────────────────────

export const SMS_MESSAGE_TYPE_LABELS: Record<SmsMessageType, string> = {
  general: "General",
  absence_alert: "Absence Alert",
  emergency: "Emergency",
  reminder: "Reminder",
  broadcast: "Broadcast",
};

// ── Limits / constraints ─────────────────────────────────────

/** Standard SMS segment length (GSM-7 encoding). */
export const SMS_SEGMENT_LENGTH = 160;

/** Max body length stored - 10 segments. */
export const SMS_MAX_BODY_LENGTH = 1600;

/** Default daily send limit shown in config form. */
export const SMS_DEFAULT_DAILY_LIMIT = 500;

/** Max sender ID length (MSISDN standard). */
export const SMS_MAX_SENDER_ID_LENGTH = 11;

// ── Built-in message templates ───────────────────────────────

export interface SmsTemplate {
  key: string;
  label: string;
  type: SmsMessageType;
  body: string;
  /** Placeholders: {student_name}, {date}, {school_name}, {guardian_name} */
  placeholders: string[];
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    key: "absence_alert",
    label: "Absence Alert",
    type: "absence_alert",
    body: "Hi {guardian_name}, {student_name} has been marked absent today ({date}). Please contact {school_name} if you need to provide an explanation.",
    placeholders: ["guardian_name", "student_name", "date", "school_name"],
  },
  {
    key: "late_arrival",
    label: "Late Arrival Acknowledgement",
    type: "reminder",
    body: "Hi {guardian_name}, we've recorded a late arrival for {student_name} at {school_name} today ({date}). Please sign in at the front office.",
    placeholders: ["guardian_name", "student_name", "school_name", "date"],
  },
  {
    key: "emergency_all_clear",
    label: "Emergency All Clear",
    type: "emergency",
    body: "WATTLEOS ALERT: The emergency situation at {school_name} has been resolved. All students are safe. We will be in touch with more details shortly.",
    placeholders: ["school_name"],
  },
  {
    key: "emergency_lockdown",
    label: "Emergency - Lockdown",
    type: "emergency",
    body: "URGENT - {school_name}: We are currently in a lockdown situation. Students are safe. Please do NOT come to the school. Further updates to follow.",
    placeholders: ["school_name"],
  },
  {
    key: "general_reminder",
    label: "General Reminder",
    type: "reminder",
    body: "Reminder from {school_name}: {message}",
    placeholders: ["school_name", "message"],
  },
];

// ── Opt-out keywords (Carriers & ACMA compliance) ────────────

/** Keywords that, when received as a reply, must trigger opt-out. */
export const SMS_OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
] as const;
