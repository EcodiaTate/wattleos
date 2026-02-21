// src/lib/data-import/attendance-import.ts
//
// ============================================================
// WattleOS V2 - Attendance History Import
// ============================================================
// WHY: Schools migrating to WattleOS have years of attendance
// data in their old system. Losing that history means losing
// compliance records (Australian NQS requires attendance
// records to be kept for 3 years after a child leaves).
// This import writes to attendance_records using upsert
// (same pattern as bulkMarkAttendance) so duplicates are
// safely overwritten rather than errored.
// ============================================================

import type { WattleField } from "./types";

// ============================================================
// Field Definitions
// ============================================================

export const ATTENDANCE_FIELDS: WattleField[] = [
  {
    key: "student_first_name",
    label: "Student First Name",
    required: true,
    description: "First name of the student",
    example: "Emma",
    type: "text",
  },
  {
    key: "student_last_name",
    label: "Student Last Name",
    required: true,
    description: "Last name of the student",
    example: "Thompson",
    type: "text",
  },
  {
    key: "date",
    label: "Date",
    required: true,
    description: "Attendance date. Formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY",
    example: "15/03/2024",
    type: "date",
  },
  {
    key: "status",
    label: "Status",
    required: true,
    description: "Attendance status: present, absent, late, excused, half_day",
    example: "present",
    type: "enum",
    enum_values: ["present", "absent", "late", "excused", "half_day"],
  },
  {
    key: "class_name",
    label: "Class / Room",
    required: false,
    description:
      "Name of the class/room. Optional - links attendance to a class.",
    example: "Wattle Room",
    type: "text",
  },
  {
    key: "check_in_time",
    label: "Check-in Time",
    required: false,
    description: "Time the student checked in. Format: HH:MM or HH:MM AM/PM",
    example: "8:30",
    type: "text",
  },
  {
    key: "check_out_time",
    label: "Check-out Time",
    required: false,
    description: "Time the student checked out. Format: HH:MM or HH:MM AM/PM",
    example: "15:30",
    type: "text",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    description: "Any notes about this attendance record",
    example: "Parent called to report illness",
    type: "text",
  },
];

// ============================================================
// Column Aliases for Auto-Detection
// ============================================================

export const ATTENDANCE_ALIASES: Record<string, string[]> = {
  student_first_name: [
    "student first name",
    "child first name",
    "first name",
    "first_name",
    "firstname",
    "given name",
  ],
  student_last_name: [
    "student last name",
    "child last name",
    "last name",
    "last_name",
    "lastname",
    "surname",
    "family name",
  ],
  date: [
    "date",
    "attendance date",
    "attendance_date",
    "day",
    "record date",
    "session date",
  ],
  status: [
    "status",
    "attendance status",
    "attendance_status",
    "attendance",
    "mark",
    "code",
    "attendance code",
    "type",
  ],
  class_name: [
    "class",
    "class name",
    "classroom",
    "room",
    "room name",
    "group",
    "environment",
  ],
  check_in_time: [
    "check in",
    "check_in",
    "check-in",
    "checkin",
    "check in time",
    "check_in_time",
    "arrival",
    "arrival time",
    "sign in",
    "sign_in",
    "time in",
  ],
  check_out_time: [
    "check out",
    "check_out",
    "check-out",
    "checkout",
    "check out time",
    "check_out_time",
    "departure",
    "departure time",
    "sign out",
    "sign_out",
    "time out",
  ],
  notes: [
    "notes",
    "comments",
    "reason",
    "absence reason",
    "absence_reason",
    "explanation",
    "memo",
  ],
};

// ============================================================
// Status Normalization
// ============================================================
// Attendance systems use wildly different codes. We normalize
// everything to WattleOS's 5 statuses.
// ============================================================

export function normalizeAttendanceStatus(value: string): string | null {
  const lower = value.toLowerCase().trim();

  const map: Record<string, string> = {
    // Present
    present: "present",
    p: "present",
    attended: "present",
    in: "present",
    yes: "present",
    "✓": "present",
    "✔": "present",

    // Absent
    absent: "absent",
    a: "absent",
    away: "absent",
    no: "absent",
    missing: "absent",
    "✗": "absent",
    "✘": "absent",
    x: "absent",

    // Late
    late: "late",
    l: "late",
    tardy: "late",
    "late arrival": "late",
    "arrived late": "late",

    // Excused
    excused: "excused",
    e: "excused",
    "excused absence": "excused",
    "excused absent": "excused",
    sick: "excused",
    illness: "excused",
    medical: "excused",
    holiday: "excused",

    // Half day
    half_day: "half_day",
    "half day": "half_day",
    half: "half_day",
    h: "half_day",
    partial: "half_day",
    "half-day": "half_day",
    "am only": "half_day",
    "pm only": "half_day",
  };

  return map[lower] ?? null;
}

// ============================================================
// Time Parsing
// ============================================================
// Converts various time formats to ISO timestamp for a given date.
// ============================================================

export function parseTimeToTimestamp(
  date: string,
  time: string,
  timezone: string = "Australia/Sydney",
): string | null {
  if (!time || time.trim() === "") return null;

  const trimmed = time.trim();

  // Try HH:MM (24-hour)
  let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  // Try HH:MM AM/PM
  match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toLowerCase();

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  // Try just a number (interpret as hour)
  match = trimmed.match(/^(\d{1,2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    if (hours >= 0 && hours < 24) {
      return `${date}T${String(hours).padStart(2, "0")}:00:00`;
    }
  }

  return null;
}
