// src/lib/constants/rostering.ts
//
// ============================================================
// WattleOS V2 - Staff Rostering Constants (Module N)
// ============================================================
// Status labels, shift role options, leave type config, and
// helper functions for the rostering module.
// ============================================================

import type {
  CoverageUrgency,
  LeaveRequestStatus,
  LeaveType,
  RosterWeekStatus,
  ShiftRole,
  ShiftStatus,
} from "@/types/domain";

// ============================================================
// Shift Roles
// ============================================================

export interface ShiftRoleConfig {
  label: string;
  shortLabel: string;
  emoji: string;
  cssVar: string;
}

export const SHIFT_ROLE_CONFIG: Record<ShiftRole, ShiftRoleConfig> = {
  lead: {
    label: "Lead Educator",
    shortLabel: "Lead",
    emoji: "👑",
    cssVar: "var(--shift-role-lead)",
  },
  co_educator: {
    label: "Co-Educator",
    shortLabel: "Co-Ed",
    emoji: "🤝",
    cssVar: "var(--shift-role-co-educator)",
  },
  general: {
    label: "General",
    shortLabel: "Gen",
    emoji: "👤",
    cssVar: "var(--shift-role-general)",
  },
  float: {
    label: "Float",
    shortLabel: "Float",
    emoji: "🔄",
    cssVar: "var(--shift-role-float)",
  },
  admin: {
    label: "Administration",
    shortLabel: "Admin",
    emoji: "🗂️",
    cssVar: "var(--shift-role-admin)",
  },
  kitchen: {
    label: "Kitchen",
    shortLabel: "Kit",
    emoji: "🍳",
    cssVar: "var(--shift-role-admin)",
  },
  maintenance: {
    label: "Maintenance",
    shortLabel: "Maint",
    emoji: "🔧",
    cssVar: "var(--shift-role-general)",
  },
};

export const SHIFT_ROLES: ShiftRole[] = [
  "lead",
  "co_educator",
  "general",
  "float",
  "admin",
  "kitchen",
  "maintenance",
];

// ============================================================
// Leave Types
// ============================================================

export interface LeaveTypeConfig {
  label: string;
  emoji: string;
  mapsToTimeEntryType: string | null;
}

export const LEAVE_TYPE_CONFIG: Record<LeaveType, LeaveTypeConfig> = {
  sick_leave: {
    label: "Sick Leave",
    emoji: "🤒",
    mapsToTimeEntryType: "sick_leave",
  },
  annual_leave: {
    label: "Annual Leave",
    emoji: "🌴",
    mapsToTimeEntryType: "annual_leave",
  },
  unpaid_leave: {
    label: "Unpaid Leave",
    emoji: "📋",
    mapsToTimeEntryType: "unpaid_leave",
  },
  long_service_leave: {
    label: "Long Service Leave",
    emoji: "🏆",
    mapsToTimeEntryType: null,
  },
  parental_leave: {
    label: "Parental Leave",
    emoji: "👶",
    mapsToTimeEntryType: null,
  },
  compassionate_leave: {
    label: "Compassionate Leave",
    emoji: "💐",
    mapsToTimeEntryType: null,
  },
  professional_development: {
    label: "Professional Development",
    emoji: "📚",
    mapsToTimeEntryType: null,
  },
  other: {
    label: "Other Leave",
    emoji: "📝",
    mapsToTimeEntryType: "unpaid_leave",
  },
};

export const LEAVE_TYPES: LeaveType[] = [
  "sick_leave",
  "annual_leave",
  "unpaid_leave",
  "long_service_leave",
  "parental_leave",
  "compassionate_leave",
  "professional_development",
  "other",
];

// ============================================================
// Roster Week Statuses
// ============================================================

export interface StatusConfig {
  label: string;
  cssVar: string;
  cssVarFg: string;
}

export const ROSTER_WEEK_STATUS_CONFIG: Record<RosterWeekStatus, StatusConfig> =
  {
    draft: {
      label: "Draft",
      cssVar: "var(--roster-draft)",
      cssVarFg: "var(--roster-draft-fg)",
    },
    published: {
      label: "Published",
      cssVar: "var(--roster-published)",
      cssVarFg: "var(--roster-published-fg)",
    },
    locked: {
      label: "Locked",
      cssVar: "var(--roster-locked)",
      cssVarFg: "var(--roster-locked-fg)",
    },
  };

// ============================================================
// Shift Statuses
// ============================================================

export const SHIFT_STATUS_CONFIG: Record<ShiftStatus, StatusConfig> = {
  scheduled: {
    label: "Scheduled",
    cssVar: "var(--shift-scheduled)",
    cssVarFg: "var(--shift-scheduled-fg)",
  },
  confirmed: {
    label: "Confirmed",
    cssVar: "var(--shift-confirmed)",
    cssVarFg: "var(--shift-confirmed-fg)",
  },
  completed: {
    label: "Completed",
    cssVar: "var(--shift-completed)",
    cssVarFg: "var(--shift-completed-fg)",
  },
  cancelled: {
    label: "Cancelled",
    cssVar: "var(--shift-cancelled)",
    cssVarFg: "var(--shift-cancelled-fg)",
  },
  no_show: {
    label: "No Show",
    cssVar: "var(--shift-no-show)",
    cssVarFg: "var(--shift-no-show-fg)",
  },
};

// ============================================================
// Leave Request Statuses
// ============================================================

export const LEAVE_STATUS_CONFIG: Record<LeaveRequestStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    cssVar: "var(--leave-pending)",
    cssVarFg: "var(--leave-pending-fg)",
  },
  approved: {
    label: "Approved",
    cssVar: "var(--leave-approved)",
    cssVarFg: "var(--leave-approved-fg)",
  },
  rejected: {
    label: "Rejected",
    cssVar: "var(--leave-rejected)",
    cssVarFg: "var(--leave-rejected-fg)",
  },
  cancelled: {
    label: "Cancelled",
    cssVar: "var(--leave-rejected)",
    cssVarFg: "var(--leave-rejected-fg)",
  },
  withdrawn: {
    label: "Withdrawn",
    cssVar: "var(--leave-rejected)",
    cssVarFg: "var(--leave-rejected-fg)",
  },
};

// ============================================================
// Coverage Urgency
// ============================================================

export const COVERAGE_URGENCY_CONFIG: Record<CoverageUrgency, StatusConfig> = {
  low: {
    label: "Low",
    cssVar: "var(--coverage-low)",
    cssVarFg: "var(--coverage-low-fg)",
  },
  normal: {
    label: "Normal",
    cssVar: "var(--coverage-normal)",
    cssVarFg: "var(--coverage-normal-fg)",
  },
  high: {
    label: "High",
    cssVar: "var(--coverage-high)",
    cssVarFg: "var(--coverage-high-fg)",
  },
  critical: {
    label: "Critical",
    cssVar: "var(--coverage-critical)",
    cssVarFg: "var(--coverage-critical-fg)",
  },
};

// ============================================================
// Standard Hours (Australian award)
// ============================================================

export const STANDARD_DAY_HOURS = 7.6;
export const STANDARD_WEEK_HOURS = 38;

// ============================================================
// Day Labels & Helpers
// ============================================================

export const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/**
 * Given a Monday start date (ISO string), returns an array of 7
 * ISO date strings for Mon through Sun.
 */
export function getWeekDates(weekStartDate: string): string[] {
  const start = new Date(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

/**
 * Returns the Monday that starts the week containing the given date.
 */
export function getWeekStartDate(date: string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
