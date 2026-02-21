// src/lib/constants/programs.ts
//
// ============================================================
// WattleOS V2 - Module 11: Program Constants
// ============================================================
// Display labels, colors, and config for program types,
// billing types, session statuses, and booking statuses.
//
// WHY centralised constants: Consistent labelling and colour
// across list pages, detail pages, badges, and reports.
// ============================================================

// ============================================================
// Program Types
// ============================================================

export const PROGRAM_TYPES = [
  {
    value: "before_school_care",
    label: "Before School Care",
    shortLabel: "BSC",
  },
  { value: "after_school_care", label: "After School Care", shortLabel: "ASC" },
  { value: "vacation_care", label: "Vacation Care", shortLabel: "VAC" },
  { value: "extracurricular", label: "Extracurricular", shortLabel: "EXT" },
  { value: "extended_day", label: "Extended Day", shortLabel: "EXT DAY" },
  {
    value: "adolescent_program",
    label: "Adolescent Program",
    shortLabel: "ADOL",
  },
  { value: "senior_elective", label: "Senior Elective", shortLabel: "ELECT" },
  { value: "other", label: "Other", shortLabel: "OTHER" },
] as const;

export type ProgramTypeValue = (typeof PROGRAM_TYPES)[number]["value"];

export const PROGRAM_TYPE_CONFIG: Record<
  ProgramTypeValue,
  {
    label: string;
    shortLabel: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
  }
> = {
  before_school_care: {
    label: "Before School Care",
    shortLabel: "BSC",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    icon: "🌅",
  },
  after_school_care: {
    label: "After School Care",
    shortLabel: "ASC",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    icon: "🌇",
  },
  vacation_care: {
    label: "Vacation Care",
    shortLabel: "VAC",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-700",
    icon: "🏖️",
  },
  extracurricular: {
    label: "Extracurricular",
    shortLabel: "EXT",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    icon: "🎨",
  },
  extended_day: {
    label: "Extended Day",
    shortLabel: "EXT DAY",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-700",
    icon: "🕐",
  },
  adolescent_program: {
    label: "Adolescent Program",
    shortLabel: "ADOL",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-700",
    icon: "🧑‍🎓",
  },
  senior_elective: {
    label: "Senior Elective",
    shortLabel: "ELECT",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    icon: "📚",
  },
  other: {
    label: "Other",
    shortLabel: "OTHER",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    icon: "📋",
  },
};

// ============================================================
// Billing Types
// ============================================================

export const BILLING_TYPES = [
  { value: "per_session", label: "Per Session" },
  { value: "per_term", label: "Per Term" },
  { value: "per_year", label: "Per Year" },
  { value: "included", label: "Included in Tuition" },
] as const;

export type BillingTypeValue = (typeof BILLING_TYPES)[number]["value"];

// ============================================================
// Session Statuses
// ============================================================

export const SESSION_STATUS_CONFIG: Record<
  string,
  { label: string; badgeBg: string; badgeText: string }
> = {
  scheduled: {
    label: "Scheduled",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
  in_progress: {
    label: "In Progress",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
  },
  completed: {
    label: "Completed",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-600",
  },
  cancelled: {
    label: "Cancelled",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
};

// ============================================================
// Booking Statuses
// ============================================================

export const BOOKING_STATUS_CONFIG: Record<
  string,
  { label: string; badgeBg: string; badgeText: string }
> = {
  confirmed: {
    label: "Confirmed",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
  },
  waitlisted: {
    label: "Waitlisted",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  cancelled: {
    label: "Cancelled",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
  no_show: {
    label: "No Show",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-600",
  },
};

// ============================================================
// Days of Week
// ============================================================

export const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
] as const;

// ============================================================
// Helpers
// ============================================================

/** Format cents to a display string like "$12.50" */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a TIME column (e.g. "07:30:00") to display like "7:30 AM" */
export function formatTime(time: string | null): string {
  if (!time) return " - ";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}
