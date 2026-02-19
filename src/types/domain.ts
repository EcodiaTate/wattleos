// src/types/domain.ts
// ============================================================
// WattleOS V2 - Domain Types (CONSOLIDATED)
// ============================================================
// These types are the contract between the database and the
// application layer. Generated types from Supabase supplement
// these, but these domain types are canonical.
//
// Consolidation notes:
// - Removed duplicate identifiers (ApplicationStatus, EnrollmentPeriodStatus, etc.)
// - Removed duplicate interfaces with conflicting shapes (Announcement, CurriculumCrossMapping, etc.)
// - Kept the *most expressive / strict* versions as canonical.
// - Where “Module 14” wanted alternate names, we use aliases instead of re-declaring.
// ============================================================

// ============================================================
// Enums / Unions
// ============================================================

export type PlanTier = "basic" | "pro" | "enterprise";

export type UserStatus = "active" | "invited" | "suspended";

export type CurriculumLevel = "area" | "strand" | "outcome" | "activity";

export type ObservationStatus = "draft" | "published" | "archived";

export type MasteryStatus =
  | "not_started"
  | "presented"
  | "practicing"
  | "mastered";

export type EnrollmentStatus =
  | "inquiry"
  | "applicant"
  | "active"
  | "withdrawn"
  | "graduated";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "half_day";

export type MedicalSeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "life_threatening";

export type RestrictionType =
  | "no_contact"
  | "no_pickup"
  | "supervised_only"
  | "no_information";

export type ReportStatus = "draft" | "review" | "approved" | "published";

export type MediaType = "image" | "video" | "audio" | "document";

export type StorageProvider = "supabase" | "google_drive";

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

export interface TenantContext {
  tenant: Tenant;
  user: User;
  role: Role;
  permissions: string[];
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

export interface ObservationWithRelations extends Observation {
  author: User;
  students: Student[];
  outcomes: CurriculumNode[];
  media: ObservationMedia[];
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

export interface ObservationFeedItem {
  id: string;
  content: string | null;
  status: ObservationStatus;
  published_at: string | null;
  created_at: string;
  author: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
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
  created_at: string;
  updated_at: string;
}

// ============================================================
// Curriculum Cross-Mapping
// ============================================================

export type CrossMappingType =
  | "aligned"
  | "partially_aligned"
  | "prerequisite"
  | "extends";
export type CrossMappingConfidence = "verified" | "suggested" | "community";

export interface CurriculumCrossMapping {
  id: string;
  tenant_id: string | null;
  source_template_id: string;
  source_node_id: string;
  target_template_id: string;
  target_node_id: string;
  mapping_type: CrossMappingType;
  confidence: CrossMappingConfidence;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CrossMappingWithDetails extends CurriculumCrossMapping {
  source_node: {
    id: string;
    title: string;
    code: string | null;
    level: string;
  };
  source_template: {
    id: string;
    name: string;
    framework: string | null;
  };
  target_node: {
    id: string;
    title: string;
    code: string | null;
    level: string;
  };
  target_template: {
    id: string;
    name: string;
    framework: string | null;
  };
}

export interface LinkedOutcome {
  node_id: string;
  node_title: string;
  node_code: string | null;
  template_id: string;
  template_name: string;
  framework: string | null;
  mapping_type: CrossMappingType;
  confidence: CrossMappingConfidence;
}

// ============================================================
// Enhanced Curriculum Template / Node (Module 14 columns)
// ============================================================

export interface EnhancedCurriculumTemplate {
  id: string;
  name: string;
  slug: string;
  framework: string | null;
  age_range: string | null;
  description: string | null;
  version: number;
  is_active: boolean;
  country: string | null;
  state: string | null;
  is_compliance_framework: boolean;
}

export interface EnhancedCurriculumNode {
  id: string;
  tenant_id: string;
  instance_id: string;
  parent_id: string | null;
  source_template_node_id: string | null;
  level: string;
  title: string;
  description: string | null;
  sequence_order: number;
  is_hidden: boolean;
  code: string | null;
  materials: string[] | null;
  direct_aims: string[] | null;
  indirect_aims: string[] | null;
  age_range: string | null;
  prerequisites: string[] | null;
  assessment_criteria: string | null;
  content_url: string | null;
}

// ============================================================
// Compliance Report Types
// ============================================================

export interface ComplianceEvidence {
  type: "observation" | "mastery";
  id: string;
  summary: string;
  student_name: string;
  student_id: string;
  date: string;
  source_outcome: {
    id: string;
    title: string;
    code: string | null;
  } | null;
}

export interface ComplianceReportItem {
  outcome_id: string;
  outcome_title: string;
  outcome_code: string | null;
  evidence_count: number;
  evidence: ComplianceEvidence[];
}

export interface ComplianceReport {
  framework: string;
  template_id: string;
  template_name: string;
  generated_at: string;
  outcomes: ComplianceReportItem[];
  total_evidence: number;
  outcomes_with_evidence: number;
  outcomes_without_evidence: number;
}

// ============================================================
// Material Search Result
// ============================================================

export interface MaterialSearchResult {
  node_id: string;
  node_title: string;
  node_code: string | null;
  node_level: string;
  materials: string[];
  template_id: string;
  template_name: string;
  framework: string | null;
  instance_id: string | null;
  instance_name: string | null;
}

// ============================================================
// Classes / Enrollments / Guardians / Medical / Emergency
// ============================================================

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

export interface EnrollmentWithClass extends Enrollment {
  class: Class;
}

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

export interface GuardianWithUser extends Guardian {
  user: Pick<User, "id" | "email" | "first_name" | "last_name" | "avatar_url">;
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
// Integrations (Module 8a)
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
  status: "success" | "failure" | "pending";
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
// Billing (Module 8b)
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
// Timesheets & Payroll (Module 9)
// ============================================================

export type PayFrequency = "weekly" | "fortnightly" | "monthly";
export type PayPeriodStatus = "open" | "locked" | "processed";

export type TimeEntryType =
  | "regular"
  | "overtime"
  | "public_holiday"
  | "sick_leave"
  | "annual_leave"
  | "unpaid_leave";

export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "synced";

export type PayrollProvider = "xero" | "keypay";

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
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
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

// ============================================================
// Admissions / Enrollment Applications (Module 10)
// ============================================================

export type EnrollmentPeriodType =
  | "new_enrollment"
  | "re_enrollment"
  | "mid_year";
export type EnrollmentPeriodStatus = "draft" | "open" | "closed" | "archived";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ParentInvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

// -- JSONB shape types (denormalized data inside applications) --

export interface ApplicationGuardian {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
  pickup_authorized: boolean;
  address: string | null;
}

export interface ApplicationMedicalCondition {
  condition_type: string;
  condition_name: string;
  severity: string;
  description: string | null;
  action_plan: string | null;
  requires_medication: boolean;
  medication_name: string | null;
  medication_location: string | null;
}

export interface ApplicationEmergencyContact {
  name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  priority_order: number;
}

export interface ApplicationCustodyRestriction {
  restricted_person_name: string;
  restriction_type: string;
  court_order_reference: string | null;
  notes: string | null;
}

// -- Core entities --

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "date";
  required: boolean;
  options?: string[];
}

export interface EnrollmentPeriod {
  id: string;
  tenant_id: string;
  name: string;
  period_type: EnrollmentPeriodType;
  year: number;
  opens_at: string;
  closes_at: string | null;
  status: EnrollmentPeriodStatus;
  available_programs: string[];
  required_documents: string[];
  custom_fields: CustomField[];
  welcome_message: string | null;
  confirmation_message: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EnrollmentApplication {
  id: string;
  tenant_id: string;
  enrollment_period_id: string;
  status: ApplicationStatus;
  submitted_by_email: string;
  submitted_by_user: string | null;
  submitted_at: string | null;
  child_first_name: string;
  child_last_name: string;
  child_preferred_name: string | null;
  child_date_of_birth: string;
  child_gender: string | null;
  child_nationality: string | null;
  child_languages: string[] | null;
  child_previous_school: string | null;
  requested_program: string | null;
  requested_start_date: string | null;
  requested_class_id: string | null;
  existing_student_id: string | null;
  guardians: ApplicationGuardian[];
  medical_conditions: ApplicationMedicalCondition[];
  emergency_contacts: ApplicationEmergencyContact[];
  custody_restrictions: ApplicationCustodyRestriction[];
  media_consent: boolean;
  directory_consent: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  privacy_accepted: boolean;
  custom_responses: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  change_request_notes: string | null;
  created_student_id: string | null;
  approved_class_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EnrollmentDocument {
  id: string;
  tenant_id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by_email: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Application with enriched data for the admin review screen */
export interface ApplicationWithDetails extends EnrollmentApplication {
  enrollment_period: Pick<
    EnrollmentPeriod,
    "id" | "name" | "year" | "period_type"
  >;
  documents: EnrollmentDocument[];
  reviewer: Pick<User, "id" | "first_name" | "last_name"> | null;
  existing_student: Pick<Student, "id" | "first_name" | "last_name"> | null;
  requested_class: Pick<Class, "id" | "name"> | null;
}

export interface ParentInvitation {
  id: string;
  tenant_id: string;
  email: string;
  student_id: string;
  invited_by: string;
  token: string;
  status: ParentInvitationStatus;
  accepted_at: string | null;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ParentInvitationWithDetails extends ParentInvitation {
  student: Pick<Student, "id" | "first_name" | "last_name">;
  inviter: Pick<User, "id" | "first_name" | "last_name">;
}

// ============================================================
// Module 11: Extended Day / OSHC / Programs
// ============================================================

export type ProgramType =
  | "before_school_care"
  | "after_school_care"
  | "vacation_care"
  | "extracurricular"
  | "extended_day"
  | "adolescent_program"
  | "senior_elective"
  | "other";

export type BillingType = "per_session" | "per_term" | "per_year" | "included";
export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type BookingType = "recurring" | "casual" | "makeup";
export type BookingStatus =
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "no_show";
export type ProgramBillingStatus =
  | "unbilled"
  | "billed"
  | "waived"
  | "refunded";
export type RecurringPatternStatus = "active" | "paused" | "cancelled";

export interface Program {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  program_type: ProgramType;
  description: string | null;
  min_age_months: number | null;
  max_age_months: number | null;
  eligible_class_ids: string[] | null;
  default_start_time: string | null;
  default_end_time: string | null;
  default_days: string[];
  max_capacity: number | null;
  session_fee_cents: number;
  casual_fee_cents: number | null;
  billing_type: BillingType;
  cancellation_notice_hours: number;
  late_cancel_fee_cents: number;
  ccs_eligible: boolean;
  ccs_activity_type: string | null;
  ccs_service_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgramSession {
  id: string;
  tenant_id: string;
  program_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  status: SessionStatus;
  location: string | null;
  staff_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgramSessionWithDetails extends ProgramSession {
  program: Pick<
    Program,
    "id" | "name" | "code" | "program_type" | "max_capacity"
  >;
  confirmed_count: number;
  waitlisted_count: number;
  staff: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface SessionBooking {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  booked_by: string;
  booking_type: BookingType;
  recurring_pattern_id: string | null;
  status: BookingStatus;
  waitlist_position: number | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  fee_cents: number;
  billing_status: ProgramBillingStatus;
  invoice_line_id: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  late_cancellation: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BookingWithStudent extends SessionBooking {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  has_medical_conditions: boolean;
  has_allergies: boolean;
}

export interface RecurringBookingPattern {
  id: string;
  tenant_id: string;
  program_id: string;
  student_id: string;
  booked_by: string;
  days_of_week: string[];
  effective_from: string;
  effective_until: string | null;
  status: RecurringPatternStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// Module 12: Community & Communications (CANONICAL)
// ============================================================

export type ChannelType = "class_group" | "program_group" | "direct" | "staff";
export type ChannelMemberRole = "owner" | "admin" | "member" | "read_only";
export type ChatMessageType = "text" | "image" | "file" | "system";

export type EventType =
  | "general"
  | "excursion"
  | "parent_meeting"
  | "performance"
  | "sports_day"
  | "fundraiser"
  | "professional_development"
  | "public_holiday"
  | "pupil_free_day"
  | "term_start"
  | "term_end";

export type EventScope = "school" | "class" | "program" | "staff";
export type RsvpStatus = "going" | "not_going" | "maybe";

export interface AttachmentRef {
  name: string;
  url: string;
  mime_type: string;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  target_class_id: string | null;
  target_program_id: string | null;
  published_at: string;
  scheduled_for: string | null;
  expires_at: string | null;
  attachment_urls: AttachmentRef[];
  requires_acknowledgement: boolean;
  pin_to_top: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AnnouncementWithDetails extends Announcement {
  author: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  target_class: Pick<Class, "id" | "name"> | null;
  acknowledgement_count: number;
  is_acknowledged: boolean;
}

export interface AnnouncementAcknowledgement {
  id: string;
  tenant_id: string;
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
}

export interface ChatChannel {
  id: string;
  tenant_id: string;
  channel_type: ChannelType;
  name: string | null;
  class_id: string | null;
  program_id: string | null;
  created_by: string;
  is_active: boolean;
  allow_parent_posts: boolean;
  is_moderated: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChatChannelWithPreview extends ChatChannel {
  last_message: Pick<
    ChatMessage,
    "id" | "content" | "sender_id" | "created_at"
  > | null;
  unread_count: number;
  member_count: number;
}

export interface ChatChannelMember {
  id: string;
  tenant_id: string;
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  muted: boolean;
  last_read_at: string | null;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  tenant_id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: ChatMessageType;
  attachment_url: string | null;
  attachment_name: string | null;
  reply_to_id: string | null;
  is_hidden: boolean;
  hidden_by: string | null;
  hidden_reason: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  reply_to: Pick<ChatMessage, "id" | "content" | "sender_id"> | null;
}

export interface SchoolEvent {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  location_url: string | null;
  scope: EventScope;
  target_class_id: string | null;
  target_program_id: string | null;
  rsvp_enabled: boolean;
  rsvp_deadline: string | null;
  max_attendees: number | null;
  created_by: string;
  attachment_urls: AttachmentRef[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SchoolEventWithRsvp extends SchoolEvent {
  going_count: number;
  maybe_count: number;
  not_going_count: number;
  user_rsvp: RsvpStatus | null;
}

export interface EventRsvp {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  guests: number;
  notes: string | null;
  responded_at: string;
}

export interface FamilyDirectoryEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string;
  phone_visible: boolean;
  email_visible: boolean;
  children_names: string[] | null;
  bio: string | null;
  interests: string[] | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NotificationPreferences {
  id: string;
  tenant_id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  notify_observations: boolean;
  notify_reports: boolean;
  notify_attendance: boolean;
  notify_announcements: boolean;
  notify_messages: boolean;
  notify_events: boolean;
  notify_bookings: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Module 13: Waitlist & Admissions Pipeline
// ============================================================

export type WaitlistStage =
  | "inquiry"
  | "waitlisted"
  | "tour_scheduled"
  | "tour_completed"
  | "offered"
  | "accepted"
  | "enrolled"
  | "declined"
  | "withdrawn";

export type OfferResponse = "accepted" | "declined";

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  stage: WaitlistStage;
  priority: number;
  child_first_name: string;
  child_last_name: string;
  child_date_of_birth: string;
  child_gender: string | null;
  child_current_school: string | null;
  requested_program: string | null;
  requested_start: string | null;
  requested_start_date: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string | null;
  parent_user_id: string | null;
  siblings_at_school: boolean;
  sibling_names: string | null;
  how_heard_about_us: string | null;
  notes: string | null;
  admin_notes: string | null;
  tour_date: string | null;
  tour_guide: string | null;
  tour_notes: string | null;
  tour_attended: boolean | null;
  offered_at: string | null;
  offered_program: string | null;
  offered_start_date: string | null;
  offer_expires_at: string | null;
  offer_response: OfferResponse | null;
  offer_response_at: string | null;
  converted_application_id: string | null;
  source_url: string | null;
  source_campaign: string | null;
  inquiry_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WaitlistStageHistoryEntry {
  id: string;
  tenant_id: string;
  waitlist_entry_id: string;
  from_stage: WaitlistStage | null;
  to_stage: WaitlistStage;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

/** Waitlist entry with stage history for the detail view */
export interface WaitlistEntryWithHistory extends WaitlistEntry {
  stage_history: WaitlistStageHistoryEntry[];
  tour_guide_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  trigger_stage: WaitlistStage | null;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TourSlot {
  id: string;
  tenant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_families: number;
  guide_id: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TourSlotWithDetails extends TourSlot {
  booked_count: number;
  guide: Pick<User, "id" | "first_name" | "last_name"> | null;
}

// ============================================================
// Module 14 aliases (no re-declare)
// ============================================================

export type MappingConfidence = CrossMappingConfidence;

export type CurriculumTemplateEnhanced = Pick<
  EnhancedCurriculumTemplate,
  | "framework"
  | "age_range"
  | "country"
  | "state"
  | "version"
  | "is_compliance_framework"
>;

export type CurriculumNodeEnhanced = Pick<
  EnhancedCurriculumNode,
  | "code"
  | "description"
  | "materials"
  | "direct_aims"
  | "indirect_aims"
  | "age_range"
  | "prerequisites"
  | "assessment_criteria"
  | "content_url"
>;

// ============================================================
// Communications - Module 7 Legacy Messaging (Thread-based)
// ============================================================
// WHY separate from Module 12 channels: Module 7 used a
// thread/message/recipient model for 1:1 guide↔parent
// conversations. Module 12 upgraded to persistent channels
// (ChatChannel, ChatMessage). Both coexist during migration.
// ============================================================

export interface MessageThread {
  id: string;
  tenant_id: string;
  subject: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MessageThreadWithPreview extends MessageThread {
  participant_count: number;
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  participants: Array<
    Pick<User, "id" | "first_name" | "last_name" | "avatar_url">
  >;
}

export interface Message {
  id: string;
  tenant_id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MessageWithSender extends Message {
  sender: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

export interface MessageRecipient {
  id: string;
  tenant_id: string;
  thread_id: string;
  user_id: string;
  last_read_at: string | null;
  is_muted: boolean;
  created_at: string;
}

// ============================================================
// Communications - Announcement Compound Types
// ============================================================
// WHY AnnouncementWithAuthor: The feed components need a
// lighter type than AnnouncementWithDetails (no acknowledgement
// stats). This pairs the announcement with just the author info.
// ============================================================

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementScope = "school" | "class" | "program";

export interface AnnouncementWithAuthor {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  scope: AnnouncementScope;
  target_class_id: string | null;
  target_program_id: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  expires_at: string | null;
  attachment_urls: Array<{ name: string; url: string; mime_type: string }>;
  requires_acknowledgement: boolean;
  pin_to_top: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  target_class: Pick<Class, "id" | "name"> | null;
}
