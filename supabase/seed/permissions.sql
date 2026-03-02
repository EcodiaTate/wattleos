-- ============================================================
-- WattleOS V2 — Seed: System Permissions (All 47)
-- ============================================================
-- These are system-defined, global permission keys.
-- Schools cannot create or delete these. They can only assign
-- them to roles via role_permissions.
--
-- Modules:
--   admin           → tenant/user management
--   pedagogy        → observations, curriculum, mastery, reports
--   classes         → class listing and management
--   sis             → student information system
--   attendance      → roll call and absence reports
--   comms           → announcements, messaging, events, directory
--   timesheets      → time logging and payroll approval
--   enrollment      → enrollment periods and applications
--   programs        → OSHC/programs and session bookings
--   admissions      → waitlist, tours, pipeline
--   curriculum_content → cross-mappings, compliance, templates
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES

  -- ── Admin ───────────────────────────────────────────────────────
  ('manage_tenant_settings', 'Manage School Settings',      'admin', 'Configure school name, branding, timezone, and feature flags'),
  ('manage_users',           'Manage Users & Roles',        'admin', 'Invite users, assign roles, suspend accounts'),
  ('view_audit_logs',        'View Audit Logs',             'admin', 'View security and activity audit trail'),
  ('manage_integrations',    'Manage Integrations',         'admin', 'Configure Stripe, Xero, Google Workspace connections'),

  -- ── Pedagogy ────────────────────────────────────────────────────
  ('create_observation',     'Create Observations',         'pedagogy', 'Create observation records with student and outcome tags'),
  ('publish_observation',    'Publish Observations',        'pedagogy', 'Publish draft observations to the parent portal'),
  ('view_all_observations',  'View All Observations',       'pedagogy', 'View observations created by any guide in the school'),
  ('manage_curriculum',      'Manage Curriculum',           'pedagogy', 'Edit curriculum instances, add/remove/reorder nodes'),
  ('manage_mastery',         'Update Mastery Status',       'pedagogy', 'Update student mastery levels against curriculum outcomes'),
  ('manage_reports',         'Create & Manage Reports',     'pedagogy', 'Create, edit, and publish student term reports'),

  -- ── Classes ─────────────────────────────────────────────────────
  ('view_classes',           'View Classes',                'classes', 'View class list, rosters, and class details'),
  ('manage_classes',         'Create & Edit Classes',       'classes', 'Create new classes, edit details, manage rosters'),

  -- ── SIS ─────────────────────────────────────────────────────────
  ('view_students',          'View Students',               'sis', 'View student profiles and enrollment information'),
  ('manage_students',        'Create & Edit Students',      'sis', 'Create new students, edit profiles, manage enrollment'),
  ('view_medical_records',   'View Medical Records',        'sis', 'View student medical conditions and emergency contacts'),
  ('manage_medical_records', 'Manage Medical Records',      'sis', 'Create and edit medical conditions, action plans, medications'),
  ('manage_safety_records',  'Manage Custody & Safety',     'sis', 'Manage custody restrictions and court orders'),
  ('manage_enrollment',      'Manage Enrollment',           'sis', 'Enroll, transfer, and withdraw students from classes'),

  -- ── Attendance ──────────────────────────────────────────────────
  ('manage_attendance',         'Manage Attendance',        'attendance', 'Record daily attendance, check-in/out times'),
  ('view_attendance_reports',   'View Attendance Reports',  'attendance', 'View attendance summaries and absence reports'),

  -- ── Communications ──────────────────────────────────────────────
  ('send_announcements',     'Send School Announcements',   'comms', 'Send school-wide announcements to all parents'),
  ('send_class_messages',    'Send Class Messages',         'comms', 'Send messages to parents within a class/cohort'),
  ('manage_events',          'Manage School Events',        'comms', 'Create, edit, and cancel school calendar events'),
  ('moderate_chat',          'Moderate Chat',               'comms', 'Delete or hide messages in any chat channel'),
  ('manage_directory',       'Manage Family Directory',     'comms', 'View and manage the parent/family contact directory'),
  ('view_message_analytics', 'View Message Analytics',      'comms', 'View announcement reach and read-rate analytics'),

  -- ── Timesheets ──────────────────────────────────────────────────
  ('log_time',               'Log Time Entries',            'timesheets', 'Create and edit own time entries'),
  ('approve_timesheets',     'Approve Timesheets',          'timesheets', 'Review and approve/reject staff timesheets'),
  ('view_all_timesheets',    'View All Timesheets',         'timesheets', 'View timesheets for all staff members'),

  -- ── Enrollment & Onboarding ─────────────────────────────────────
  ('manage_enrollment_periods',  'Manage Enrollment Periods',    'enrollment', 'Create and manage enrollment intake periods'),
  ('review_applications',        'Review Applications',          'enrollment', 'View and comment on enrollment applications'),
  ('approve_applications',       'Approve Applications',         'enrollment', 'Accept or reject enrollment applications'),
  ('manage_parent_invitations',  'Manage Parent Invitations',    'enrollment', 'Send and revoke parent portal invitations'),
  ('view_enrollment_dashboard',  'View Enrollment Dashboard',    'enrollment', 'View enrollment funnel metrics and dashboards'),

  -- ── Programs / OSHC ─────────────────────────────────────────────
  ('manage_programs',        'Manage Programs',             'programs', 'Create and configure OSHC and care programs'),
  ('manage_bookings',        'Manage Session Bookings',     'programs', 'Create, edit, and cancel student session bookings'),
  ('checkin_checkout',       'Check-in / Check-out',        'programs', 'Check students in and out at the kiosk'),
  ('view_program_reports',   'View Program Reports',        'programs', 'View utilisation and revenue reports for programs'),
  ('manage_ccs_settings',    'Manage CCS Settings',         'programs', 'Configure Child Care Subsidy activity types and settings'),

  -- ── Admissions & Waitlist ────────────────────────────────────────
  ('manage_waitlist',           'Manage Waitlist',          'admissions', 'Add, edit, and remove waitlist entries'),
  ('view_waitlist',             'View Waitlist',            'admissions', 'View waitlist entries and family details'),
  ('manage_tours',              'Manage Tours',             'admissions', 'Create tour slots and record attendance'),
  ('manage_email_templates',    'Manage Email Templates',   'admissions', 'Create and edit automated admissions email templates'),
  ('view_admissions_analytics', 'View Admissions Analytics','admissions', 'View waitlist conversion and tour funnel analytics'),

  -- ── Curriculum Content ───────────────────────────────────────────
  ('manage_cross_mappings',        'Manage Cross-Mappings',       'curriculum_content', 'Create mappings between curriculum frameworks'),
  ('view_compliance_reports',      'View Compliance Reports',     'curriculum_content', 'View NQS and framework compliance coverage reports'),
  ('manage_curriculum_templates',  'Manage Curriculum Templates', 'curriculum_content', 'Create and publish reusable curriculum templates')

ON CONFLICT (key) DO NOTHING;
