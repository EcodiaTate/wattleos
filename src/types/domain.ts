// ============================================================
// WattleOS V2 — Domain Types
// ============================================================
// These types are the contract between the database and the
// application layer. Generated types from Supabase supplement
// these, but these domain types are canonical.
//
// UPDATED: TenantContext now uses nested Tenant/User objects
// matching the actual getTenantContext() implementation.
// ============================================================

// ============================================================
// Enums
// ============================================================

export type PlanTier = 'basic' | 'pro' | 'enterprise';

export type UserStatus = 'active' | 'invited' | 'suspended';

export type CurriculumLevel = 'area' | 'strand' | 'outcome' | 'activity';

export type ObservationStatus = 'draft' | 'published' | 'archived';

export type MasteryStatus = 'not_started' | 'presented' | 'practicing' | 'mastered';

export type EnrollmentStatus = 'inquiry' | 'applicant' | 'active' | 'withdrawn' | 'graduated';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'half_day';

export type MedicalSeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export type RestrictionType = 'no_contact' | 'no_pickup' | 'supervised_only' | 'no_information';

export type ReportStatus = 'draft' | 'review' | 'approved' | 'published';

export type AnnouncementPriority = 'normal' | 'urgent';

export type AnnouncementTargetType = 'school_wide' | 'class';

export type MessageThreadType = 'class_broadcast' | 'direct';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type StorageProvider = 'supabase' | 'google_drive';

// ============================================================
// Core Platform
// ============================================================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  timezone: string;
  country: string;
  currency: string;
  settings: Record<string, unknown>;
  plan_tier: PlanTier;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  key: string;
  label: string;
  module: string;
  description: string | null;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tenant Context (returned by getTenantContext)
// ============================================================
// This is the shape returned by getTenantContext() in
// src/lib/auth/tenant-context.ts. It carries the full
// resolved tenant, user, role, and permission keys.
//
// ACCESS PATTERN IN ACTION FILES:
//   const context = await getTenantContext();
//   context.tenant.id    — the tenant UUID
//   context.user.id      — the authenticated user UUID
//   context.role.name    — the role display name
//   context.permissions  — string[] of permission keys
// ============================================================
export interface TenantContext {
  tenant: Tenant;
  user: User;
  role: Role;
  permissions: string[];  // Array of permission keys for fast checks
}

// ============================================================
// Curriculum
// ============================================================

export interface CurriculumTemplate {
  id: string;
  name: string;
  framework: string;
  age_range: string | null;
  description: string | null;
  version: number;
  is_active: boolean;
}

export interface CurriculumInstance {
  id: string;
  tenant_id: string;
  source_template_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface CurriculumNode {
  id: string;
  tenant_id: string;
  instance_id: string;
  parent_id: string | null;
  source_template_node_id: string | null;
  level: CurriculumLevel;
  title: string;
  description: string | null;
  sequence_order: number;
  is_hidden: boolean;
}

export interface CurriculumTemplateNode {
  id: string;
  template_id: string;
  parent_id: string | null;
  level: CurriculumLevel;
  title: string;
  description: string | null;
  sequence_order: number;
}

// ============================================================
// Observations
// ============================================================

export interface Observation {
  id: string;
  tenant_id: string;
  author_id: string;
  content: string | null;
  status: ObservationStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationWithRelations extends Observation {
  author: User;
  students: Student[];
  outcomes: CurriculumNode[];
  media: ObservationMedia[];
}

export interface ObservationMedia {
  id: string;
  tenant_id: string;
  observation_id: string;
  media_type: MediaType;
  storage_provider: StorageProvider;
  storage_path: string | null;
  google_drive_file_id: string | null;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
}
// Flat student shape for observation display
export interface ObservationStudent {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  photo_url: string | null;
}

// Flat outcome shape for observation display
export interface ObservationOutcome {
  id: string;
  title: string;
  level: string;
}

// Feed item shape — returned by getObservationFeed / getObservation.
// Uses flat arrays (unwrapped from Supabase join shape) so UI
// components can access .students, .outcomes, .media directly.
export interface ObservationFeedItem {
  id: string;
  content: string | null;
  status: ObservationStatus;
  published_at: string | null;
  created_at: string;
  author: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
  students: ObservationStudent[];
  outcomes: ObservationOutcome[];
  media: ObservationMedia[];
}
// ============================================================
// Mastery
// ============================================================

export interface StudentMastery {
  id: string;
  tenant_id: string;
  student_id: string;
  curriculum_node_id: string;
  status: MasteryStatus;
  date_achieved: string | null;
  assessed_by: string | null;
  notes: string | null;
}

export interface MasteryHistoryEntry {
  id: string;
  tenant_id: string;
  student_mastery_id: string;
  student_id: string;
  curriculum_node_id: string;
  previous_status: MasteryStatus | null;
  new_status: MasteryStatus;
  changed_by: string | null;
  changed_at: string;
}

// ============================================================
// Students & SIS
// ============================================================

export interface Student {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  gender: string | null;
  photo_url: string | null;
  enrollment_status: EnrollmentStatus;
  notes: string | null;
  // ✅ add these
  created_at: string;
  updated_at: string;
}

export interface StudentWithDetails extends Student {
  enrollments: EnrollmentWithClass[];
  guardians: GuardianWithUser[];
  medical_conditions: MedicalCondition[];
  emergency_contacts: EmergencyContact[];
  custody_restrictions: CustodyRestriction[];
}

export interface Class {
  id: string;
  tenant_id: string;
  name: string;
  room: string | null;
  cycle_level: string | null;
  curriculum_instance_id: string | null;
  is_active: boolean;
}

// Class with computed enrollment count — returned by listClasses
export interface ClassWithCounts extends Class {
  active_enrollment_count: number;
}

export interface Enrollment {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
}

// Enrollment with nested class — used in student detail view
export interface EnrollmentWithClass extends Enrollment {
  class: Class;
}

// Enrollment with nested student — used in class roster view
export interface EnrollmentWithStudent extends Enrollment {
  student: Student;
}

export interface Guardian {
  id: string;
  tenant_id: string;
  user_id: string;
  student_id: string;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
  pickup_authorized: boolean;
  phone: string | null;
  media_consent: boolean;
  directory_consent: boolean;
}

// Guardian with nested user profile — used in student detail view
export interface GuardianWithUser extends Guardian {
  user: Pick<User, 'id' | 'email' | 'first_name' | 'last_name' | 'avatar_url'>;
}

export interface MedicalCondition {
  id: string;
  tenant_id: string;
  student_id: string;
  condition_type: string;
  condition_name: string;
  severity: MedicalSeverity;
  description: string | null;
  action_plan: string | null;
  action_plan_doc_url: string | null;
  requires_medication: boolean;
  medication_name: string | null;
  medication_location: string | null;
  expiry_date: string | null;
}

export interface EmergencyContact {
  id: string;
  tenant_id: string;
  student_id: string;
  name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  priority_order: number;
  notes: string | null;
}

export interface CustodyRestriction {
  id: string;
  tenant_id: string;
  student_id: string;
  restricted_person_name: string;
  restriction_type: RestrictionType;
  court_order_reference: string | null;
  court_order_doc_url: string | null;
  effective_date: string;
  expiry_date: string | null;
  notes: string | null;
}

// ============================================================
// Attendance
// ============================================================

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  class_id: string | null;
  date: string;
  status: AttendanceStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  notes: string | null;
  recorded_by: string | null;
}

export interface PickupAuthorization {
  id: string;
  tenant_id: string;
  student_id: string;
  authorized_name: string;
  relationship: string | null;
  phone: string | null;
  photo_url: string | null;
  is_permanent: boolean;
  valid_from: string | null;
  valid_until: string | null;
  authorized_by: string | null;
}

// ============================================================
// Reporting
// ============================================================

export interface ReportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  content: Record<string, unknown>;
  cycle_level: string | null;
  is_active: boolean;
}

export interface StudentReport {
  id: string;
  tenant_id: string;
  student_id: string;
  template_id: string | null;
  author_id: string;
  term: string | null;
  content: Record<string, unknown>;
  status: ReportStatus;
  published_at: string | null;
  google_doc_id: string | null;
  pdf_storage_path: string | null;
}

// ============================================================
// Audit
// ============================================================

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// ADDITIONS TO src/types/domain.ts
// ============================================================
// Add these types at the bottom of domain.ts, after the
// Reporting section and before the Audit section.
//
//   
// ============================================================

// ============================================================
// Communications
// ============================================================

export interface Announcement {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_type: AnnouncementTargetType;
  target_class_id: string | null;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

// Announcement with author info — used in feed display
export interface AnnouncementWithAuthor extends Announcement {
  author: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
  target_class: Pick<Class, 'id' | 'name'> | null;
  read_count?: number;
  is_read?: boolean;
}

export interface AnnouncementRead {
  id: string;
  tenant_id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface MessageThread {
  id: string;
  tenant_id: string;
  subject: string | null;
  thread_type: MessageThreadType;
  class_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Thread with preview info — used in inbox list
export interface MessageThreadWithPreview extends MessageThread {
  creator: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
  target_class: Pick<Class, 'id' | 'name'> | null;
  last_message: Pick<Message, 'id' | 'content' | 'sent_at' | 'sender_id'> | null;
  last_message_sender: Pick<User, 'id' | 'first_name' | 'last_name'> | null;
  unread_count: number;
  recipient_count: number;
}

export interface Message {
  id: string;
  tenant_id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  created_at: string;
}

// Message with sender info — used in thread view
export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
}

export interface MessageRecipient {
  id: string;
  tenant_id: string;
  thread_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
}

// ============================================================
// DOMAIN_TYPES_ADDITIONS.ts — Module 8a Integration Types
// ============================================================
// Merge these into your existing src/types/domain.ts file.
// Add them after the existing Audit section.
// ============================================================

// ============================================================
// Integrations
// ============================================================

export interface IntegrationConfig {
  id: string;
  tenant_id: string;
  provider: string;
  is_enabled: boolean;
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IntegrationSyncLog {
  id: string;
  tenant_id: string;
  provider: string;
  operation: string;
  entity_type: string | null;
  entity_id: string | null;
  status: 'success' | 'failure' | 'pending';
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export interface StudentPortfolioFolder {
  id: string;
  tenant_id: string;
  student_id: string;
  drive_folder_id: string;
  drive_folder_url: string | null;
  year: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// DOMAIN_TYPES_ADDITIONS_8B.ts — Module 8b Billing Types
// ============================================================
// Merge these into your existing src/types/domain.ts file.
// Add them after the Integration types from Batch 8a.
// ============================================================

// ============================================================
// Billing — Fee Schedules
// ============================================================

export interface FeeSchedule {
  id: string;
  tenant_id: string;
  name: string;
  class_id: string | null;
  amount_cents: number;
  currency: string;
  frequency: string;
  description: string | null;
  is_active: boolean;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// Billing — Invoices
// ============================================================

export interface Invoice {
  id: string;
  tenant_id: string;
  student_id: string;
  guardian_id: string;
  invoice_number: string;
  status: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  currency: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_hosted_url: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InvoiceWithDetails extends Invoice {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
  } | null;
  guardian: {
    id: string;
    user_id: string;
    relationship: string;
    user?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  } | null;
  line_items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  fee_schedule_id: string | null;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_cents: number;
  created_at: string;
}

// ============================================================
// Billing — Payments
// ============================================================

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method_type: string | null;
  payment_method_last4: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  failure_reason: string | null;
  refund_amount_cents: number;
  refund_reason: string | null;
  paid_at: string | null;
  created_at: string;
}

// ============================================================
// Billing — Stripe Customers
// ============================================================

export interface StripeCustomer {
  id: string;
  tenant_id: string;
  guardian_id: string;
  stripe_customer_id: string;
  email: string | null;
  default_payment_method: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// APPEND TO: src/types/domain.ts
// ============================================================
// Add these types at the bottom of your existing domain.ts file,
// after the AuditLog interface and before the closing comments.
// ============================================================

// ============================================================
// Timesheets & Payroll (Module 9)
// ============================================================

export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';
export type PayPeriodStatus = 'open' | 'locked' | 'processed';
export type TimeEntryType =
  | 'regular'
  | 'overtime'
  | 'public_holiday'
  | 'sick_leave'
  | 'annual_leave'
  | 'unpaid_leave';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'synced';
export type PayrollProvider = 'xero' | 'keypay';

export interface PayPeriod {
  id: string;
  tenant_id: string;
  name: string;
  start_date: string;
  end_date: string;
  frequency: PayFrequency;
  status: PayPeriodStatus;
  locked_at: string | null;
  locked_by: string | null;
}

export interface TimeEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  pay_period_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  total_hours: number;
  entry_type: TimeEntryType;
  class_id: string | null;
  notes: string | null;
}

export interface Timesheet {
  id: string;
  tenant_id: string;
  user_id: string;
  pay_period_id: string;
  status: TimesheetStatus;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  leave_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_notes: string | null;
  synced_at: string | null;
  sync_reference: string | null;
}

export interface TimesheetWithEntries extends Timesheet {
  time_entries: TimeEntry[];
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'avatar_url'>;
}

export interface EmployeeMapping {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: PayrollProvider;
  external_id: string;
  external_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface PayrollSettings {
  id: string;
  tenant_id: string;
  pay_frequency: PayFrequency;
  pay_cycle_start_day: number;
  default_start_time: string;
  default_end_time: string;
  default_break_minutes: number;
  payroll_provider: PayrollProvider | null;
  provider_config: Record<string, unknown>;
  auto_create_periods: boolean;
}