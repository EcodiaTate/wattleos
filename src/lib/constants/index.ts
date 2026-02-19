// ============================================================
// WattleOS V2 — Constants
// ============================================================
// Single source of truth for permission keys and status values.
// These must stay in sync with the database seed and CHECK constraints.
// ============================================================

// ============================================================
// Permission Keys
// ============================================================

export const PERMISSIONS = {
  // Admin
  MANAGE_TENANT_SETTINGS: 'manage_tenant_settings',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_INTEGRATIONS: 'manage_integrations',

  // Pedagogy
  CREATE_OBSERVATION: 'create_observation',
  PUBLISH_OBSERVATION: 'publish_observation',
  VIEW_ALL_OBSERVATIONS: 'view_all_observations',
  MANAGE_CURRICULUM: 'manage_curriculum',
  MANAGE_MASTERY: 'manage_mastery',
  MANAGE_REPORTS: 'manage_reports',

  // SIS
  VIEW_STUDENTS: 'view_students',
  MANAGE_STUDENTS: 'manage_students',
  VIEW_MEDICAL_RECORDS: 'view_medical_records',
  MANAGE_MEDICAL_RECORDS: 'manage_medical_records',
  MANAGE_SAFETY_RECORDS: 'manage_safety_records',
  MANAGE_ENROLLMENT: 'manage_enrollment',

  // Attendance
  MANAGE_ATTENDANCE: 'manage_attendance',
  VIEW_ATTENDANCE_REPORTS: 'view_attendance_reports',

  // Communications
  SEND_ANNOUNCEMENTS: 'send_announcements',
  SEND_CLASS_MESSAGES: 'send_class_messages',

  // Timesheets (Phase 9)
  LOG_TIME: 'log_time',
  APPROVE_TIMESHEETS: 'approve_timesheets',
  VIEW_ALL_TIMESHEETS: 'view_all_timesheets',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================
// Enrollment Status Options (for UI selects/filters)
// ============================================================

export const ENROLLMENT_STATUSES = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'active', label: 'Active' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'graduated', label: 'Graduated' },
] as const;

export const ENROLLMENT_RECORD_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const;

// ============================================================
// Medical Severity Options
// ============================================================

export const MEDICAL_SEVERITIES = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'life_threatening', label: 'Life Threatening' },
] as const;

export const MEDICAL_CONDITION_TYPES = [
  { value: 'allergy', label: 'Allergy' },
  { value: 'asthma', label: 'Asthma' },
  { value: 'epilepsy', label: 'Epilepsy' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================================
// Custody Restriction Types
// ============================================================

export const RESTRICTION_TYPES = [
  { value: 'no_contact', label: 'No Contact' },
  { value: 'no_pickup', label: 'No Pickup' },
  { value: 'supervised_only', label: 'Supervised Only' },
  { value: 'no_information', label: 'No Information Access' },
] as const;

// ============================================================
// Guardian Relationships
// ============================================================

export const GUARDIAN_RELATIONSHIPS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'stepmother', label: 'Stepmother' },
  { value: 'stepfather', label: 'Stepfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'foster_parent', label: 'Foster Parent' },
  { value: 'legal_guardian', label: 'Legal Guardian' },
  { value: 'other', label: 'Other' },
] as const;

// ============================================================
// Pagination Defaults
// ============================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_CONFIG } from './attendance';
export type { AttendanceStatusValue } from './attendance';

export {
  TIME_ENTRY_TYPE_CONFIG,
  TIME_ENTRY_TYPES,
  LEAVE_TYPES,
  TIMESHEET_STATUS_CONFIG,
  PAY_PERIOD_STATUS_CONFIG,
  PAY_FREQUENCY_OPTIONS,
  DAY_LABELS,
  DEFAULT_WORK_HOURS,
} from './timesheets';
export type { EntryTypeConfig, TimesheetStatusConfig } from './timesheets';