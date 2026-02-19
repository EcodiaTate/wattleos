-- ============================================================
-- WattleOS V2 — Seed: System Permissions
-- ============================================================
-- These are system-defined, global permission keys.
-- Schools cannot create or delete these. They can only assign
-- them to roles via role_permissions.
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  -- Admin module
  ('manage_tenant_settings', 'Manage School Settings', 'admin', 'Configure school name, branding, timezone, and feature flags'),
  ('manage_users', 'Manage Users & Roles', 'admin', 'Invite users, assign roles, suspend accounts'),
  ('view_audit_logs', 'View Audit Logs', 'admin', 'View security and activity audit trail'),
  ('manage_integrations', 'Manage Integrations', 'admin', 'Configure Stripe, Xero, Google Workspace connections'),

  -- Pedagogy module
  ('create_observation', 'Create Observations', 'pedagogy', 'Create observation records with student and outcome tags'),
  ('publish_observation', 'Publish Observations', 'pedagogy', 'Publish draft observations to the parent portal'),
  ('view_all_observations', 'View All Observations', 'pedagogy', 'View observations created by any guide in the school'),
  ('manage_curriculum', 'Manage Curriculum', 'pedagogy', 'Edit curriculum instances, add/remove/reorder nodes'),
  ('manage_mastery', 'Update Mastery Status', 'pedagogy', 'Update student mastery levels against curriculum outcomes'),
  ('manage_reports', 'Create & Manage Reports', 'pedagogy', 'Create, edit, and publish student term reports'),

  -- SIS module
  ('view_students', 'View Students', 'sis', 'View student profiles and enrollment information'),
  ('manage_students', 'Create & Edit Students', 'sis', 'Create new students, edit profiles, manage enrollment'),
  ('view_medical_records', 'View Medical Records', 'sis', 'View student medical conditions and emergency contacts'),
  ('manage_medical_records', 'Manage Medical Records', 'sis', 'Create and edit medical conditions, action plans, medications'),
  ('manage_safety_records', 'Manage Custody & Safety', 'sis', 'Manage custody restrictions and court orders'),
  ('manage_enrollment', 'Manage Enrollment', 'sis', 'Enroll, transfer, and withdraw students from classes'),

  -- Attendance module
  ('manage_attendance', 'Manage Attendance', 'attendance', 'Record daily attendance, check-in/out times'),
  ('view_attendance_reports', 'View Attendance Reports', 'attendance', 'View attendance summaries and absence reports'),

  -- Communications module
  ('send_announcements', 'Send School Announcements', 'comms', 'Send school-wide announcements to all parents'),
  ('send_class_messages', 'Send Class Messages', 'comms', 'Send messages to parents within a class/cohort')
ON CONFLICT (key) DO NOTHING;
