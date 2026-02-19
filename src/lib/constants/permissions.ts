// src/lib/constants/permissions.ts
//
// ============================================================
// WattleOS V2 - Permission Constants (Modules 1–14)
// ============================================================
// Single source of truth for permission keys used in:
//   - requirePermission() calls in server actions
//   - has_permission() in RLS policies
//   - Admin role-permission management UI
//
// These must stay in sync with the database seed and CHECK
// constraints. When adding a new permission, add it here AND
// in the migration's INSERT INTO permissions statement.
// ============================================================

// ============================================================
// Permission Keys
// ============================================================

export const Permissions = {
  // ── Administration ──────────────────────────────────────────
  MANAGE_TENANT_SETTINGS: "manage_tenant_settings",
  MANAGE_USERS: "manage_users",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  MANAGE_INTEGRATIONS: "manage_integrations",

  // ── Pedagogy ────────────────────────────────────────────────
  CREATE_OBSERVATION: "create_observation",
  PUBLISH_OBSERVATION: "publish_observation",
  VIEW_ALL_OBSERVATIONS: "view_all_observations",
  MANAGE_CURRICULUM: "manage_curriculum",
  MANAGE_MASTERY: "manage_mastery",
  MANAGE_REPORTS: "manage_reports",

  // ── SIS ─────────────────────────────────────────────────────
  VIEW_STUDENTS: "view_students",
  MANAGE_STUDENTS: "manage_students",
  VIEW_MEDICAL_RECORDS: "view_medical_records",
  MANAGE_MEDICAL_RECORDS: "manage_medical_records",
  MANAGE_SAFETY_RECORDS: "manage_safety_records",
  MANAGE_ENROLLMENT: "manage_enrollment",

  // ── Attendance ──────────────────────────────────────────────
  MANAGE_ATTENDANCE: "manage_attendance",
  VIEW_ATTENDANCE_REPORTS: "view_attendance_reports",

  // ── Communications (existing from Module 7) ─────────────────
  SEND_ANNOUNCEMENTS: "send_announcements",
  SEND_CLASS_MESSAGES: "send_class_messages",

  // ── Timesheets (Module 9) ───────────────────────────────────
  LOG_TIME: "log_time",
  APPROVE_TIMESHEETS: "approve_timesheets",

  VIEW_ALL_TIMESHEETS: "view_all_timesheets",

  // ── Module 10: Enrollment ───────────────────────────────────
  MANAGE_ENROLLMENT_PERIODS: "manage_enrollment_periods",
  REVIEW_APPLICATIONS: "review_applications",
  APPROVE_APPLICATIONS: "approve_applications",
  MANAGE_PARENT_INVITATIONS: "manage_parent_invitations",
  VIEW_ENROLLMENT_DASHBOARD: "view_enrollment_dashboard",

  // ── Module 11: Programs / OSHC ──────────────────────────────
  MANAGE_PROGRAMS: "manage_programs",
  MANAGE_BOOKINGS: "manage_bookings",
  CHECKIN_CHECKOUT: "checkin_checkout",
  VIEW_PROGRAM_REPORTS: "view_program_reports",
  MANAGE_CCS_SETTINGS: "manage_ccs_settings",

  // ── Module 12: Communications (new) ─────────────────────────
  MANAGE_EVENTS: "manage_events",
  MODERATE_CHAT: "moderate_chat",
  MANAGE_DIRECTORY: "manage_directory",
  VIEW_MESSAGE_ANALYTICS: "view_message_analytics",

  // ── Module 13: Admissions ───────────────────────────────────
  MANAGE_WAITLIST: "manage_waitlist",
  VIEW_WAITLIST: "view_waitlist",
  MANAGE_TOURS: "manage_tours",
  MANAGE_EMAIL_TEMPLATES: "manage_email_templates",
  VIEW_ADMISSIONS_ANALYTICS: "view_admissions_analytics",

  // ── Module 14: Curriculum Content ───────────────────────────
  MANAGE_CROSS_MAPPINGS: "manage_cross_mappings",
  VIEW_COMPLIANCE_REPORTS: "view_compliance_reports",
  MANAGE_CURRICULUM_TEMPLATES: "manage_curriculum_templates",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// ============================================================
// Module Groupings (for admin permissions UI)
// ============================================================

export const PermissionModules = {
  admin: {
    label: "Administration",
    permissions: [
      Permissions.MANAGE_TENANT_SETTINGS,
      Permissions.MANAGE_USERS,
      Permissions.VIEW_AUDIT_LOGS,
      Permissions.MANAGE_INTEGRATIONS,
    ],
  },
  pedagogy: {
    label: "Pedagogy",
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
    label: "Student Information",
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
    label: "Attendance",
    permissions: [
      Permissions.MANAGE_ATTENDANCE,
      Permissions.VIEW_ATTENDANCE_REPORTS,
    ],
  },
  comms: {
    label: "Communications",
    permissions: [
      Permissions.SEND_ANNOUNCEMENTS,
      Permissions.SEND_CLASS_MESSAGES,
      Permissions.MANAGE_EVENTS,
      Permissions.MODERATE_CHAT,
      Permissions.MANAGE_DIRECTORY,
      Permissions.VIEW_MESSAGE_ANALYTICS,
    ],
  },
  timesheets: {
    label: "Timesheets & Payroll",
    permissions: [
      Permissions.LOG_TIME,
      Permissions.APPROVE_TIMESHEETS,
      Permissions.VIEW_ALL_TIMESHEETS,
    ],
  },
  enrollment: {
    label: "Enrollment & Onboarding",
    permissions: [
      Permissions.MANAGE_ENROLLMENT_PERIODS,
      Permissions.REVIEW_APPLICATIONS,
      Permissions.APPROVE_APPLICATIONS,
      Permissions.MANAGE_PARENT_INVITATIONS,
      Permissions.VIEW_ENROLLMENT_DASHBOARD,
    ],
  },
  programs: {
    label: "Programs & OSHC",
    permissions: [
      Permissions.MANAGE_PROGRAMS,
      Permissions.MANAGE_BOOKINGS,
      Permissions.CHECKIN_CHECKOUT,
      Permissions.VIEW_PROGRAM_REPORTS,
      Permissions.MANAGE_CCS_SETTINGS,
    ],
  },
  admissions: {
    label: "Admissions & Waitlist",
    permissions: [
      Permissions.MANAGE_WAITLIST,
      Permissions.VIEW_WAITLIST,
      Permissions.MANAGE_TOURS,
      Permissions.MANAGE_EMAIL_TEMPLATES,
      Permissions.VIEW_ADMISSIONS_ANALYTICS,
    ],
  },
  curriculum_content: {
    label: "Curriculum Content",
    permissions: [
      Permissions.MANAGE_CROSS_MAPPINGS,
      Permissions.VIEW_COMPLIANCE_REPORTS,
      Permissions.MANAGE_CURRICULUM_TEMPLATES,
    ],
  },
} as const;
