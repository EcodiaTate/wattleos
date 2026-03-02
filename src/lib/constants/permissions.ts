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
// in the migration's INSERT INTO permissions statement AND
// in the backfill DO $$ block that grants it to Owner/Admin/
// Head of School for ALL EXISTING tenants. The seed_tenant_roles()
// trigger only covers NEW tenants - it does not retroactively
// update existing role_permissions rows.
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

  // ── Classes ─────────────────────────────────────────────────
  VIEW_CLASSES: "view_classes",
  MANAGE_CLASSES: "manage_classes",

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

  // ── Module A: Incidents (Reg 87) ────────────────────────────
  CREATE_INCIDENT: "create_incident",
  MANAGE_INCIDENTS: "manage_incidents",
  VIEW_INCIDENTS: "view_incidents",

  // ── Module B: Medication (Reg 93/94) ────────────────────────
  MANAGE_MEDICATION_PLANS: "manage_medication_plans",
  ADMINISTER_MEDICATION: "administer_medication",
  VIEW_MEDICATION_RECORDS: "view_medication_records",

  // ── Module C: Staff Compliance (Reg 136/145/146) ────────────
  MANAGE_STAFF_COMPLIANCE: "manage_staff_compliance",
  VIEW_STAFF_COMPLIANCE: "view_staff_compliance",
  EXPORT_WORKER_REGISTER: "export_worker_register",

  // ── Module D: Ratio Monitoring (Reg 123) ────────────────────
  MANAGE_FLOOR_SIGNIN: "manage_floor_signin",
  VIEW_RATIOS: "view_ratios",

  // ── Module E: QIP Builder (Reg 55) ──────────────────────────
  MANAGE_QIP: "manage_qip",
  VIEW_QIP: "view_qip",

  // ── Module F: Immunisation ──────────────────────────────────
  MANAGE_IMMUNISATION: "manage_immunisation",
  VIEW_IMMUNISATION: "view_immunisation",

  // ── Module G: CCS Session Reporting ─────────────────────────
  MANAGE_CCS_REPORTS: "manage_ccs_reports",
  VIEW_CCS_REPORTS: "view_ccs_reports",

  // ── Module H: Excursions (Reg 100–102) ──────────────────────
  MANAGE_EXCURSIONS: "manage_excursions",
  VIEW_EXCURSIONS: "view_excursions",
  MANAGE_TRANSPORT_BOOKINGS: "manage_transport_bookings",

  // ── Module I: Complaints & Policies (Reg 168/170) ───────────
  MANAGE_POLICIES: "manage_policies",
  MANAGE_COMPLAINTS: "manage_complaints",
  VIEW_COMPLAINTS: "view_complaints",

  // ── Module J: Montessori Lesson Tracking ────────────────────
  MANAGE_LESSON_RECORDS: "manage_lesson_records",
  VIEW_LESSON_RECORDS: "view_lesson_records",

  // ── Module K: MQ:AP Self-Assessment ─────────────────────────
  MANAGE_MQAP: "manage_mqap",
  VIEW_MQAP: "view_mqap",

  // ── Module L: Emergency Drill Tracking (Reg 97) ───────────
  MANAGE_EMERGENCY_DRILLS: "manage_emergency_drills",
  VIEW_EMERGENCY_DRILLS: "view_emergency_drills",

  // ── Module M: Live Emergency Coordination ─────────────────
  ACTIVATE_EMERGENCY: "activate_emergency",
  COORDINATE_EMERGENCY: "coordinate_emergency",
  VIEW_EMERGENCY_COORDINATION: "view_emergency_coordination",

  // ── Module N: Staff Rostering & Relief ─────────────────────
  MANAGE_ROSTER: "manage_roster",
  VIEW_ROSTER: "view_roster",
  MANAGE_LEAVE: "manage_leave",
  REQUEST_LEAVE: "request_leave",
  REQUEST_SHIFT_SWAP: "request_shift_swap",
  MANAGE_COVERAGE: "manage_coverage",
  ACCEPT_COVERAGE: "accept_coverage",

  // ── Module Q: Individual Learning Plans ───────────────────
  MANAGE_ILP: "manage_ilp",
  VIEW_ILP: "view_ilp",
  MANAGE_TRANSITION_STATEMENTS: "manage_transition_statements",

  // ── Module O: Daily Care Log (Reg 162) ──────────────────
  MANAGE_DAILY_CARE_LOGS: "manage_daily_care_logs",
  VIEW_DAILY_CARE_LOGS: "view_daily_care_logs",

  // ── Module R: School Photos & ID Cards ────────────────
  MANAGE_SCHOOL_PHOTOS: "manage_school_photos",
  VIEW_SCHOOL_PHOTOS: "view_school_photos",

  // ── Module P: Wellbeing & Pastoral Care ───────────────
  VIEW_WELLBEING: "view_wellbeing",
  MANAGE_WELLBEING: "manage_wellbeing",
  MANAGE_REFERRALS: "manage_referrals",
  VIEW_COUNSELLOR_NOTES: "view_counsellor_notes",
  MANAGE_COUNSELLOR_NOTES: "manage_counsellor_notes",

  // ── NCCD Disability Register ───────────────────────────
  MANAGE_NCCD: "manage_nccd",
  VIEW_NCCD: "view_nccd",

  // ── Module S: Sick Bay Visits Log ──────────────────────
  MANAGE_SICK_BAY: "manage_sick_bay",
  VIEW_SICK_BAY: "view_sick_bay",

  // ── Module T: Three-Period Lessons & Sensitive Periods ──
  // Reuses lesson record permissions - 3PL is part of the
  // same Montessori lesson tracking domain as Module J.
  // MANAGE_LESSON_RECORDS / VIEW_LESSON_RECORDS apply here.

  // ── Module U: Visitor & Contractor Sign-In Log ──────────
  VIEW_VISITOR_LOG: "view_visitor_log",
  MANAGE_VISITOR_LOG: "manage_visitor_log",
  VIEW_CONTRACTOR_LOG: "view_contractor_log",
  MANAGE_CONTRACTOR_LOG: "manage_contractor_log",

  // ── Module V: End-of-Day Dismissal & Pickup ───────────
  VIEW_DISMISSAL: "view_dismissal",
  MANAGE_DISMISSAL: "manage_dismissal",

  // ── Module W: Chronic Absence Monitoring ────────────────
  VIEW_CHRONIC_ABSENCE: "view_chronic_absence",
  MANAGE_CHRONIC_ABSENCE: "manage_chronic_absence",

  // ── Unexplained Absence Follow-up ────────────────────────
  VIEW_ABSENCE_FOLLOWUP: "view_absence_followup",
  MANAGE_ABSENCE_FOLLOWUP: "manage_absence_followup",

  // ── Module X: Parent-Teacher Interview Scheduling ────────
  MANAGE_INTERVIEW_SESSIONS: "manage_interview_sessions",
  BOOK_INTERVIEW: "book_interview",
  VIEW_INTERVIEW_SCHEDULE: "view_interview_schedule",

  // ── Module Y: Volunteer Coordination ──────────────────────
  VIEW_VOLUNTEERS: "view_volunteers",
  MANAGE_VOLUNTEERS: "manage_volunteers",

  // ── Module Z: Material / Shelf Inventory ───────────────────
  VIEW_MATERIAL_INVENTORY: "view_material_inventory",
  MANAGE_MATERIAL_INVENTORY: "manage_material_inventory",

  // ── NAPLAN Coordination ─────────────────────────────────────
  VIEW_NAPLAN: "view_naplan",
  MANAGE_NAPLAN: "manage_naplan",

  // ── Normalization Indicators ──────────────────────────────
  VIEW_NORMALIZATION: "view_normalization",
  MANAGE_NORMALIZATION: "manage_normalization",

  // ── Billing (Fee Schedules & Invoices) ────────────────────
  VIEW_BILLING: "view_billing",
  MANAGE_BILLING: "manage_billing",

  // ── Direct Debit / Recurring Billing ───────────────────────
  VIEW_RECURRING_BILLING: "view_recurring_billing",
  MANAGE_RECURRING_BILLING: "manage_recurring_billing",

  // ── SMS Gateway ───────────────────────────────────────────
  VIEW_SMS_GATEWAY: "view_sms_gateway",
  MANAGE_SMS_GATEWAY: "manage_sms_gateway",
  SEND_SMS: "send_sms",

  // ── Push Notification Dispatch ─────────────────────────
  MANAGE_PUSH_NOTIFICATIONS: "manage_push_notifications",
  VIEW_NOTIFICATION_ANALYTICS: "view_notification_analytics",

  // ── Work Cycle Integrity Tracking ──────────────────────
  VIEW_WORK_CYCLES: "view_work_cycles",
  MANAGE_WORK_CYCLES: "manage_work_cycles",

  // ── Prepared Environment Planner ───────────────────────
  VIEW_ENVIRONMENT_PLANNER: "view_environment_planner",
  MANAGE_ENVIRONMENT_PLANNER: "manage_environment_planner",

  // ── Montessori Accreditation Checklist ──────────────────
  VIEW_ACCREDITATION: "view_accreditation",
  MANAGE_ACCREDITATION: "manage_accreditation",

  // ── Previous School Records ──────────────────────────────
  VIEW_PREVIOUS_SCHOOL_RECORDS: "view_previous_school_records",
  MANAGE_PREVIOUS_SCHOOL_RECORDS: "manage_previous_school_records",

  // ── ACARA Attendance Reporting ────────────────────────────
  VIEW_ACARA_REPORTING: "view_acara_reporting",
  MANAGE_ACARA_REPORTING: "manage_acara_reporting",

  // ── Montessori Literacy Hub ───────────────────────────────
  VIEW_MONTESSORI_HUB: "view_montessori_hub",
  MANAGE_MONTESSORI_HUB: "manage_montessori_hub",

  // ── Debt Management ───────────────────────────────────────
  VIEW_DEBT_MANAGEMENT: "view_debt_management",
  MANAGE_DEBT_MANAGEMENT: "manage_debt_management",
  APPROVE_WRITE_OFFS: "approve_write_offs",

  // ── Cosmic Education Unit Planning ────────────────────────
  VIEW_COSMIC_EDUCATION: "view_cosmic_education",
  MANAGE_COSMIC_EDUCATION: "manage_cosmic_education",

  // ── Grant Tracking ──────────────────────────────────────────
  VIEW_GRANT_TRACKING: "view_grant_tracking",
  MANAGE_GRANT_TRACKING: "manage_grant_tracking",

  // ── Fee Notice Comms ──────────────────────────────────────────
  VIEW_FEE_NOTICE_COMMS: "view_fee_notice_comms",
  MANAGE_FEE_NOTICE_COMMS: "manage_fee_notice_comms",

  // ── Newsletter ──────────────────────────────────────────────────
  VIEW_NEWSLETTER: "view_newsletter",
  MANAGE_NEWSLETTER: "manage_newsletter",
  SEND_NEWSLETTER: "send_newsletter",

  // ── Tuckshop ─────────────────────────────────────────────────────
  MANAGE_TUCKSHOP: "manage_tuckshop",
  PLACE_TUCKSHOP_ORDER: "place_tuckshop_order",

  // ── PLG: Report Periods ───────────────────────────────────────────
  // MANAGE_REPORTS already covers template management.
  // These two additional permissions gate the period lifecycle
  // (admin activates periods, guides see assigned instances).
  MANAGE_REPORT_PERIODS: "manage_report_periods",
  VIEW_REPORT_PERIODS: "view_report_periods",
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
      Permissions.MANAGE_REPORT_PERIODS,
      Permissions.VIEW_REPORT_PERIODS,
    ],
  },
  classes: {
    label: "Classes",
    permissions: [Permissions.VIEW_CLASSES, Permissions.MANAGE_CLASSES],
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
      Permissions.VIEW_PREVIOUS_SCHOOL_RECORDS,
      Permissions.MANAGE_PREVIOUS_SCHOOL_RECORDS,
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
  incidents: {
    label: "Incidents & Safety (Reg 87)",
    permissions: [
      Permissions.CREATE_INCIDENT,
      Permissions.MANAGE_INCIDENTS,
      Permissions.VIEW_INCIDENTS,
    ],
  },
  medication: {
    label: "Medication (Reg 93/94)",
    permissions: [
      Permissions.MANAGE_MEDICATION_PLANS,
      Permissions.ADMINISTER_MEDICATION,
      Permissions.VIEW_MEDICATION_RECORDS,
    ],
  },
  staff_compliance: {
    label: "Staff Compliance (Reg 136/145/146)",
    permissions: [
      Permissions.MANAGE_STAFF_COMPLIANCE,
      Permissions.VIEW_STAFF_COMPLIANCE,
      Permissions.EXPORT_WORKER_REGISTER,
    ],
  },
  ratios: {
    label: "Ratio Monitoring (Reg 123)",
    permissions: [Permissions.MANAGE_FLOOR_SIGNIN, Permissions.VIEW_RATIOS],
  },
  qip: {
    label: "Quality Improvement Plan (Reg 55)",
    permissions: [Permissions.MANAGE_QIP, Permissions.VIEW_QIP],
  },
  immunisation: {
    label: "Immunisation Compliance",
    permissions: [
      Permissions.MANAGE_IMMUNISATION,
      Permissions.VIEW_IMMUNISATION,
    ],
  },
  ccs: {
    label: "CCS Session Reporting",
    permissions: [Permissions.MANAGE_CCS_REPORTS, Permissions.VIEW_CCS_REPORTS],
  },
  excursions: {
    label: "Excursion Management (Reg 100–102)",
    permissions: [
      Permissions.MANAGE_EXCURSIONS,
      Permissions.VIEW_EXCURSIONS,
      Permissions.MANAGE_TRANSPORT_BOOKINGS,
    ],
  },
  compliance: {
    label: "Complaints & Policy (Reg 168/170)",
    permissions: [
      Permissions.MANAGE_POLICIES,
      Permissions.MANAGE_COMPLAINTS,
      Permissions.VIEW_COMPLAINTS,
    ],
  },
  lesson_tracking: {
    label: "Montessori Lesson Tracking",
    permissions: [
      Permissions.MANAGE_LESSON_RECORDS,
      Permissions.VIEW_LESSON_RECORDS,
    ],
  },
  mqap: {
    label: "MQ:AP Self-Assessment",
    permissions: [Permissions.MANAGE_MQAP, Permissions.VIEW_MQAP],
  },
  emergency_drills: {
    label: "Emergency Drills (Reg 97)",
    permissions: [
      Permissions.MANAGE_EMERGENCY_DRILLS,
      Permissions.VIEW_EMERGENCY_DRILLS,
    ],
  },
  emergency_coordination: {
    label: "Emergency Coordination (Live)",
    permissions: [
      Permissions.ACTIVATE_EMERGENCY,
      Permissions.COORDINATE_EMERGENCY,
      Permissions.VIEW_EMERGENCY_COORDINATION,
    ],
  },
  rostering: {
    label: "Staff Rostering & Relief",
    permissions: [
      Permissions.MANAGE_ROSTER,
      Permissions.VIEW_ROSTER,
      Permissions.MANAGE_LEAVE,
      Permissions.REQUEST_LEAVE,
      Permissions.REQUEST_SHIFT_SWAP,
      Permissions.MANAGE_COVERAGE,
      Permissions.ACCEPT_COVERAGE,
    ],
  },
  learning_plans: {
    label: "Individual Learning Plans",
    permissions: [
      Permissions.MANAGE_ILP,
      Permissions.VIEW_ILP,
      Permissions.MANAGE_TRANSITION_STATEMENTS,
    ],
  },
  daily_care: {
    label: "Daily Care Log (Reg 162)",
    permissions: [
      Permissions.MANAGE_DAILY_CARE_LOGS,
      Permissions.VIEW_DAILY_CARE_LOGS,
    ],
  },
  school_photos: {
    label: "School Photos & ID Cards",
    permissions: [
      Permissions.MANAGE_SCHOOL_PHOTOS,
      Permissions.VIEW_SCHOOL_PHOTOS,
    ],
  },
  wellbeing: {
    label: "Wellbeing & Pastoral Care",
    permissions: [
      Permissions.VIEW_WELLBEING,
      Permissions.MANAGE_WELLBEING,
      Permissions.MANAGE_REFERRALS,
      Permissions.VIEW_COUNSELLOR_NOTES,
      Permissions.MANAGE_COUNSELLOR_NOTES,
    ],
  },
  nccd: {
    label: "NCCD Disability Register",
    permissions: [Permissions.MANAGE_NCCD, Permissions.VIEW_NCCD],
  },
  sick_bay: {
    label: "Sick Bay Visits Log",
    permissions: [Permissions.MANAGE_SICK_BAY, Permissions.VIEW_SICK_BAY],
  },
  three_period_lessons: {
    label: "Three-Period Lessons & Sensitive Periods",
    permissions: [
      Permissions.MANAGE_LESSON_RECORDS,
      Permissions.VIEW_LESSON_RECORDS,
    ],
  },
  visitor_log: {
    label: "Visitor Sign-In Log",
    permissions: [Permissions.MANAGE_VISITOR_LOG, Permissions.VIEW_VISITOR_LOG],
  },
  contractor_log: {
    label: "Contractor Sign-In Log",
    permissions: [
      Permissions.MANAGE_CONTRACTOR_LOG,
      Permissions.VIEW_CONTRACTOR_LOG,
    ],
  },
  dismissal: {
    label: "End-of-Day Dismissal & Pickup",
    permissions: [Permissions.VIEW_DISMISSAL, Permissions.MANAGE_DISMISSAL],
  },
  chronic_absence: {
    label: "Chronic Absence Monitoring",
    permissions: [
      Permissions.VIEW_CHRONIC_ABSENCE,
      Permissions.MANAGE_CHRONIC_ABSENCE,
    ],
  },
  absence_followup: {
    label: "Unexplained Absence Follow-up",
    permissions: [
      Permissions.VIEW_ABSENCE_FOLLOWUP,
      Permissions.MANAGE_ABSENCE_FOLLOWUP,
    ],
  },
  volunteers: {
    label: "Volunteer Coordination",
    permissions: [Permissions.VIEW_VOLUNTEERS, Permissions.MANAGE_VOLUNTEERS],
  },
  material_inventory: {
    label: "Material / Shelf Inventory",
    permissions: [
      Permissions.VIEW_MATERIAL_INVENTORY,
      Permissions.MANAGE_MATERIAL_INVENTORY,
    ],
  },
  naplan: {
    label: "NAPLAN Coordination",
    permissions: [Permissions.VIEW_NAPLAN, Permissions.MANAGE_NAPLAN],
  },
  normalization: {
    label: "Normalization Indicators",
    permissions: [
      Permissions.VIEW_NORMALIZATION,
      Permissions.MANAGE_NORMALIZATION,
    ],
  },
  billing: {
    label: "Billing & Fee Schedules",
    permissions: [Permissions.VIEW_BILLING, Permissions.MANAGE_BILLING],
  },
  recurring_billing: {
    label: "Direct Debit / Recurring Billing",
    permissions: [
      Permissions.VIEW_RECURRING_BILLING,
      Permissions.MANAGE_RECURRING_BILLING,
    ],
  },
  push_notifications: {
    label: "Push Notification Dispatch",
    permissions: [
      Permissions.MANAGE_PUSH_NOTIFICATIONS,
      Permissions.VIEW_NOTIFICATION_ANALYTICS,
    ],
  },
  sms_gateway: {
    label: "SMS Gateway",
    permissions: [
      Permissions.VIEW_SMS_GATEWAY,
      Permissions.MANAGE_SMS_GATEWAY,
      Permissions.SEND_SMS,
    ],
  },
  work_cycle_integrity: {
    label: "Work Cycle Integrity Tracking",
    permissions: [Permissions.VIEW_WORK_CYCLES, Permissions.MANAGE_WORK_CYCLES],
  },
  environment_planner: {
    label: "Prepared Environment Planner",
    permissions: [
      Permissions.VIEW_ENVIRONMENT_PLANNER,
      Permissions.MANAGE_ENVIRONMENT_PLANNER,
    ],
  },
  accreditation: {
    label: "Montessori Accreditation (AMI/AMS/MSAA)",
    permissions: [
      Permissions.VIEW_ACCREDITATION,
      Permissions.MANAGE_ACCREDITATION,
    ],
  },
  montessori_hub: {
    label: "Parent Montessori Literacy Hub",
    permissions: [
      Permissions.VIEW_MONTESSORI_HUB,
      Permissions.MANAGE_MONTESSORI_HUB,
    ],
  },
  grant_tracking: {
    label: "Grant Tracking",
    permissions: [
      Permissions.VIEW_GRANT_TRACKING,
      Permissions.MANAGE_GRANT_TRACKING,
    ],
  },
  fee_notice_comms: {
    label: "Fee Notice Communications",
    permissions: [
      Permissions.VIEW_FEE_NOTICE_COMMS,
      Permissions.MANAGE_FEE_NOTICE_COMMS,
    ],
  },
  newsletter: {
    label: "Newsletter",
    permissions: [
      Permissions.VIEW_NEWSLETTER,
      Permissions.MANAGE_NEWSLETTER,
      Permissions.SEND_NEWSLETTER,
    ],
  },
  tuckshop: {
    label: "Tuckshop Ordering",
    permissions: [
      Permissions.MANAGE_TUCKSHOP,
      Permissions.PLACE_TUCKSHOP_ORDER,
    ],
  },
} as const;
