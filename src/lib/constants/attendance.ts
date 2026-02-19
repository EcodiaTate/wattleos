// src/lib/constants/attendance.ts
//
// ============================================================
// WattleOS V2 — Attendance Constants
// ============================================================
// Status options, labels, and color coding for attendance UI.
// Must stay in sync with the CHECK constraint on
// attendance_records.status column.
// ============================================================

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'half_day', label: 'Half Day' },
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number]['value'];

/**
 * Color config for attendance status badges and roll call buttons.
 * Uses Tailwind classes compatible with the WattleOS design system.
 */
export const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatusValue,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
    buttonHover: string;
    icon: string;
  }
> = {
  present: {
    label: 'Present',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700',
    icon: '✓',
  },
  absent: {
    label: 'Absent',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
    icon: '✗',
  },
  late: {
    label: 'Late',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
    icon: '⏰',
  },
  excused: {
    label: 'Excused',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
    icon: '📝',
  },
  half_day: {
    label: 'Half Day',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    buttonBg: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
    icon: '½',
  },
};