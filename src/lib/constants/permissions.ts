// ============================================================
// WattleOS V2 — Permission Constants
// ============================================================
// Mirrors permissions seeded in the database.
// Used for client-side permission checks and type-safe
// references throughout the application.
// MODIFIED IN PHASE 9b: Added timesheet permissions.
// ============================================================

export const Permissions = {
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
  // WHY: Three-tier access — all staff log, heads approve, admins see everything.
  LOG_TIME: 'log_time',
  APPROVE_TIMESHEETS: 'approve_timesheets',
  VIEW_ALL_TIMESHEETS: 'view_all_timesheets',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// Module groupings for the admin permissions UI
export const PermissionModules = {
  admin: {
    label: 'Administration',
    permissions: [
      Permissions.MANAGE_TENANT_SETTINGS,
      Permissions.MANAGE_USERS,
      Permissions.VIEW_AUDIT_LOGS,
      Permissions.MANAGE_INTEGRATIONS,
    ],
  },
  pedagogy: {
    label: 'Pedagogy',
    permissions: [
      Permissions.CREATE_OBSERVATION,
      Permissions.PUBLISH_OBSERVATION,
      Permissions.VIEW_ALL_OBSERVATIONS,
      Permissions.MANAGE_CURRICULUM,
      Permissions.MANAGE_MASTERY,
      Permissions.MANAGE_REPORTS,
    ],
  },
  sis: {
    label: 'Student Information',
    permissions: [
      Permissions.VIEW_STUDENTS,
      Permissions.MANAGE_STUDENTS,
      Permissions.VIEW_MEDICAL_RECORDS,
      Permissions.MANAGE_MEDICAL_RECORDS,
      Permissions.MANAGE_SAFETY_RECORDS,
      Permissions.MANAGE_ENROLLMENT,
    ],
  },
  attendance: {
    label: 'Attendance',
    permissions: [
      Permissions.MANAGE_ATTENDANCE,
      Permissions.VIEW_ATTENDANCE_REPORTS,
    ],
  },
  comms: {
    label: 'Communications',
    permissions: [
      Permissions.SEND_ANNOUNCEMENTS,
      Permissions.SEND_CLASS_MESSAGES,
    ],
  },
  timesheets: {
    label: 'Timesheets & Payroll',
    permissions: [
      Permissions.LOG_TIME,
      Permissions.APPROVE_TIMESHEETS,
      Permissions.VIEW_ALL_TIMESHEETS,
    ],
  },
} as const;