// src/lib/constants/timesheets.ts
//
// ============================================================
// WattleOS V2 — Timesheet Constants
// ============================================================
// Status labels, entry type options, and color config for the
// timesheet module. Used by both staff and admin UI.
// ============================================================

import type {
  TimeEntryType,
  TimesheetStatus,
  PayPeriodStatus,
  PayFrequency,
} from '@/types/domain';

// ============================================================
// Time Entry Types
// ============================================================

export interface EntryTypeConfig {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const TIME_ENTRY_TYPE_CONFIG: Record<TimeEntryType, EntryTypeConfig> = {
  regular: {
    label: 'Regular',
    shortLabel: 'Reg',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '⏰',
  },
  overtime: {
    label: 'Overtime',
    shortLabel: 'OT',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: '⚡',
  },
  public_holiday: {
    label: 'Public Holiday',
    shortLabel: 'PH',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: '🎉',
  },
  sick_leave: {
    label: 'Sick Leave',
    shortLabel: 'Sick',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🤒',
  },
  annual_leave: {
    label: 'Annual Leave',
    shortLabel: 'AL',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '🌴',
  },
  unpaid_leave: {
    label: 'Unpaid Leave',
    shortLabel: 'UL',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    icon: '📋',
  },
};

export const TIME_ENTRY_TYPES: TimeEntryType[] = [
  'regular',
  'overtime',
  'public_holiday',
  'sick_leave',
  'annual_leave',
  'unpaid_leave',
];

export const LEAVE_TYPES: TimeEntryType[] = [
  'sick_leave',
  'annual_leave',
  'unpaid_leave',
  'public_holiday',
];

// ============================================================
// Timesheet Statuses
// ============================================================

export interface TimesheetStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

export const TIMESHEET_STATUS_CONFIG: Record<TimesheetStatus, TimesheetStatusConfig> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    dotColor: 'bg-gray-400',
  },
  submitted: {
    label: 'Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    dotColor: 'bg-red-500',
  },
  synced: {
    label: 'Synced',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
};

// ============================================================
// Pay Period Statuses
// ============================================================

export const PAY_PERIOD_STATUS_CONFIG: Record<PayPeriodStatus, TimesheetStatusConfig> = {
  open: {
    label: 'Open',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
  },
  locked: {
    label: 'Locked',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  processed: {
    label: 'Processed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    dotColor: 'bg-gray-500',
  },
};

// ============================================================
// Pay Frequency Options
// ============================================================

export const PAY_FREQUENCY_OPTIONS: Array<{ value: PayFrequency; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

// ============================================================
// Day labels (for timesheet grid)
// ============================================================

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const DAY_NUMBERS: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

// ============================================================
// Default work hours (fallbacks if no payroll_settings)
// ============================================================

export const DEFAULT_WORK_HOURS = {
  startTime: '08:00',
  endTime: '16:00',
  breakMinutes: 30,
  standardDayHours: 7.6,  // Australian full-time standard
} as const;