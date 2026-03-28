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

export type PlanTier = "free" | "pro" | "enterprise";

export type SubscriptionStatus =
  | "setup_pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended";

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

// SIS Compliance (Australian government reporting)
export type IndigenousStatus =
  | "aboriginal"
  | "torres_strait_islander"
  | "both"
  | "neither"
  | "not_stated";

export type LanguageBackground = "english_only" | "lbote" | "not_stated";

// ACARA ASC: SES fields (parent education & occupation for ICSEA)
export type ParentEducationLevel =
  | "year_9_or_below"
  | "year_10"
  | "year_11"
  | "year_12"
  | "certificate_i_iv"
  | "diploma"
  | "bachelor"
  | "postgraduate"
  | "not_stated";

export type ParentOccupationGroup =
  | "group_1" // Senior management & qualified professionals
  | "group_2" // Other business managers, arts & sports
  | "group_3" // Tradespeople, clerks, skilled office/sales
  | "group_4" // Machine operators, hospitality, labourers
  | "not_in_paid_work"
  | "not_stated";

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
  /** Australian state/territory for jurisdiction-specific reporting (e.g. ISQ for QLD). */
  state: string | null;
  settings: Record<string, unknown>;
  plan_tier: PlanTier;
  is_active: boolean;
  /** ST4S: explicit opt-in to allow Wattle to access medical/custody/wellbeing data */
  ai_sensitive_data_enabled: boolean;
  /** ST4S: hard kill-switch that overrides ai_sensitive_data_enabled */
  ai_disable_sensitive_tools: boolean;
  // Platform billing (WattleOS → school subscription)
  subscription_status: SubscriptionStatus;
  stripe_platform_customer_id: string | null;
  stripe_platform_subscription_id: string | null;
  trial_ends_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantSetupToken {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  created_at: string;
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
  /** UUIDs of student_sensitive_periods this observation is tagged with. */
  sensitive_period_ids: string[];
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

// ============================================================
// Residential Address (JSONB shape for student addresses)
// ============================================================

export interface ResidentialAddress {
  line1: string;
  line2?: string | null;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

// ============================================================
// Students
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
  // Compliance: captured on enrollment form
  nationality: string | null;
  languages: string[] | null;
  previous_school: string | null;
  // Compliance: ACARA / MySchool reporting
  indigenous_status: IndigenousStatus | null;
  language_background: LanguageBackground | null;
  country_of_birth: string | null;
  home_language: string | null;
  visa_subclass: string | null;
  // Compliance: ACARA ASC - SES fields
  parent_education_level: ParentEducationLevel | null;
  parent_occupation_group: ParentOccupationGroup | null;
  // Compliance: CALD support
  interpreter_required: boolean;
  // Compliance: address
  residential_address: ResidentialAddress | null;
  // Compliance: ISQ reporting
  religion: string | null;
  // Compliance: government identifiers
  crn: string | null;
  usi: string | null;
  medicare_number: string | null;
  // Timestamps
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
  pickup_authorizations: PickupAuthorization[];
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
  user_id: string | null;
  student_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
  pickup_authorized: boolean;
  phone: string | null;
  media_consent: boolean;
  directory_consent: boolean;
}

export interface GuardianWithUser extends Guardian {
  user: Pick<
    User,
    "id" | "email" | "first_name" | "last_name" | "avatar_url"
  > | null;
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
// Sign-In / Sign-Out Kiosk (Late Arrival & Early Departure)
// ============================================================

export type SignInOutType = "late_arrival" | "early_departure";

export type LateArrivalReasonCode =
  | "appointment"
  | "transport"
  | "family_reason"
  | "overslept"
  | "illness_onset"
  | "weather"
  | "other";

export type EarlyDepartureReasonCode =
  | "appointment"
  | "family_emergency"
  | "illness"
  | "family_event"
  | "transport"
  | "bereavement"
  | "other";

export type SignInOutReasonCode =
  | LateArrivalReasonCode
  | EarlyDepartureReasonCode;

export interface SignInOutRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  type: SignInOutType;
  event_date: string; // YYYY-MM-DD
  occurred_at: string; // ISO timestamp
  reason_code: string;
  reason_notes: string | null;
  signed_by_name: string | null;
  signed_by_relationship: string | null;
  acknowledged_by: string | null;
  linked_attendance_id: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SignInOutRecordWithStudent extends SignInOutRecord {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
}

export interface SignInOutDashboardData {
  date: string;
  late_arrivals: SignInOutRecordWithStudent[];
  early_departures: SignInOutRecordWithStudent[];
  total_late: number;
  total_early: number;
}

// ============================================================
// Visitor & Contractor Sign-In Log (Module U)
// ============================================================

export type VisitorType =
  | "parent_guardian"
  | "community_member"
  | "official"
  | "delivery"
  | "volunteer"
  | "other";

export interface VisitorSignInRecord {
  id: string;
  tenant_id: string;
  visitor_name: string;
  visitor_type: VisitorType;
  organisation: string | null;
  purpose: string;
  host_name: string | null;
  badge_number: string | null;
  id_sighted: boolean;
  signed_in_at: string; // ISO timestamp
  signed_out_at: string | null; // null = currently on site
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface ContractorSignInRecord {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  trade: string | null;
  licence_number: string | null;
  insurance_number: string | null;
  insurance_expiry: string | null; // YYYY-MM-DD
  induction_confirmed: boolean;
  wwcc_number: string | null;
  wwcc_verified: boolean;
  work_location: string;
  work_description: string | null;
  signed_in_at: string; // ISO timestamp
  signed_out_at: string | null; // null = currently on site
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface VisitorLogDashboardData {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  visitors_on_site: VisitorSignInRecord[];
  contractors_on_site: ContractorSignInRecord[];
  total_visitors_today: number;
  total_contractors_today: number;
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
// PLG - Report Periods & Instances
// ============================================================

export type ReportPeriodStatus = "draft" | "active" | "closed" | "archived";

export type ReportInstanceStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published";

export interface ReportPeriod {
  id: string;
  tenant_id: string;
  name: string;
  academic_year: number | null;
  term: string | null;
  opens_at: string | null;
  due_at: string | null;
  closes_at: string | null;
  status: ReportPeriodStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReportInstance {
  id: string;
  tenant_id: string;
  template_id: string | null;
  report_period_id: string;
  student_id: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  student_preferred_name: string | null;
  class_name: string | null;
  assigned_guide_id: string | null;
  assigned_guide_name: string | null;
  /** Array of { section_id, content, word_count, last_edited_at } */
  section_responses: ReportInstanceSectionResponse[];
  status: ReportInstanceStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  change_request_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  published_at: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReportInstanceSectionResponse {
  section_id: string;
  content: string;
  word_count: number;
  last_edited_at: string;
}

/** Instance with joined period and template names */
export interface ReportInstanceWithContext extends ReportInstance {
  period_name: string;
  period_due_at: string | null;
  template_name: string | null;
}

/** Aggregated stats for a period dashboard */
export interface ReportPeriodDashboardData {
  period: ReportPeriod;
  total_instances: number;
  by_status: Record<ReportInstanceStatus, number>;
  completion_percent: number;
  guides: {
    guide_id: string;
    guide_name: string;
    total: number;
    submitted: number;
    approved: number;
  }[];
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
// Webhook Dead-Letter Queue
// ============================================================

export type WebhookProvider = "stripe" | "sms" | "google_drive" | "keypay";
export type WebhookEventStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed_permanent";

export interface WebhookEvent {
  id: string;
  tenant_id: string | null;
  provider: WebhookProvider;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  status: WebhookEventStatus;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDashboardStats {
  /** Events currently pending or processing */
  pending: number;
  /** Events successfully processed (last 7 days) */
  succeeded: number;
  /** Events that exhausted all retries */
  deadLetterCount: number;
  /** Success rate as a percentage (0–100) */
  successRate7d: number;
  /** Per-provider breakdown */
  providerStats: Record<
    WebhookProvider,
    {
      total: number;
      succeeded: number;
      failed: number;
    }
  >;
  /** Daily counts for the 7-day success-rate chart */
  dailyBreakdown: Array<{
    date: string; // YYYY-MM-DD
    succeeded: number;
    failed: number;
    total: number;
  }>;
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
// Debt Management (Finance module)
// ============================================================

export type DebtCollectionStage =
  | "overdue"
  | "reminder_1_sent"
  | "reminder_2_sent"
  | "reminder_3_sent"
  | "escalated"
  | "payment_plan"
  | "referred"
  | "written_off"
  | "resolved";

export type DebtPaymentPlanStatus =
  | "draft"
  | "active"
  | "completed"
  | "defaulted"
  | "cancelled";

export type DebtPaymentPlanFrequency = "weekly" | "fortnightly" | "monthly";

export type DebtPlanItemStatus = "pending" | "paid" | "missed" | "waived";

export type DebtReminderType = "auto" | "manual";

export type DebtWriteOffReason =
  | "uncollectable"
  | "hardship"
  | "dispute_resolved"
  | "deceased"
  | "relocated"
  | "statute_barred"
  | "other";

export interface DebtCollectionRecord {
  id: string;
  tenant_id: string;
  invoice_id: string;
  stage: DebtCollectionStage;
  days_overdue_at_creation: number;
  outstanding_cents: number;
  assigned_to_user_id: string | null;
  internal_notes: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtCollectionRecordWithDetails extends DebtCollectionRecord {
  invoice: {
    id: string;
    invoice_number: string;
    total_cents: number;
    amount_paid_cents: number;
    due_date: string;
    status: string;
  } | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  guardian: {
    id: string;
    user?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  } | null;
  latest_reminder: DebtReminderLogEntry | null;
  payment_plan: DebtPaymentPlan | null;
  write_off: DebtWriteOff | null;
  days_overdue: number;
}

export interface DebtPaymentPlan {
  id: string;
  tenant_id: string;
  collection_stage_id: string;
  invoice_id: string;
  total_agreed_cents: number;
  frequency: DebtPaymentPlanFrequency;
  status: DebtPaymentPlanStatus;
  created_by_user_id: string | null;
  guardian_agreed: boolean;
  guardian_agreed_at: string | null;
  terms_notes: string | null;
  first_due_date: string;
  defaulted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtPaymentPlanWithItems extends DebtPaymentPlan {
  items: DebtPaymentPlanItem[];
  total_paid_cents: number;
  total_remaining_cents: number;
  next_due_item: DebtPaymentPlanItem | null;
}

export interface DebtPaymentPlanItem {
  id: string;
  tenant_id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount_cents: number;
  status: DebtPlanItemStatus;
  paid_amount_cents: number;
  paid_at: string | null;
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtReminderSequence {
  id: string;
  tenant_id: string;
  sequence_number: number;
  trigger_days_overdue: number;
  subject_template: string;
  body_template: string;
  send_via_notification: boolean;
  send_via_email: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebtReminderLogEntry {
  id: string;
  tenant_id: string;
  collection_stage_id: string;
  invoice_id: string;
  sequence_number: number | null;
  reminder_type: DebtReminderType;
  sent_by_user_id: string | null;
  subject: string;
  body: string;
  sent_via_notification: boolean;
  sent_via_email: boolean;
  sent_via_sms: boolean;
  opened_at: string | null;
  payment_received_after: boolean;
  sent_at: string;
  created_at: string;
}

export interface DebtWriteOff {
  id: string;
  tenant_id: string;
  collection_stage_id: string;
  invoice_id: string;
  write_off_amount_cents: number;
  reason: DebtWriteOffReason;
  reason_notes: string | null;
  approved_by_user_id: string;
  approved_at: string;
  requested_by_user_id: string | null;
  write_off_reference: string | null;
  created_at: string;
}

// Aggregated data for the debt dashboard
export interface DebtDashboardData {
  total_overdue_cents: number;
  total_overdue_count: number;
  by_stage: {
    stage: DebtCollectionStage;
    count: number;
    total_cents: number;
  }[];
  aging_buckets: {
    bucket: "1_30" | "31_60" | "61_90" | "91_plus";
    count: number;
    total_cents: number;
  }[];
  active_payment_plans: number;
  payment_plans_at_risk: number; // plans with missed installments
  written_off_ytd_cents: number;
  recently_resolved: DebtCollectionRecordWithDetails[];
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

/** Default referral source options for the inquiry form */
export const DEFAULT_REFERRAL_SOURCES = [
  "Friend or family",
  "Google search",
  "Social media",
  "School website",
  "Open day / tour",
  "Local community",
  "Other",
] as const;

/** Toggles for optional built-in inquiry form fields */
export interface InquiryFieldToggles {
  phone: boolean;
  siblings: boolean;
  how_heard: boolean;
  notes: boolean;
  current_school: boolean;
}

/** Per-tenant inquiry form configuration (stored in tenants.settings.inquiry_config) */
export interface InquiryConfig {
  welcome_message: string | null;
  confirmation_message: string | null;
  field_toggles: InquiryFieldToggles;
  custom_fields: CustomField[];
  referral_sources: string[];
}

export const DEFAULT_INQUIRY_CONFIG: InquiryConfig = {
  welcome_message: null,
  confirmation_message: null,
  field_toggles: {
    phone: true,
    siblings: true,
    how_heard: true,
    notes: true,
    current_school: false,
  },
  custom_fields: [],
  referral_sources: [...DEFAULT_REFERRAL_SOURCES],
};

/** Per-tenant tours page configuration (stored in tenants.settings.tours_config) */
export interface ToursConfig {
  welcome_message: string | null;
  custom_questions: CustomField[];
}

export const DEFAULT_TOURS_CONFIG: ToursConfig = {
  welcome_message: null,
  custom_questions: [],
};

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
// ============================================================
// REPLACEMENT: Messaging Domain Types
// ============================================================
// Find and replace the existing MessageThread, MessageThreadWithPreview,
// Message, MessageWithSender, and MessageRecipient types in
// src/types/domain.ts with the versions below.
//
// WHY: The old types were Module 7 (participant-based, no thread_type).
// messaging.ts getInbox() builds objects with thread_type, creator,
// target_class, last_message_sender, and recipient_count - the domain
// types must match or every component consuming them will fail.
// ============================================================

// ============================================================
// Communications - Message Thread Types
// ============================================================

export type MessageThreadType = "class_broadcast" | "direct";

export interface MessageThread {
  id: string;
  tenant_id: string;
  subject: string | null;
  thread_type: MessageThreadType;
  class_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/** Thread enriched with preview data for inbox display */
export interface MessageThreadWithPreview extends MessageThread {
  creator: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  target_class: Pick<Class, "id" | "name"> | null;
  last_message: {
    id: string;
    content: string;
    sent_at: string;
    sender_id: string;
  } | null;
  last_message_sender: Pick<User, "id" | "first_name" | "last_name"> | null;
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
  deleted_at?: string | null;
}

export interface MessageWithSender extends Message {
  sender: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
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

// ============================================================
// Module 15: Staff Management
// ============================================================

export type ComplianceRecordType =
  | "wwcc"
  | "first_aid"
  | "cpr"
  | "anaphylaxis"
  | "asthma_management"
  | "child_protection"
  | "food_safety"
  | "police_check"
  | "qualification"
  | "other";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "casual"
  | "contractor";

export type WorkingRights = "citizen" | "permanent_resident" | "visa_holder";

export type QualificationLevel =
  | "cert3"
  | "diploma"
  | "bachelor"
  | "masters"
  | "ect"
  | "working_towards"
  | "none";

export type StaffStatus = "active" | "invited" | "suspended";

export type PermissionOverrideType = "grant" | "deny";

/** Extended HR profile for a staff member at a specific school. */
export interface StaffProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  // Personal
  date_of_birth: string | null;
  // Contact
  phone: string | null;
  address: string | null;
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  // Employment
  employment_type: EmploymentType | null;
  position_title: string | null;
  start_date: string | null;
  end_date: string | null;
  // Working rights / visa
  working_rights: WorkingRights | null;
  visa_subclass: string | null;
  visa_expiry: string | null;
  work_restrictions: string | null;
  // Qualifications
  qualification_level: QualificationLevel | null;
  qualification_detail: string | null;
  teacher_registration_number: string | null;
  teacher_registration_state: string | null;
  teacher_registration_expiry: string | null;
  acecqa_approval_number: string | null;
  // Internal
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A compliance document tracked for a staff member. */
export interface StaffComplianceRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  record_type: ComplianceRecordType;
  label: string | null;
  document_number: string | null;
  issuing_state: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document_url: string | null;
  notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A per-user permission grant or denial on top of their role. */
export interface PermissionOverride {
  id: string;
  tenant_user_id: string;
  permission_id: string;
  permission_key: string; // resolved from join
  override_type: PermissionOverrideType;
  created_at: string;
}

/**
 * Combined staff member view - TenantUser + User + Role.
 * Returned by listStaff() and getStaffMember().
 */
export interface StaffMember {
  // From tenant_users
  tenant_user_id: string;
  status: StaffStatus;
  joined_at: string; // tenant_users.created_at
  // From users
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  // From roles
  role_id: string;
  role_name: string;
  role_is_system: boolean;
}

/** StaffMember with full profile, compliance, overrides, and role perms. */
export interface StaffMemberDetail extends StaffMember {
  profile: StaffProfile | null;
  compliance_records: StaffComplianceRecord[];
  /** Permission keys from their role (before overrides). */
  role_permission_keys: string[];
  /** Per-user permission grants/denials layered on the role. */
  overrides: PermissionOverride[];
}

/** Role with member count and permission count (used in role list). */
export interface RoleWithCounts extends Role {
  member_count: number;
  permission_count: number;
}

/** Role with full permissions and members list (used in role editor). */
export interface RoleDetail extends Role {
  permission_keys: string[];
  members: Pick<
    StaffMember,
    "user_id" | "first_name" | "last_name" | "email" | "avatar_url"
  >[];
}

// ============================================================
// MODULE A - IITI INCIDENT REGISTER (Reg 87)
// ============================================================

export type IncidentType = "injury" | "illness" | "trauma" | "near_miss";
export type IncidentSeverity = "minor" | "moderate" | "serious";
export type IncidentStatus =
  | "open"
  | "parent_notified"
  | "regulator_notified"
  | "closed";
export type IncidentNotificationMethod =
  | "in_app"
  | "phone"
  | "email"
  | "in_person";

export interface Incident {
  id: string;
  tenant_id: string;
  student_ids: string[];
  occurred_at: string;
  location: string;
  incident_type: IncidentType;
  description: string;
  first_aid_administered: string | null;
  first_aid_by: string | null;
  witness_names: string[];
  severity: IncidentSeverity;
  is_serious_incident: boolean;
  serious_incident_reason: string | null;
  parent_notified_at: string | null;
  parent_notified_by: string | null;
  parent_notification_method: IncidentNotificationMethod | null;
  parent_notification_notes: string | null;
  regulator_notified_at: string | null;
  regulator_notified_by: string | null;
  regulator_notification_ref: string | null;
  regulator_notification_notes: string | null;
  status: IncidentStatus;
  closed_at: string | null;
  closed_by: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IncidentWithStudents extends Incident {
  students: Pick<Student, "id" | "first_name" | "last_name">[];
  recorded_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

// ============================================================
// MODULE B - MEDICATION ADMINISTRATION RECORDS (Reg 93/94)
// ============================================================

export type MedicalPlanType =
  | "ascia_anaphylaxis"
  | "asthma"
  | "diabetes"
  | "seizure"
  | "other";

export interface MedicalManagementPlan {
  id: string;
  tenant_id: string;
  student_id: string;
  plan_type: MedicalPlanType;
  condition_name: string;
  document_url: string | null;
  expiry_date: string | null;
  review_due_date: string | null;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MedicationAuthorisation {
  id: string;
  tenant_id: string;
  student_id: string;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  reason: string | null;
  authorised_by_user_id: string | null;
  authorised_by_name: string;
  authorisation_date: string;
  valid_from: string | null;
  valid_until: string | null;
  storage_instructions: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MedicationAdministration {
  id: string;
  tenant_id: string;
  student_id: string;
  authorisation_id: string | null;
  administered_at: string;
  medication_name: string;
  dose_given: string;
  route: string;
  administrator_id: string;
  witness_id: string | null;
  parent_notified: boolean;
  parent_notified_at: string | null;
  child_response: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationAdministrationWithStaff extends MedicationAdministration {
  administrator: Pick<User, "id" | "first_name" | "last_name">;
  witness: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface MedicalManagementPlanWithStudent extends MedicalManagementPlan {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
}

export interface MedicationAuthorisationWithStudent extends MedicationAuthorisation {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
}

export interface MedicationAdministrationWithDetails extends MedicationAdministration {
  student: Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">;
  administrator: Pick<User, "id" | "first_name" | "last_name">;
  witness: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface StudentMedicationSummary {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  active_plans: number;
  active_authorisations: number;
  expiring_plans: number; // plans expiring within 30 days
  last_administration_at: string | null;
}

// ============================================================
// MODULE C - STAFF QUALIFICATION & COMPLIANCE (Reg 136/145/146)
// ============================================================

export type StaffQualificationLevel =
  | "cert3"
  | "diploma"
  | "ect"
  | "working_towards"
  | "other"
  | "none";
export type StaffCertType =
  | "first_aid"
  | "cpr"
  | "anaphylaxis"
  | "asthma"
  | "child_safety"
  | "mandatory_reporting"
  | "food_safety"
  | "other";
export type ComplianceItemStatus =
  | "valid"
  | "expiring_soon"
  | "expired"
  | "missing";

export interface StaffComplianceProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  wwcc_state: string | null;
  wwcc_number: string | null;
  wwcc_expiry: string | null;
  wwcc_last_verified: string | null;
  wwcc_verified_by: string | null;
  highest_qualification: StaffQualificationLevel | null;
  qualification_detail: string | null;
  acecqa_approval_number: string | null;
  working_towards_rto: string | null;
  working_towards_expected: string | null;
  geccko_module: string | null;
  geccko_completion_date: string | null;
  geccko_record_id: string | null;
  employment_start_date: string | null;
  employment_end_date: string | null;
  position_title: string | null;
  date_of_birth: string | null;
  contact_address: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StaffCertificate {
  id: string;
  tenant_id: string;
  user_id: string;
  cert_type: StaffCertType;
  cert_name: string;
  issue_date: string;
  expiry_date: string | null;
  cert_number: string | null;
  provider: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StaffComplianceSummary {
  user: Pick<User, "id" | "first_name" | "last_name" | "email" | "avatar_url">;
  profile: StaffComplianceProfile | null;
  certificates: StaffCertificate[];
  wwcc_status: ComplianceItemStatus;
  first_aid_status: ComplianceItemStatus;
  cpr_status: ComplianceItemStatus;
  anaphylaxis_status: ComplianceItemStatus;
  asthma_status: ComplianceItemStatus;
  mandatory_reporting_status: ComplianceItemStatus;
  food_safety_status: ComplianceItemStatus;
  geccko_status: "complete" | "missing";
}

// ============================================================
// MODULE D - REAL-TIME RATIO MONITORING (Reg 123)
// ============================================================

export interface FloorSignIn {
  id: string;
  tenant_id: string;
  user_id: string;
  class_id: string | null;
  signed_in_at: string;
  signed_out_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RatioLog {
  id: string;
  tenant_id: string;
  class_id: string;
  logged_at: string;
  children_present: number;
  educators_on_floor: number;
  required_ratio_denominator: number;
  youngest_child_months: number | null;
  is_breached: boolean;
  breach_acknowledged_by: string | null;
  breach_acknowledged_at: string | null;
  created_at: string;
}

export interface LiveRatioState {
  class_id: string;
  class_name: string;
  children_present: number;
  educators_on_floor: number;
  required_ratio_denominator: number;
  is_compliant: boolean;
  educators_on_floor_details: Pick<User, "id" | "first_name" | "last_name">[];
}

// ============================================================
// MODULE E - QIP BUILDER (Reg 55)
// ============================================================

export type QipRating = "working_towards" | "meeting" | "exceeding";
export type QipGoalStatus = "not_started" | "in_progress" | "achieved";
export type QipEvidenceType =
  | "observation"
  | "incident"
  | "policy"
  | "photo"
  | "document"
  | "other";

export interface ServicePhilosophy {
  id: string;
  tenant_id: string;
  content: string;
  version: number;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QipElementAssessment {
  id: string;
  tenant_id: string;
  nqs_element_id: string;
  rating: QipRating | null;
  strengths: string | null;
  assessed_at: string | null;
  assessed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QipGoal {
  id: string;
  tenant_id: string;
  nqs_element_id: string;
  description: string;
  strategies: string | null;
  responsible_person_id: string | null;
  due_date: string | null;
  success_measures: string | null;
  status: QipGoalStatus;
  achieved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QipEvidence {
  id: string;
  tenant_id: string;
  nqs_element_id: string | null;
  qip_goal_id: string | null;
  evidence_type: QipEvidenceType;
  evidence_id: string | null;
  title: string;
  notes: string | null;
  attached_by: string | null;
  created_at: string;
}

// ============================================================
// MODULE F - IMMUNISATION COMPLIANCE
// ============================================================

export type ImmunisationStatus =
  | "up_to_date"
  | "catch_up_schedule"
  | "medical_exemption"
  | "pending";

export interface ImmunisationRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  ihs_date: string | null;
  status: ImmunisationStatus;
  document_url: string | null;
  support_period_start: string | null;
  support_period_end: string | null;
  next_air_check_due: string | null;
  exemption_noted_by: string | null;
  exemption_noted_at: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ImmunisationRecordWithStudent extends ImmunisationRecord {
  student: Pick<Student, "id" | "first_name" | "last_name" | "dob">;
}

export interface ImmunisationDashboardData {
  summary: {
    total_enrolled: number;
    up_to_date: number;
    catch_up_schedule: number;
    medical_exemption: number;
    pending: number;
  };
  overdue_air_checks: ImmunisationRecordWithStudent[];
  non_compliant: ImmunisationRecordWithStudent[];
}

// ============================================================
// MODULE G - CCS SESSION REPORTING
// ============================================================

export type CcsSessionType =
  | "long_day_care"
  | "oshc"
  | "vacation_care"
  | "occasional";
export type CcsReportStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "accepted"
  | "rejected";
export type CcsBundleStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "accepted"
  | "rejected";

export interface CcsAbsenceTypeCode {
  code: string;
  label: string;
  description: string | null;
  annual_cap_applies: boolean;
  requires_evidence: boolean;
}

export interface CcsWeeklyBundle {
  id: string;
  tenant_id: string;
  week_start_date: string;
  week_end_date: string;
  status: CcsBundleStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  acceptance_reference: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CcsSessionReport {
  id: string;
  tenant_id: string;
  bundle_id: string | null;
  student_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  hours_of_care: number;
  session_type: CcsSessionType;
  full_fee_cents: number;
  gap_fee_cents: number;
  absence_flag: boolean;
  absence_type_code: string | null;
  prescribed_discount_cents: number;
  third_party_payment_cents: number;
  report_status: CcsReportStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CcsSessionReportWithStudent extends CcsSessionReport {
  student: Pick<Student, "id" | "first_name" | "last_name" | "crn">;
}

export interface CcsWeeklyBundleWithCounts extends CcsWeeklyBundle {
  report_count: number;
  absence_count: number;
  total_fee_cents: number;
}

export interface CcsAbsenceCapSummary {
  student: Pick<Student, "id" | "first_name" | "last_name" | "crn">;
  financial_year: string;
  capped_days_used: number;
  uncapped_days: number;
  cap_limit: 42;
  is_warning: boolean;
  is_at_cap: boolean;
}

export interface CcsDashboardData {
  current_week_bundle: CcsWeeklyBundleWithCounts | null;
  recent_bundles: CcsWeeklyBundleWithCounts[];
  children_near_cap: CcsAbsenceCapSummary[];
  unbundled_report_count: number;
}

// ============================================================
// MODULE H - EXCURSION MANAGEMENT (Reg 100–102)
// ============================================================

export type ExcursionTransportType =
  | "walking"
  | "private_vehicle"
  | "bus"
  | "public_transport"
  | "other";
export type ExcursionStatus =
  | "planning"
  | "risk_assessed"
  | "consents_pending"
  | "ready_to_depart"
  | "in_progress"
  | "returned"
  | "cancelled";
export type ExcursionConsentStatus = "pending" | "consented" | "declined";
export type ExcursionConsentMethod = "digital_portal" | "paper" | "verbal";

export interface Excursion {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  excursion_date: string;
  destination: string;
  transport_type: ExcursionTransportType;
  departure_time: string | null;
  return_time: string | null;
  supervising_educator_ids: string[];
  attending_student_ids: string[];
  is_regular: boolean;
  regular_review_due: string | null;
  status: ExcursionStatus;
  departed_at: string | null;
  returned_at: string | null;
  return_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExcursionHazard {
  hazard: string;
  likelihood: "low" | "medium" | "high";
  consequence: "low" | "medium" | "high";
  controls: string;
  residual_rating: "low" | "medium" | "high";
}

export interface ExcursionRiskAssessment {
  id: string;
  tenant_id: string;
  excursion_id: string;
  hazards: ExcursionHazard[];
  overall_risk_rating: "low" | "medium" | "high" | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcursionConsent {
  id: string;
  tenant_id: string;
  excursion_id: string;
  student_id: string;
  consent_status: ExcursionConsentStatus;
  consented_by: string | null;
  consented_by_name: string | null;
  consented_at: string | null;
  method: ExcursionConsentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcursionHeadcount {
  id: string;
  tenant_id: string;
  excursion_id: string;
  recorded_at: string;
  recorded_by: string | null;
  student_ids_present: string[];
  count: number;
  location_note: string | null;
  created_at: string;
}

// ============================================================
// MODULE H (extension) - TRANSPORT BOOKING NOTES
// ============================================================

export type TransportPaymentStatus =
  | "not_applicable"
  | "pending"
  | "invoiced"
  | "paid";

export type TransportVehicleType =
  | "bus"
  | "minibus"
  | "coach"
  | "van"
  | "car"
  | "ferry"
  | "other";

export interface ExcursionTransportBooking {
  id: string;
  tenant_id: string;
  excursion_id: string;

  // Company / operator
  company_name: string;
  company_phone: string | null;
  company_email: string | null;
  booking_reference: string | null;

  // Vehicle
  vehicle_type: TransportVehicleType;
  vehicle_registration: string | null;
  passenger_capacity: number | null;

  // Driver
  driver_name: string | null;
  driver_phone: string | null;
  driver_licence_number: string | null;

  // Pickup / drop-off
  pickup_location: string | null;
  pickup_time: string | null; // "HH:MM"
  dropoff_location: string | null;
  dropoff_time: string | null; // "HH:MM"

  // Cost
  total_cost_cents: number | null;
  payment_status: TransportPaymentStatus;
  invoice_number: string | null;

  // Misc
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// MODULE I - COMPLAINTS & POLICY MANAGEMENT (Reg 168/170)
// ============================================================

export type PolicyStatus = "draft" | "active" | "archived";
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "escalated";
export type ComplainantType =
  | "parent"
  | "staff"
  | "anonymous"
  | "regulator"
  | "other";

export interface Policy {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  regulation_reference: string | null;
  content: string | null;
  document_url: string | null;
  version: number;
  effective_date: string | null;
  review_date: string | null;
  status: PolicyStatus;
  requires_parent_notice: boolean;
  notice_sent_at: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PolicyVersion {
  id: string;
  tenant_id: string;
  policy_id: string;
  version: number;
  content: string | null;
  document_url: string | null;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PolicyAcknowledgement {
  id: string;
  tenant_id: string;
  policy_id: string;
  user_id: string;
  version: number;
  acknowledged_at: string;
}

export interface Complaint {
  id: string;
  tenant_id: string;
  received_at: string;
  complainant_type: ComplainantType;
  complainant_name: string | null;
  complainant_contact: string | null;
  subject: string;
  description: string;
  assigned_to: string | null;
  target_resolution_date: string | null;
  status: ComplaintStatus;
  resolution_outcome: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  escalated_to: string | null;
  escalated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ComplaintResponse {
  id: string;
  tenant_id: string;
  complaint_id: string;
  action_taken: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

// ============================================================
// MODULE J - MONTESSORI LESSON TRACKING
// ============================================================

export type MontessoriArea =
  | "practical_life"
  | "sensorial"
  | "language"
  | "mathematics"
  | "cultural";
export type MontessoriAgeLevel = "0_3" | "3_6" | "6_9" | "9_12";
export type LessonStage = "introduction" | "practice" | "mastery";
export type LessonChildResponse =
  | "engaged"
  | "struggled"
  | "not_ready"
  | "mastered"
  | "other";
export type ConcentrationLevel =
  | "deep"
  | "moderate"
  | "distracted"
  | "not_observed";

export interface MontessoriMaterial {
  id: string;
  tenant_id: string | null;
  area: MontessoriArea;
  name: string;
  description: string | null;
  age_level: MontessoriAgeLevel;
  prerequisite_material_id: string | null;
  sequence_order: number;
  is_active: boolean;
  eylf_outcome_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface LessonRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  material_id: string;
  educator_id: string | null;
  presentation_date: string;
  stage: LessonStage;
  child_response: LessonChildResponse | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonRecordWithMaterial extends LessonRecord {
  material: Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">;
  educator: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface LessonWorkCycleInterruption {
  time: string;
  reason: string;
  duration_minutes: number;
}

export interface LessonWorkCycleSession {
  id: string;
  tenant_id: string;
  class_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string | null;
  interruptions: LessonWorkCycleInterruption[];
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkCycleMaterialSelection {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  material_id: string | null;
  material_free_text: string | null;
  concentration_level: ConcentrationLevel | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// MODULE T - THREE-PERIOD LESSONS & SENSITIVE PERIODS
// ============================================================
// Three-Period Lesson (3PL): The foundational Montessori
// instructional technique. Three stages within a guided session:
//   Period 1 - Introduction/Naming  ("This is...")
//   Period 2 - Association/Recognition ("Show me...")
//   Period 3 - Recall/Naming ("What is this?")
// Progression is gated: each period requires the previous one
// to be completed before it can be recorded.
//
// Sensitive Periods: Developmentally-driven windows of heightened
// receptivity identified by Montessori (e.g. language, order,
// movement). Recording them helps educators match materials to
// a child's current readiness.
// ============================================================

export type ThreePeriodStatus = "not_started" | "completed" | "needs_repeat";

export type MontessoriSensitivePeriod =
  | "language"
  | "order"
  | "movement"
  | "small_objects"
  | "music"
  | "social_behavior"
  | "reading"
  | "writing"
  | "mathematics"
  | "refinement_of_senses";

export type SensitivePeriodIntensity =
  | "emerging"
  | "active"
  | "peak"
  | "waning";

export interface ThreePeriodLesson {
  id: string;
  tenant_id: string;
  student_id: string;
  material_id: string;
  educator_id: string | null;
  lesson_date: string;
  period_1_status: ThreePeriodStatus;
  period_1_notes: string | null;
  period_1_completed_at: string | null;
  period_2_status: ThreePeriodStatus;
  period_2_notes: string | null;
  period_2_completed_at: string | null;
  period_3_status: ThreePeriodStatus;
  period_3_notes: string | null;
  period_3_completed_at: string | null;
  session_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreePeriodLessonWithDetails extends ThreePeriodLesson {
  student: Pick<Student, "id" | "first_name" | "last_name">;
  material: Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">;
  educator: Pick<User, "id" | "first_name" | "last_name"> | null;
}

/** Aggregated 3PL progress for one material for one student */
export interface MaterialThreePeriodProgress {
  material_id: string;
  material_name: string;
  area: MontessoriArea;
  age_level: MontessoriAgeLevel;
  lessons: ThreePeriodLessonWithDetails[];
  /** Which period is next (or "complete" if all 3 done) */
  current_period: 1 | 2 | 3 | "complete";
  last_lesson_date: string | null;
}

export interface StudentSensitivePeriod {
  id: string;
  tenant_id: string;
  student_id: string;
  sensitive_period: MontessoriSensitivePeriod;
  intensity: SensitivePeriodIntensity;
  observed_start_date: string | null;
  observed_end_date: string | null;
  suggested_material_ids: string[];
  notes: string | null;
  recorded_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentSensitivePeriodWithDetails extends StudentSensitivePeriod {
  student: Pick<Student, "id" | "first_name" | "last_name">;
  suggested_materials: Pick<MontessoriMaterial, "id" | "name" | "area">[];
  recorded_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

// ============================================================
// Sensitive period ↔ material junction
// ============================================================
export interface SensitivePeriodMaterial {
  id: string;
  tenant_id: string;
  student_sensitive_period_id: string;
  material_id: string;
  introduced_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensitivePeriodMaterialWithDetails extends SensitivePeriodMaterial {
  material: Pick<MontessoriMaterial, "id" | "name" | "area">;
}

/** StudentSensitivePeriodWithDetails enriched with linked materials from the junction table */
export interface StudentSensitivePeriodFull extends StudentSensitivePeriodWithDetails {
  linked_materials: SensitivePeriodMaterialWithDetails[];
  recent_observation_count: number;
}

export interface ThreePeriodDashboardData {
  total_students_with_lessons: number;
  total_lessons: number;
  lessons_this_week: number;
  materials_in_progress: number;
  materials_complete: number;
  by_area: Record<
    MontessoriArea,
    { in_progress: number; complete: number; needs_repeat: number }
  >;
  active_sensitive_periods: number;
}

// ============================================================
// MODULE K - MQ:AP SELF-ASSESSMENT FRAMEWORK
// ============================================================

export type MqapRating = "working_towards" | "meeting" | "exceeding";
export type MqapGoalStatus = "not_started" | "in_progress" | "achieved";

export interface MqapCriterion {
  id: string;
  code: string;
  quality_area: number;
  standard_number: string;
  criterion_number: string;
  criterion_text: string;
  guidance: string | null;
  nqs_element_alignment: string | null;
  sequence_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MqapAssessment {
  id: string;
  tenant_id: string;
  criteria_id: string;
  rating: MqapRating | null;
  strengths: string | null;
  assessed_at: string | null;
  assessed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MqapGoal {
  id: string;
  tenant_id: string;
  criteria_id: string;
  description: string;
  strategies: string | null;
  responsible_person_id: string | null;
  due_date: string | null;
  success_measures: string | null;
  status: MqapGoalStatus;
  achieved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MqapCriterionWithAssessment {
  criterion: MqapCriterion;
  assessment: MqapAssessment | null;
  goals: MqapGoal[];
  nqs_assessment: QipElementAssessment | null;
}

// ============================================================
// MODULE L - EMERGENCY DRILL TRACKING (Reg 97)
// ============================================================

export type DrillType =
  | "fire_evacuation"
  | "lockdown"
  | "shelter_in_place"
  | "medical_emergency"
  | "other";
export type DrillStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type DrillEffectivenessRating = "poor" | "fair" | "good" | "excellent";
export type DrillComplianceStatus = "compliant" | "overdue" | "at_risk";

export interface EmergencyDrill {
  id: string;
  tenant_id: string;
  drill_type: DrillType;
  drill_type_other: string | null;
  scenario_description: string | null;
  status: DrillStatus;
  scheduled_date: string;
  scheduled_time: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  evacuation_time_seconds: number | null;
  assembly_point: string | null;
  location_notes: string | null;
  is_whole_of_service: boolean;
  participating_class_ids: string[];
  staff_participant_ids: string[];
  effectiveness_rating: DrillEffectivenessRating | null;
  issues_observed: string | null;
  corrective_actions: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  follow_up_completed_at: string | null;
  debrief_conducted_by: string | null;
  debrief_notes: string | null;
  notes: string | null;
  initiated_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmergencyDrillParticipant {
  id: string;
  tenant_id: string;
  drill_id: string;
  student_id: string;
  accounted_for: boolean;
  accounted_at: string | null;
  assembly_time_seconds: number | null;
  response_notes: string | null;
  needed_assistance: boolean;
  created_at: string;
}

export interface EmergencyDrillWithDetails extends EmergencyDrill {
  participants: EmergencyDrillParticipant[];
  initiated_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
  debrief_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface DrillParticipantWithStudent extends EmergencyDrillParticipant {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
}

export interface DrillComplianceSummary {
  drill_type: DrillType;
  last_drill_date: string | null;
  days_since_last: number | null;
  is_overdue: boolean;
  is_at_risk: boolean;
  drills_this_year: number;
  average_evacuation_seconds: number | null;
}

export interface EmergencyDrillDashboardData {
  compliance_by_type: DrillComplianceSummary[];
  overall_status: DrillComplianceStatus;
  next_scheduled: EmergencyDrill[];
  recent_drills: EmergencyDrill[];
  total_this_year: number;
  follow_ups_pending: number;
  monthly_counts: Array<{ month: string; count: number }>;
}

// ============================================================
// LIVE EMERGENCY COORDINATION (Module M)
// ============================================================

export type EmergencyEventType = DrillType;
export type EmergencyEventSeverity = "critical" | "high" | "medium";
export type EmergencyEventStatus =
  | "activated"
  | "responding"
  | "all_clear"
  | "resolved"
  | "cancelled";
export type EmergencyZoneType = "indoor" | "outdoor" | "assembly_point";
export type EmergencyZoneStatus =
  | "pending"
  | "evacuating"
  | "clear"
  | "needs_assistance"
  | "blocked";
export type EmergencyAccountabilityMethod =
  | "visual"
  | "roll_call"
  | "parent_collected"
  | "absent_prior";
export type EmergencyStaffRole =
  | "warden"
  | "first_aid"
  | "coordinator"
  | "evacuator"
  | "general";
export type EmergencyStaffStatus =
  | "responding"
  | "at_assembly"
  | "assisting"
  | "off_site";
export type EmergencyEventLogAction =
  | "event_activated"
  | "event_status_changed"
  | "zone_cleared"
  | "zone_needs_assistance"
  | "student_accounted"
  | "staff_accounted"
  | "all_clear_declared"
  | "event_resolved"
  | "event_cancelled"
  | "announcement_sent"
  | "note_added"
  | "warden_assigned"
  | "bulk_students_accounted";

export interface EmergencyZone {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  zone_type: EmergencyZoneType;
  location_details: string | null;
  primary_warden_id: string | null;
  backup_warden_ids: string[];
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmergencyZoneWithWarden extends EmergencyZone {
  primary_warden: Pick<
    User,
    "id" | "first_name" | "last_name" | "avatar_url"
  > | null;
}

export interface EmergencyEvent {
  id: string;
  tenant_id: string;
  event_type: EmergencyEventType;
  event_type_other: string | null;
  severity: EmergencyEventSeverity;
  status: EmergencyEventStatus;
  activated_by: string;
  activated_at: string;
  all_clear_by: string | null;
  all_clear_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  location_description: string | null;
  instructions: string | null;
  assembly_point: string | null;
  notes: string | null;
  linked_drill_id: string | null;
  total_students_expected: number;
  total_staff_expected: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmergencyEventWithActivator extends EmergencyEvent {
  activated_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface EmergencyEventZone {
  id: string;
  tenant_id: string;
  event_id: string;
  zone_id: string;
  warden_id: string | null;
  status: EmergencyZoneStatus;
  reported_at: string | null;
  notes: string | null;
  headcount_reported: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyEventZoneWithDetails extends EmergencyEventZone {
  zone: Pick<
    EmergencyZone,
    "id" | "name" | "zone_type" | "location_details" | "capacity"
  >;
  warden: Pick<User, "id" | "first_name" | "last_name" | "avatar_url"> | null;
}

export interface EmergencyStudentAccountability {
  id: string;
  tenant_id: string;
  event_id: string;
  student_id: string;
  class_id: string | null;
  zone_id: string | null;
  accounted_for: boolean;
  accounted_by: string | null;
  accounted_at: string | null;
  method: EmergencyAccountabilityMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyStudentAccountabilityWithStudent extends EmergencyStudentAccountability {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
}

export interface EmergencyStaffAccountability {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string;
  zone_id: string | null;
  accounted_for: boolean;
  accounted_at: string | null;
  role_during_event: EmergencyStaffRole | null;
  status: EmergencyStaffStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyStaffAccountabilityWithUser extends EmergencyStaffAccountability {
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

export interface EmergencyEventLogEntry {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string | null;
  action: EmergencyEventLogAction;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EmergencyEventLogEntryWithUser extends EmergencyEventLogEntry {
  user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface EmergencyCoordinationLiveData {
  event: EmergencyEventWithActivator;
  zones: EmergencyEventZoneWithDetails[];
  student_accountability: EmergencyStudentAccountabilityWithStudent[];
  staff_accountability: EmergencyStaffAccountabilityWithUser[];
  timeline: EmergencyEventLogEntryWithUser[];
  summary: {
    students_accounted: number;
    students_total: number;
    staff_accounted: number;
    staff_total: number;
    zones_clear: number;
    zones_total: number;
    zones_needing_assistance: number;
  };
}

export interface EmergencyCoordinationConfigData {
  zones: EmergencyZoneWithWarden[];
  recent_events: EmergencyEventWithActivator[];
  active_event: EmergencyEvent | null;
}

export interface EmergencyEventSummary extends EmergencyCoordinationLiveData {
  duration_seconds: number;
  time_to_all_clear_seconds: number | null;
}

// ============================================================
// Staff Rostering & Relief Management (Module N)
// ============================================================

export type ShiftRole =
  | "lead"
  | "co_educator"
  | "general"
  | "float"
  | "admin"
  | "kitchen"
  | "maintenance";

export type RosterWeekStatus = "draft" | "published" | "locked";

export type ShiftStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type LeaveType =
  | "sick_leave"
  | "annual_leave"
  | "unpaid_leave"
  | "long_service_leave"
  | "parental_leave"
  | "compassionate_leave"
  | "professional_development"
  | "other";

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "withdrawn";

export type ShiftSwapStatus =
  | "pending_peer"
  | "peer_accepted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

export type CoverageRequestStatus =
  | "open"
  | "offered"
  | "accepted"
  | "filled"
  | "unfilled"
  | "cancelled";

export type CoverageReason =
  | "sick_call"
  | "approved_leave"
  | "emergency"
  | "no_show"
  | "understaffed"
  | "other";

export type CoverageUrgency = "low" | "normal" | "high" | "critical";

// ── Roster Templates ─────────────────────────────────────────

export interface RosterTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  program_id: string | null;
  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RosterTemplateShift {
  id: string;
  tenant_id: string;
  template_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_minutes: number;
  class_id: string | null;
  shift_role: ShiftRole;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RosterTemplateWithShifts extends RosterTemplate {
  shifts: Array<
    RosterTemplateShift & {
      user_name: string;
      class_name: string | null;
    }
  >;
}

// ── Roster Weeks ─────────────────────────────────────────────

export interface RosterWeek {
  id: string;
  tenant_id: string;
  week_start_date: string;
  template_id: string | null;
  status: RosterWeekStatus;
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RosterWeekWithShifts extends RosterWeek {
  shifts: ShiftWithDetails[];
  total_staff_count: number;
  total_shift_hours: number;
}

// ── Shifts ───────────────────────────────────────────────────

export interface Shift {
  id: string;
  tenant_id: string;
  roster_week_id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  class_id: string | null;
  shift_role: ShiftRole;
  status: ShiftStatus;
  covers_for_user_id: string | null;
  coverage_request_id: string | null;
  expected_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithDetails extends Shift {
  user_name: string;
  user_avatar: string | null;
  class_name: string | null;
  covers_for_name: string | null;
}

// ── Staff Availability ───────────────────────────────────────

export interface StaffAvailability {
  id: string;
  tenant_id: string;
  user_id: string;
  is_recurring: boolean;
  day_of_week: number | null;
  specific_date: string | null;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Leave Requests ───────────────────────────────────────────

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  leave_type: LeaveType;
  leave_type_other: string | null;
  start_date: string;
  end_date: string;
  is_partial_day: boolean;
  partial_start_time: string | null;
  partial_end_time: string | null;
  total_leave_hours: number;
  status: LeaveRequestStatus;
  reason: string | null;
  supporting_document_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestWithUser extends LeaveRequest {
  user_name: string;
  user_avatar: string | null;
  employment_type: EmploymentType | null;
}

// ── Shift Swap Requests ──────────────────────────────────────

export interface ShiftSwapRequest {
  id: string;
  tenant_id: string;
  offered_shift_id: string;
  offered_by: string;
  requested_shift_id: string | null;
  requested_from: string | null;
  status: ShiftSwapStatus;
  peer_responded_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequestWithDetails extends ShiftSwapRequest {
  offered_by_name: string;
  requested_from_name: string | null;
  offered_shift: Pick<
    Shift,
    "date" | "start_time" | "end_time" | "class_id"
  > & {
    class_name: string | null;
  };
  requested_shift:
    | (Pick<Shift, "date" | "start_time" | "end_time" | "class_id"> & {
        class_name: string | null;
      })
    | null;
}

// ── Shift Coverage Requests ──────────────────────────────────

export interface ShiftCoverageRequest {
  id: string;
  tenant_id: string;
  original_shift_id: string;
  original_user_id: string;
  reason: CoverageReason;
  reason_detail: string | null;
  leave_request_id: string | null;
  status: CoverageRequestStatus;
  broadcast_to_all_casuals: boolean;
  offered_to_user_ids: string[];
  accepted_by: string | null;
  accepted_at: string | null;
  replacement_shift_id: string | null;
  created_by: string;
  resolved_by: string | null;
  resolved_at: string | null;
  urgency: CoverageUrgency;
  created_at: string;
  updated_at: string;
}

export interface ShiftCoverageRequestWithDetails extends ShiftCoverageRequest {
  original_user_name: string;
  accepted_by_name: string | null;
  original_shift: Pick<
    Shift,
    "date" | "start_time" | "end_time" | "class_id" | "shift_role"
  > & {
    class_name: string | null;
  };
}

// ── Dashboard Aggregates ─────────────────────────────────────

export interface RosterDashboardData {
  current_week: RosterWeek | null;
  next_week: RosterWeek | null;
  pending_leave_count: number;
  open_coverage_count: number;
  pending_swap_count: number;
  this_week_shift_count: number;
  this_week_total_hours: number;
  staff_on_leave_today: Array<{
    user_id: string;
    user_name: string;
    leave_type: LeaveType;
  }>;
  coverage_gaps: Array<{
    date: string;
    class_name: string;
    shift_role: ShiftRole;
    start_time: string;
    end_time: string;
  }>;
}

export interface MyScheduleData {
  shifts_this_week: ShiftWithDetails[];
  shifts_next_week: ShiftWithDetails[];
  pending_leave_requests: LeaveRequest[];
  pending_swap_requests: ShiftSwapRequestWithDetails[];
  available_coverage_requests: ShiftCoverageRequestWithDetails[];
}

// ============================================================
// MODULE Q - INDIVIDUAL LEARNING PLANS (ILP/IEP)
// ============================================================

export type IlpPlanStatus =
  | "draft"
  | "active"
  | "in_review"
  | "completed"
  | "archived";

export type IlpGoalStatus =
  | "not_started"
  | "in_progress"
  | "achieved"
  | "modified"
  | "discontinued";

export type IlpGoalPriority = "high" | "medium" | "low";

export type IlpDevelopmentalDomain =
  | "communication"
  | "social_emotional"
  | "cognitive"
  | "physical"
  | "self_help"
  | "play"
  | "behaviour"
  | "sensory"
  | "fine_motor"
  | "gross_motor"
  | "literacy"
  | "numeracy"
  | "other";

export type IlpSupportCategory =
  | "speech_language"
  | "occupational_therapy"
  | "physiotherapy"
  | "behavioural"
  | "autism_spectrum"
  | "intellectual"
  | "sensory"
  | "physical"
  | "medical"
  | "gifted"
  | "english_additional_language"
  | "social_emotional"
  | "other";

export type IlpFundingSource =
  | "inclusion_support_programme"
  | "ndis"
  | "state_disability"
  | "school_funded"
  | "none"
  | "other";

export type IlpStrategyType =
  | "environmental"
  | "instructional"
  | "behavioural"
  | "therapeutic"
  | "assistive_technology"
  | "social"
  | "communication"
  | "sensory"
  | "other";

export type IlpCollaboratorRole =
  | "speech_pathologist"
  | "occupational_therapist"
  | "physiotherapist"
  | "psychologist"
  | "behavioural_therapist"
  | "paediatrician"
  | "special_educator"
  | "social_worker"
  | "parent"
  | "guardian"
  | "lead_educator"
  | "coordinator"
  | "other";

export type IlpReviewType =
  | "scheduled"
  | "interim"
  | "transition"
  | "annual"
  | "parent_requested";

export type IlpProgressRating =
  | "significant_progress"
  | "progressing"
  | "minimal_progress"
  | "regression"
  | "maintaining";

export type IlpEvidenceType =
  | "observation"
  | "photo"
  | "document"
  | "assessment_result"
  | "allied_health_report"
  | "work_sample"
  | "video"
  | "other";

export type TransitionStatementStatus =
  | "draft"
  | "in_progress"
  | "ready_for_family"
  | "shared_with_school"
  | "completed";

// ── Base Interfaces ──────────────────────────────────────────

export interface IndividualLearningPlan {
  id: string;
  tenant_id: string;
  student_id: string;
  plan_title: string;
  plan_status: IlpPlanStatus;
  support_categories: IlpSupportCategory[];
  funding_source: IlpFundingSource | null;
  funding_reference: string | null;
  start_date: string;
  review_due_date: string | null;
  next_review_date: string | null;
  end_date: string | null;
  child_strengths: string | null;
  child_interests: string | null;
  background_information: string | null;
  family_goals: string | null;
  parent_consent_given: boolean;
  parent_consent_date: string | null;
  parent_consent_by: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IlpGoal {
  id: string;
  tenant_id: string;
  plan_id: string;
  goal_title: string;
  goal_description: string | null;
  developmental_domain: IlpDevelopmentalDomain;
  eylf_outcome_ids: string[];
  goal_status: IlpGoalStatus;
  priority: IlpGoalPriority;
  target_date: string | null;
  baseline_notes: string | null;
  success_criteria: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IlpStrategy {
  id: string;
  tenant_id: string;
  goal_id: string;
  strategy_description: string;
  strategy_type: IlpStrategyType;
  responsible_role: string | null;
  responsible_user_id: string | null;
  implementation_frequency: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IlpReview {
  id: string;
  tenant_id: string;
  plan_id: string;
  review_type: IlpReviewType;
  review_date: string;
  attendees: string[];
  parent_attended: boolean;
  overall_progress: IlpProgressRating;
  summary_notes: string | null;
  family_feedback: string | null;
  next_steps: string | null;
  goal_updates: Array<{
    goal_id: string;
    progress_rating: IlpProgressRating;
    notes: string;
  }>;
  new_review_due_date: string | null;
  conducted_by: string;
  created_at: string;
  updated_at: string;
}

export interface IlpCollaborator {
  id: string;
  tenant_id: string;
  plan_id: string;
  collaborator_name: string;
  collaborator_role: IlpCollaboratorRole;
  organisation: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IlpEvidence {
  id: string;
  tenant_id: string;
  plan_id: string;
  goal_id: string | null;
  review_id: string | null;
  evidence_type: IlpEvidenceType;
  observation_id: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  attached_by: string;
  attached_at: string;
}

export interface TransitionStatement {
  id: string;
  tenant_id: string;
  student_id: string;
  plan_id: string | null;
  statement_year: number;
  transition_status: TransitionStatementStatus;
  identity_summary: string | null;
  community_summary: string | null;
  wellbeing_summary: string | null;
  learning_summary: string | null;
  communication_summary: string | null;
  strengths_summary: string | null;
  interests_summary: string | null;
  approaches_to_learning: string | null;
  additional_needs_summary: string | null;
  family_input: string | null;
  educator_recommendations: string | null;
  receiving_school_name: string | null;
  receiving_school_contact: string | null;
  shared_with_family_at: string | null;
  shared_with_school_at: string | null;
  family_approved: boolean;
  family_approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Extended / WithDetails Interfaces ────────────────────────

export interface IndividualLearningPlanWithDetails extends IndividualLearningPlan {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url" | "dob"
  >;
  goals: IlpGoalWithStrategies[];
  collaborators: IlpCollaborator[];
  reviews: IlpReview[];
  evidence_count: number;
  created_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface IlpGoalWithStrategies extends IlpGoal {
  strategies: IlpStrategy[];
  evidence_count: number;
}

export interface IndividualLearningPlanListItem extends IndividualLearningPlan {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  goal_count: number;
  goals_achieved: number;
  next_review: string | null;
}

export interface TransitionStatementWithStudent extends TransitionStatement {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url" | "dob"
  >;
  plan: Pick<IndividualLearningPlan, "id" | "plan_title"> | null;
  created_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

// ── Dashboard Aggregate ──────────────────────────────────────

export interface IlpDashboardData {
  summary: {
    total_active_plans: number;
    plans_due_for_review: number;
    plans_overdue_review: number;
    goals_in_progress: number;
    goals_achieved_this_term: number;
    transition_statements_in_progress: number;
  };
  plans_needing_review: IndividualLearningPlanListItem[];
  recently_updated: IndividualLearningPlanListItem[];
  transition_statements: TransitionStatementWithStudent[];
}

// ── Module O: Daily Care Log (Reg 162) ──────────────────────

export type DailyCareLogStatus = "in_progress" | "shared";

export type CareEntryType =
  | "nappy_change"
  | "meal"
  | "bottle"
  | "sleep_start"
  | "sleep_end"
  | "sunscreen"
  | "wellbeing_note";

export type NappyType = "wet" | "soiled" | "dry";

export type MealType =
  | "breakfast"
  | "morning_tea"
  | "lunch"
  | "afternoon_tea"
  | "late_snack";

export type FoodConsumed = "all" | "most" | "some" | "little" | "none";

export type BottleType = "breast_milk" | "formula" | "water" | "other";

export type SleepPosition = "back" | "side" | "front";

export type SleepManner =
  | "self_settled"
  | "patted"
  | "rocked"
  | "held"
  | "fed_to_sleep";

export type WellbeingMood =
  | "happy"
  | "settled"
  | "unsettled"
  | "tired"
  | "unwell";

// ── Base Interfaces ──────────────────────────────────────────

export interface DailyCareLog {
  id: string;
  tenant_id: string;
  student_id: string;
  log_date: string;
  status: DailyCareLogStatus;
  shared_at: string | null;
  shared_by: string | null;
  general_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DailyCareEntry {
  id: string;
  tenant_id: string;
  log_id: string;
  student_id: string;
  entry_type: CareEntryType;
  recorded_at: string;
  recorded_by: string;
  // Nappy
  nappy_type: NappyType | null;
  nappy_cream_applied: boolean | null;
  // Meal
  meal_type: MealType | null;
  food_offered: string | null;
  food_consumed: FoodConsumed | null;
  // Bottle
  bottle_type: BottleType | null;
  bottle_amount_ml: number | null;
  // Sleep
  sleep_position: SleepPosition | null;
  sleep_manner: SleepManner | null;
  // Sunscreen
  sunscreen_spf: number | null;
  sunscreen_reapply_due: string | null;
  // Wellbeing
  wellbeing_mood: WellbeingMood | null;
  wellbeing_temperature: number | null;
  // Notes
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DailyCareSleepCheck {
  id: string;
  tenant_id: string;
  entry_id: string;
  checked_at: string;
  checked_by: string;
  position: SleepPosition;
  breathing_normal: boolean;
  skin_colour_normal: boolean;
  notes: string | null;
}

// ── Extended Interfaces ──────────────────────────────────────

export interface DailyCareEntryWithRecorder extends DailyCareEntry {
  recorder: Pick<User, "id" | "first_name" | "last_name"> | null;
  sleep_checks?: DailyCareSleepCheck[];
}

export interface DailyCareLogWithEntries extends DailyCareLog {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url" | "dob"
  >;
  entries: DailyCareEntryWithRecorder[];
  created_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface DailyCareLogListItem extends DailyCareLog {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  entry_count: number;
  last_entry_at: string | null;
}

export interface ActiveSleeper {
  entry: DailyCareEntry;
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url" | "dob"
  >;
  sleep_start: string;
  last_check_at: string | null;
  check_count: number;
}

export interface SunscreenReminder {
  entry: DailyCareEntry;
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  reapply_due: string;
  minutes_overdue: number;
}

// ── Dashboard Aggregate ──────────────────────────────────────

export interface DailyCareDashboardData {
  summary: {
    total_children_logged: number;
    total_eligible_children: number;
    total_entries_today: number;
    nappy_changes: number;
    meals: number;
    bottles: number;
    sleeps: number;
    sunscreen_applications: number;
    wellbeing_notes: number;
    logs_shared: number;
    logs_pending: number;
  };
  logs_today: DailyCareLogListItem[];
  active_sleepers: ActiveSleeper[];
  sunscreen_reapply_due: SunscreenReminder[];
}

// ── Field Config (per-room care entry customization) ─────────

export type CareFieldColorTag =
  | "health"
  | "nutrition"
  | "behavior"
  | "hygiene"
  | "sleep"
  | "general";

export interface DailyCareLogFieldConfig {
  id: string;
  tenant_id: string;
  class_id: string;
  field_type: CareEntryType;
  is_enabled: boolean;
  is_required: boolean;
  display_order: number;
  field_label: string | null;
  field_description: string | null;
  color_tag: CareFieldColorTag | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================
// School Photos & ID Cards (Module R)
// ============================================================

export type PhotoSessionStatus = "open" | "closed" | "archived";
export type PhotoPersonType = "student" | "staff" | "both";

export interface PhotoSession {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  session_date: string;
  person_type: PhotoPersonType;
  status: PhotoSessionStatus;
  total_photos: number;
  matched_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PhotoCropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PersonPhoto {
  id: string;
  tenant_id: string;
  session_id: string | null;
  person_type: "student" | "staff";
  person_id: string | null;
  storage_path: string;
  photo_url: string;
  original_filename: string | null;
  is_current: boolean;
  crop_data: PhotoCropData | null;
  file_size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PhotoSessionWithDetails extends PhotoSession {
  created_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
  photos_by_status: {
    matched: number;
    unmatched: number;
    total: number;
  };
}

export interface PersonPhotoWithPerson extends PersonPhoto {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  > | null;
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url"> | null;
}

export interface PhotoMatchCandidate {
  file_name: string;
  preview_url: string;
  photo_id: string;
  suggested_person_id: string | null;
  suggested_person_name: string | null;
  confidence: "high" | "medium" | "low" | "none";
  person_type: "student" | "staff";
}

export interface PhotoCoverageStats {
  total: number;
  with_photo: number;
  without_photo: number;
  percentage: number;
}

export interface PhotoDashboardData {
  sessions: PhotoSessionWithDetails[];
  student_coverage: PhotoCoverageStats;
  staff_coverage: PhotoCoverageStats;
  recent_uploads: PersonPhotoWithPerson[];
}

// ── ID Card Templates ────────────────────────────────────────

export interface IdCardTemplateConfig {
  show_logo: boolean;
  show_class: boolean;
  show_year: boolean;
  show_qr_code: boolean;
  show_barcode: boolean;
  card_orientation: "portrait" | "landscape";
  primary_color: string;
  secondary_color: string;
  font_size_name: number;
  font_size_class: number;
}

export interface IdCardTemplate {
  id: string;
  tenant_id: string;
  name: string;
  person_type: "student" | "staff";
  template_config: IdCardTemplateConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IdCardPersonData {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  photo_url: string | null;
  class_name: string | null;
  position: string | null;
  person_type: "student" | "staff";
}

// ============================================================
// NCCD Disability Register
// ============================================================
// Nationally Consistent Collection of Data on School Students
// with Disability - annual federal reporting obligation.
//
// Official levels and categories aligned to DSS 2024 NCCD
// guidelines and the NCCD data portal taxonomy.
// ============================================================

export type NccdDisabilityCategory =
  | "physical"
  | "cognitive"
  | "sensory_hearing"
  | "sensory_vision"
  | "social_emotional";

export type NccdAdjustmentLevel =
  | "qdtp"
  | "supplementary"
  | "substantial"
  | "extensive";

export type NccdAdjustmentType =
  | "curriculum"
  | "environment"
  | "instruction"
  | "assessment";

export type NccdFundingSource =
  | "inclusion_support_programme"
  | "ndis"
  | "state_disability"
  | "school_funded"
  | "none"
  | "other";

export type NccdStatus = "active" | "under_review" | "exited" | "archived";

export type NccdEvidenceType =
  | "professional_report"
  | "school_assessment"
  | "classroom_observation"
  | "parent_report"
  | "medical_certificate"
  | "ndis_plan"
  | "naplan_results"
  | "work_sample"
  | "other";

// ── Core Entities ─────────────────────────────────────────────

export interface NccdRegisterEntry {
  id: string;
  tenant_id: string;
  student_id: string;
  collection_year: number;

  disability_category: NccdDisabilityCategory;
  disability_subcategory: string | null;

  adjustment_level: NccdAdjustmentLevel;
  adjustment_types: NccdAdjustmentType[];

  funding_source: NccdFundingSource | null;
  funding_reference: string | null;
  funding_amount: number | null;

  professional_opinion: boolean;
  professional_name: string | null;
  professional_title: string | null;
  professional_date: string | null;

  parental_consent_given: boolean;
  parental_consent_date: string | null;
  parental_consent_by: string | null;

  ilp_id: string | null;

  status: NccdStatus;
  notes: string | null;
  review_due_date: string | null;

  submitted_to_collection: boolean;
  collection_submitted_at: string | null;
  collection_submitted_by: string | null;

  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NccdEvidenceItem {
  id: string;
  tenant_id: string;
  entry_id: string;
  student_id: string;

  evidence_type: NccdEvidenceType;
  description: string;

  observation_id: string | null;
  ilp_evidence_id: string | null;
  document_url: string | null;
  document_name: string | null;

  evidence_date: string | null;

  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

// ── Extended / Joined Interfaces ──────────────────────────────

export interface NccdEntryWithStudent extends NccdRegisterEntry {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url" | "dob"
  >;
  evidence_count: number;
}

export interface NccdEntryWithDetails extends NccdRegisterEntry {
  student: Pick<
    Student,
    | "id"
    | "first_name"
    | "last_name"
    | "preferred_name"
    | "photo_url"
    | "dob"
    | "enrollment_status"
  >;
  evidence: NccdEvidenceItem[];
  ilp: {
    id: string;
    status: string;
    plan_name: string;
  } | null;
  consented_by_user: Pick<User, "id" | "first_name" | "last_name"> | null;
}

export interface NccdEvidenceItemWithLinks extends NccdEvidenceItem {
  observation: {
    id: string;
    summary: string | null;
    created_at: string;
  } | null;
}

// ── Dashboard Aggregate ───────────────────────────────────────

export interface NccdCollectionSummary {
  year: number;
  total_students: number;
  submitted: number;
  pending_submission: number;
  by_level: Record<NccdAdjustmentLevel, number>;
  by_category: Record<NccdDisabilityCategory, number>;
}

export interface NccdDashboardData {
  current_year: number;
  collection_summary: NccdCollectionSummary;
  prior_year_summary: NccdCollectionSummary | null;
  entries_requiring_review: NccdEntryWithStudent[];
  entries_missing_consent: NccdEntryWithStudent[];
  entries_missing_professional_opinion: NccdEntryWithStudent[];
  recent_entries: NccdEntryWithStudent[];
}

// ============================================================
// Wellbeing & Pastoral Care (Module P)
// ============================================================

export type WellbeingFlagSeverity = "low" | "medium" | "high" | "critical";
export type WellbeingFlagStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "archived";
export type ReferralType = "internal" | "external";
export type ReferralStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "closed"
  | "declined";
export type ReferralSpecialty =
  | "speech_pathology"
  | "occupational_therapy"
  | "psychology"
  | "social_work"
  | "physiotherapy"
  | "paediatrics"
  | "counselling"
  | "other";
export type CounsellorNoteType =
  | "initial_assessment"
  | "follow_up"
  | "crisis_intervention"
  | "parent_consultation"
  | "external_liaison"
  | "closure";
export type CheckInStatus =
  | "scheduled"
  | "completed"
  | "rescheduled"
  | "no_show";
export type PastoralCategory =
  | "behaviour"
  | "emotional"
  | "social"
  | "family"
  | "health"
  | "academic"
  | "other";

export interface WellbeingFlag {
  id: string;
  tenant_id: string;
  student_id: string;
  created_by: string;
  severity: WellbeingFlagSeverity;
  status: WellbeingFlagStatus;
  category: PastoralCategory;
  summary: string;
  context: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  resolved_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WellbeingFlagWithStudent extends WellbeingFlag {
  students: Student;
  created_by_user: Pick<User, "id" | "first_name" | "last_name" | "email">;
  assigned_to_user: Pick<
    User,
    "id" | "first_name" | "last_name" | "email"
  > | null;
}

export interface StudentReferral {
  id: string;
  tenant_id: string;
  student_id: string;
  created_by: string;
  referral_type: ReferralType;
  specialty: ReferralSpecialty;
  status: ReferralStatus;
  referred_to_name: string | null;
  referred_to_organisation: string | null;
  referral_reason: string;
  notes: string | null;
  follow_up_date: string | null;
  accepted_at: string | null;
  closed_at: string | null;
  outcome_notes: string | null;
  linked_flag_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentReferralWithStudent extends StudentReferral {
  students: Student;
  created_by_user: Pick<User, "id" | "first_name" | "last_name" | "email">;
}

export interface CounsellorCaseNote {
  id: string;
  tenant_id: string;
  student_id: string;
  author_id: string;
  note_type: CounsellorNoteType;
  content: string;
  session_date: string;
  duration_minutes: number | null;
  linked_flag_id: string | null;
  linked_referral_id: string | null;
  is_confidential: boolean;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CounsellorCaseNoteWithStudent extends CounsellorCaseNote {
  students: Student;
  author: Pick<User, "id" | "first_name" | "last_name" | "email">;
}

export interface WellbeingCheckIn {
  id: string;
  tenant_id: string;
  student_id: string;
  conducted_by: string;
  status: CheckInStatus;
  scheduled_for: string;
  completed_at: string | null;
  mood_rating: number | null;
  wellbeing_areas: string[] | null;
  observations: string | null;
  student_goals: string | null;
  action_items: string | null;
  follow_up_date: string | null;
  linked_flag_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WellbeingCheckInWithStudent extends WellbeingCheckIn {
  students: Student;
  conducted_by_user: Pick<User, "id" | "first_name" | "last_name" | "email">;
}

export interface PastoralCareRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  recorded_by: string;
  category: PastoralCategory;
  title: string;
  description: string;
  date_of_concern: string;
  parent_contacted: boolean;
  parent_contacted_at: string | null;
  parent_contact_notes: string | null;
  action_taken: string | null;
  linked_flag_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PastoralCareRecordWithStudent extends PastoralCareRecord {
  students: Student;
  recorded_by_user: Pick<User, "id" | "first_name" | "last_name" | "email">;
}

export interface WellbeingDashboardData {
  open_flags: number;
  critical_flags: WellbeingFlagWithStudent[];
  active_referrals: StudentReferralWithStudent[];
  upcoming_check_ins: WellbeingCheckInWithStudent[];
  recent_pastoral_records: PastoralCareRecordWithStudent[];
  flags_by_severity: Record<WellbeingFlagSeverity, number>;
  flags_by_category: Record<PastoralCategory, number>;
  students_with_open_flags: number;
}

// ============================================================
// Module S: Sick Bay Visits Log
// ============================================================

export type SickBayVisitType =
  | "injury"
  | "illness"
  | "medication_given"
  | "first_aid"
  | "other";

export type SickBayVisitStatus = "open" | "resolved" | "referred";

export interface SickBayVisit {
  id: string;
  tenant_id: string;
  student_id: string;
  visit_type: SickBayVisitType;
  status: SickBayVisitStatus;
  visit_date: string;
  arrived_at: string | null;
  departed_at: string | null;
  presenting_complaint: string | null;
  treatment_given: string | null;
  outcome: string | null;
  notes: string | null;
  parent_notified: boolean;
  parent_notified_at: string | null;
  ambulance_called: boolean;
  recorded_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SickBayVisitWithStudent extends SickBayVisit {
  student: Pick<Student, "id" | "first_name" | "last_name" | "dob">;
  recorder: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface SickBayDashboardData {
  summary: {
    total_today: number;
    open: number;
    resolved: number;
    referred: number;
  };
  visits_today: SickBayVisitWithStudent[];
  open_visits: SickBayVisitWithStudent[];
}

// ============================================================
// Dismissal & Pickup Module (Module V)
// ============================================================

export type DismissalMethod =
  | "parent_pickup"
  | "bus"
  | "oshc"
  | "walker"
  | "other";

export type DismissalStatus = "pending" | "confirmed" | "exception";

export type DismissalExceptionReason =
  | "not_collected"
  | "unknown_person"
  | "late_pickup"
  | "refused_collection"
  | "bus_no_show"
  | "other";

export type DayOfWeek =
  | "default"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

// ── Bus Routes ──────────────────────────────────────────────

export interface BusRoute {
  id: string;
  tenant_id: string;
  route_name: string;
  operator_name: string | null;
  vehicle_registration: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  depart_time: string | null; // HH:MM:SS
  days_of_operation: string[];
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Pickup Authorizations ────────────────────────────────────

export interface PickupAuthorization {
  id: string;
  tenant_id: string;
  student_id: string;
  authorized_name: string;
  relationship: string | null;
  phone: string | null;
  photo_url: string | null;
  id_verified: boolean;
  is_permanent: boolean;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Student Dismissal Method Preferences ──────────────────────

export interface StudentDismissalMethod {
  id: string;
  tenant_id: string;
  student_id: string;
  day_of_week: DayOfWeek;
  dismissal_method: DismissalMethod;
  bus_route_id: string | null;
  notes: string | null;
  updated_at: string;
}

export interface StudentDismissalMethodWithRoute extends StudentDismissalMethod {
  bus_route: Pick<BusRoute, "id" | "route_name" | "depart_time"> | null;
}

// ── Daily Dismissal Records ──────────────────────────────────

export interface DismissalRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  dismissal_date: string; // YYYY-MM-DD
  expected_method: DismissalMethod | null;
  actual_method: DismissalMethod | null;
  status: DismissalStatus;
  bus_route_id: string | null;
  authorization_id: string | null;
  collected_by_name: string | null;
  exception_reason: DismissalExceptionReason | null;
  exception_notes: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DismissalRecordWithStudent extends DismissalRecord {
  student: Pick<Student, "id" | "first_name" | "last_name" | "dob">;
  confirmer: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  bus_route: Pick<BusRoute, "id" | "route_name"> | null;
  pickup_authorization: Pick<
    PickupAuthorization,
    "id" | "authorized_name" | "relationship"
  > | null;
}

// ── Aggregated Dashboard Data ────────────────────────────────

export interface DismissalDashboardData {
  date: string;
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    exceptions: number;
  };
  records: DismissalRecordWithStudent[];
  bus_routes: BusRoute[];
}

export interface StudentDismissalSetup {
  student: Pick<Student, "id" | "first_name" | "last_name">;
  methods: StudentDismissalMethodWithRoute[];
  authorizations: PickupAuthorization[];
}

// ============================================================
// Chronic Absence Monitoring
// ============================================================

export type ChronicAbsenceStatus = "good" | "at_risk" | "chronic" | "severe";

export type AbsenceFlagStatus = "active" | "resolved" | "dismissed";
export type AbsenceFlagSource = "manual" | "auto";

export type FollowUpMethod =
  | "phone_call"
  | "sms"
  | "email"
  | "in_person"
  | "letter"
  | "welfare_check"
  | "referral"
  | "other";

export type FollowUpOutcome =
  | "contacted"
  | "no_answer"
  | "message_left"
  | "referred"
  | "resolved"
  | "escalated"
  | "other";

export interface AbsenceMonitoringConfig {
  id: string;
  tenant_id: string;
  at_risk_threshold: number; // e.g. 85 → below 85% is at-risk
  chronic_threshold: number; // e.g. 80 → below 80% is chronic
  severe_threshold: number; // e.g. 70 → below 70% is severe
  rolling_window_days: number; // e.g. 90 (calendar days)
  count_late_as_absent: boolean;
  count_half_day_as_absent: boolean;
  auto_flag_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbsenceMonitoringFlag {
  id: string;
  tenant_id: string;
  student_id: string;
  status: AbsenceFlagStatus;
  source: AbsenceFlagSource;
  rate_at_flag: number | null;
  notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AbsenceFollowUpLog {
  id: string;
  tenant_id: string;
  flag_id: string;
  student_id: string;
  contact_date: string;
  method: FollowUpMethod;
  outcome: FollowUpOutcome;
  contact_name: string | null;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
  created_by: string | null;
}

// ── Compound types for UI ────────────────────────────────────

export interface StudentAbsenceSummary {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  total_days: number; // School days in the window
  absent_days: number; // Counted as absent (per config)
  attendance_rate: number; // 0–100, rounded to 1dp
  absence_status: ChronicAbsenceStatus;
  active_flag: AbsenceMonitoringFlag | null;
  last_follow_up_date: string | null;
  follow_up_count: number;
}

export interface ChronicAbsenceDashboardData {
  config: AbsenceMonitoringConfig;
  summary: {
    total_students: number;
    good: number;
    at_risk: number;
    chronic: number;
    severe: number;
    active_flags: number;
  };
  at_risk_students: StudentAbsenceSummary[]; // at_risk + chronic + severe
}

export interface AbsenceWeeklyTrend {
  week_start: string; // ISO date of Monday
  total_days: number;
  absent_days: number;
  rate: number; // 0–100
}

export interface StudentAbsenceDetail {
  summary: StudentAbsenceSummary;
  weekly_trend: AbsenceWeeklyTrend[];
  active_flag: AbsenceMonitoringFlag | null;
  flag_history: AbsenceMonitoringFlag[];
  follow_up_log: AbsenceFollowUpLog[];
}

// ============================================================
// Parent-Teacher Interview Scheduling (Module W)
// ============================================================

export type InterviewSessionStatus = "draft" | "open" | "closed" | "archived";

export type InterviewBookingStatus =
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed";

// ── Core Entities ────────────────────────────────────────────

export interface InterviewSession {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  session_start_date: string; // YYYY-MM-DD
  session_end_date: string; // YYYY-MM-DD
  booking_open_at: string | null; // ISO timestamp
  booking_close_at: string | null; // ISO timestamp
  slot_duration_mins: number;
  allow_cancellation: boolean;
  cancellation_cutoff_hours: number;
  notes: string | null;
  status: InterviewSessionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface InterviewSlot {
  id: string;
  tenant_id: string;
  session_id: string;
  staff_user_id: string;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  location: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewBooking {
  id: string;
  tenant_id: string;
  session_id: string;
  slot_id: string;
  student_id: string;
  booked_by: string;
  guardian_name: string;
  guardian_email: string | null;
  guardian_phone: string | null;
  status: InterviewBookingStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  outcome_notes: string | null;
  outcome_recorded_at: string | null;
  outcome_recorded_by: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Enriched / Joined Views ──────────────────────────────────

export interface InterviewSlotWithBooking extends InterviewSlot {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
  };
  booking:
    | (InterviewBooking & {
        student: Pick<Student, "id" | "first_name" | "last_name">;
      })
    | null;
}

export interface InterviewSessionWithCounts extends InterviewSession {
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  confirmed_bookings: number;
  completed_bookings: number;
}

// ── Staff Schedule View ───────────────────────────────────────
// What a staff member sees: their slots for a given session/date

export interface StaffInterviewDay {
  date: string;
  slots: InterviewSlotWithBooking[];
}

export interface StaffInterviewSchedule {
  session: InterviewSession;
  days: StaffInterviewDay[];
  total_bookings: number;
  outcomes_pending: number;
}

// ── Parent/Family Booking View ───────────────────────────────

export interface AvailableSlotForBooking {
  slot: InterviewSlot;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
  };
  is_available: boolean; // false if booked or blocked
}

export interface FamilyInterviewView {
  session: InterviewSession;
  students: Array<{
    student: Pick<Student, "id" | "first_name" | "last_name">;
    existing_booking:
      | (InterviewBooking & {
          slot: InterviewSlot;
          staff: { id: string; first_name: string; last_name: string };
        })
      | null;
  }>;
}

// ── Admin Dashboard ──────────────────────────────────────────

export interface InterviewSessionDashboard {
  session: InterviewSessionWithCounts;
  by_staff: Array<{
    staff: { id: string; first_name: string; last_name: string };
    total_slots: number;
    booked: number;
    available: number;
    blocked: number;
  }>;
  bookings: Array<
    InterviewBooking & {
      student: Pick<Student, "id" | "first_name" | "last_name">;
      slot: InterviewSlot;
      staff: { id: string; first_name: string; last_name: string };
    }
  >;
}

// ============================================================
// Volunteer Coordination (Module Y)
// ============================================================

export type VolunteerStatus = "active" | "inactive" | "suspended";

// Computed from wwcc_expiry_date - never stored in DB.
// missing: no WWCC number or no expiry recorded
// expired: expiry date is in the past
// expiring_soon: expires within the next 30 days
// current: valid for 30+ days
export type VolunteerWwccStatus =
  | "current"
  | "expiring_soon"
  | "expired"
  | "missing";

export type VolunteerAssignmentStatus =
  | "invited"
  | "confirmed"
  | "declined"
  | "attended"
  | "no_show";

export interface Volunteer {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  wwcc_number: string | null;
  wwcc_expiry_date: string | null; // ISO date string
  wwcc_state: string | null; // 2–3-letter state code e.g. 'VIC'
  status: VolunteerStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VolunteerWithWwccStatus extends Volunteer {
  wwcc_status: VolunteerWwccStatus;
  days_until_expiry: number | null; // null if no expiry date
}

export interface VolunteerAssignment {
  id: string;
  tenant_id: string;
  volunteer_id: string;
  excursion_id: string | null;
  event_name: string;
  event_date: string; // ISO date string
  role: string;
  status: VolunteerAssignmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface VolunteerAssignmentWithDetails extends VolunteerAssignment {
  volunteer: VolunteerWithWwccStatus;
}

export interface VolunteerDashboardData {
  total_active: number;
  wwcc_expiring_count: number; // expiring within 30 days
  wwcc_expired_count: number;
  upcoming_assignments_count: number; // future events
  expiry_alerts: VolunteerWithWwccStatus[]; // expired + expiring_soon
  upcoming_assignments: VolunteerAssignmentWithDetails[];
}

// ============================================================
// MODULE Z - MATERIAL / SHELF INVENTORY (Montessori)
// ============================================================
// Tracks the physical Montessori materials in each prepared
// environment: condition, shelf location, status, and the
// student introduction history derived from lesson_records.
// ============================================================

export type MaterialCondition =
  | "excellent" // pristine, no wear
  | "good" // minor wear, fully functional
  | "fair" // visible wear but still usable
  | "damaged"; // missing pieces or non-functional

export type MaterialInventoryStatus =
  | "available" // on shelf, ready to use
  | "in_use" // currently taken out by a student
  | "being_repaired" // with maintenance, temporarily unavailable
  | "on_order" // ordered but not yet received
  | "retired"; // permanently removed from service

export interface MaterialShelfLocation {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  room_type: MontessoriArea | "other" | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MaterialInventoryItem {
  id: string;
  tenant_id: string;
  material_id: string;
  location_id: string | null;
  condition: MaterialCondition;
  status: MaterialInventoryStatus;
  quantity: number;
  shelf_position: string | null;
  date_acquired: string | null;
  last_inspected_at: string | null;
  serial_number: string | null;
  photo_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MaterialInventoryItemWithDetails extends MaterialInventoryItem {
  material: Pick<
    MontessoriMaterial,
    "id" | "name" | "area" | "age_level" | "sequence_order"
  >;
  location: Pick<MaterialShelfLocation, "id" | "name" | "room_type"> | null;
}

/** A student's introduction history for a specific material (derived from lesson_records) */
export interface MaterialStudentIntroduction {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  first_introduced_date: string; // earliest lesson_record.presentation_date
  latest_stage: LessonStage; // highest stage reached
  latest_stage_date: string; // date of that stage
  total_lesson_count: number;
}

export interface MaterialInventoryDashboardData {
  total_items: number;
  available_count: number;
  in_use_count: number;
  being_repaired_count: number;
  on_order_count: number;
  retired_count: number;
  needs_attention_count: number; // fair or damaged condition (non-retired)
  inspection_overdue_count: number; // last_inspected_at > 90 days or null
  by_area: Record<
    MontessoriArea,
    { total: number; available: number; needs_attention: number }
  >;
  needs_attention_items: MaterialInventoryItemWithDetails[];
  inspection_overdue_items: MaterialInventoryItemWithDetails[];
}

// ============================================================
// NAPLAN Coordination
// ============================================================

export type NaplanWindowStatus = "draft" | "active" | "closed";

export type NaplanDomain =
  | "reading"
  | "writing"
  | "spelling"
  | "language_conventions"
  | "numeracy";

export type NaplanProficiencyLevel =
  | "needs_additional_support"
  | "developing"
  | "strong"
  | "exceeding";

export type NaplanYearLevel = 3 | 5 | 7 | 9;

export interface NaplanTestWindow {
  id: string;
  tenant_id: string;
  collection_year: number;
  status: NaplanWindowStatus;
  test_start_date: string | null;
  test_end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NaplanTestWindowWithCounts extends NaplanTestWindow {
  cohort_count: number;
  opted_out_count: number;
  results_entered_count: number;
  results_total_possible: number;
}

export interface NaplanCohortEntry {
  id: string;
  tenant_id: string;
  window_id: string;
  student_id: string;
  year_level: NaplanYearLevel;
  is_opted_out: boolean;
  opt_out_reason: string | null;
  opt_out_recorded_by: string | null;
  opt_out_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NaplanCohortEntryWithStudent extends NaplanCohortEntry {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    year_level: number | null;
    photo_url: string | null;
  };
  results: NaplanDomainResult[];
  results_count: number;
}

export interface NaplanDomainResult {
  id: string;
  tenant_id: string;
  cohort_entry_id: string;
  domain: NaplanDomain;
  proficiency_level: NaplanProficiencyLevel;
  scaled_score: number | null;
  national_average_score: number | null;
  state_average_score: number | null;
  above_national_minimum: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface NaplanStudentRecord {
  cohort_entry: NaplanCohortEntryWithStudent;
  results_by_domain: Partial<Record<NaplanDomain, NaplanDomainResult>>;
  completion_count: number;
  below_nms_domains: NaplanDomain[];
}

export interface NaplanWindowSummary {
  window: NaplanTestWindowWithCounts;
  by_year_level: Record<
    NaplanYearLevel,
    { cohort: number; opted_out: number; results_entered: number }
  >;
  below_nms_count: number;
}

export interface NaplanDashboardData {
  windows: NaplanTestWindowWithCounts[];
  active_window: NaplanTestWindow | null;
  total_students_this_year: number;
  total_opted_out_this_year: number;
  results_completion_pct: number;
}

// ============================================================
// Normalization Indicators (Montessori)
// ============================================================

export type NormalizationIndicator =
  | "concentration"
  | "independence"
  | "order"
  | "coordination"
  | "social_harmony";

export type WorkCycleEngagement =
  | "deep"
  | "moderate"
  | "surface"
  | "disengaged";

export type SelfDirectionLevel =
  | "fully_self_directed"
  | "minimal_guidance"
  | "frequent_guidance"
  | "constant_support";

export type NormalizationGoalStatus =
  | "active"
  | "achieved"
  | "deferred"
  | "archived";

// ── Core observation entity ──────────────────────────────

export interface NormalizationObservation {
  id: string;
  tenant_id: string;
  student_id: string;
  observer_id: string;
  observation_date: string;

  concentration_rating: number;
  concentration_duration_minutes: number | null;
  concentration_notes: string | null;

  independence_rating: number;
  independence_notes: string | null;

  order_rating: number;
  order_notes: string | null;

  coordination_rating: number;
  coordination_notes: string | null;

  social_harmony_rating: number;
  social_harmony_notes: string | null;

  work_cycle_engagement: WorkCycleEngagement;
  self_direction: SelfDirectionLevel;
  joyful_engagement: boolean;
  overall_notes: string | null;
  class_id: string | null;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Observation with resolved relations ──────────────────

export interface NormalizationObservationWithDetails extends NormalizationObservation {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    photo_url: string | null;
  };
  observer: {
    id: string;
    first_name: string;
    last_name: string;
  };
  class_name: string | null;
  avg_rating: number;
}

// ── Goal entity ──────────────────────────────────────────

export interface NormalizationGoal {
  id: string;
  tenant_id: string;
  student_id: string;
  indicator: NormalizationIndicator;
  current_rating: number;
  target_rating: number;
  target_date: string | null;
  strategy: string;
  progress_notes: string | null;
  status: NormalizationGoalStatus;
  created_by: string;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NormalizationGoalWithDetails extends NormalizationGoal {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  };
  created_by_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// ── Student normalization summary ────────────────────────

export interface StudentNormalizationSummary {
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  student_preferred_name: string | null;
  student_photo_url: string | null;
  latest_observation: NormalizationObservation | null;
  avg_rating: number | null;
  observation_count: number;
  active_goals_count: number;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
}

// ── Dashboard aggregate ──────────────────────────────────

export interface NormalizationDashboardData {
  students: StudentNormalizationSummary[];
  class_averages: Record<NormalizationIndicator, number>;
  total_observations_this_term: number;
  students_with_observations: number;
  students_without_observations: number;
  engagement_distribution: Record<WorkCycleEngagement, number>;
  joyful_count: number;
}

// ── Trend data for charts ────────────────────────────────

export interface NormalizationTrendPoint {
  date: string;
  concentration: number;
  independence: number;
  order: number;
  coordination: number;
  social_harmony: number;
  avg: number;
}

export interface StudentNormalizationDetail {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    photo_url: string | null;
  };
  observations: NormalizationObservationWithDetails[];
  goals: NormalizationGoalWithDetails[];
  trend: NormalizationTrendPoint[];
  latest_avg: number | null;
  observation_count: number;
}

// ============================================================
// Unexplained Absence Follow-up
// ============================================================

export type AbsenceAlertStatus =
  | "pending"
  | "notified"
  | "explained"
  | "escalated"
  | "dismissed";

export type ExplanationSource =
  | "guardian_call"
  | "guardian_app"
  | "staff_entry"
  | "auto";

export type AbsenceNotificationChannel = "push" | "sms" | "email";

export type AbsenceNotificationStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed";

export interface AbsenceFollowupConfig {
  tenant_id: string;
  cutoff_time: string; // HH:MM:SS e.g. "09:30:00"
  auto_notify_guardians: boolean;
  notification_message_template: string;
  escalation_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbsenceFollowupAlert {
  id: string;
  tenant_id: string;
  student_id: string;
  alert_date: string; // ISO date YYYY-MM-DD
  attendance_record_id: string | null;
  status: AbsenceAlertStatus;
  explanation: string | null;
  explained_at: string | null;
  explained_by: string | null;
  explanation_source: ExplanationSource | null;
  created_at: string;
  updated_at: string;
}

export interface AbsenceFollowupNotification {
  id: string;
  tenant_id: string;
  alert_id: string;
  guardian_id: string;
  channel: AbsenceNotificationChannel;
  status: AbsenceNotificationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
}

// ── Compound types for UI ────────────────────────────────────

export interface AbsenceFollowupAlertWithStudent extends AbsenceFollowupAlert {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  guardians: Pick<
    Guardian,
    | "id"
    | "first_name"
    | "last_name"
    | "phone"
    | "email"
    | "user_id"
    | "is_primary"
  >[];
  notification_count: number;
}

export interface AbsenceFollowupNotificationWithGuardian extends AbsenceFollowupNotification {
  guardian: Pick<
    Guardian,
    "id" | "first_name" | "last_name" | "phone" | "email"
  >;
}

export interface AbsenceFollowupAlertDetail extends AbsenceFollowupAlertWithStudent {
  notifications: AbsenceFollowupNotificationWithGuardian[];
}

export interface AbsenceFollowupDashboardData {
  config: AbsenceFollowupConfig;
  summary: {
    pending: number;
    notified: number;
    explained: number;
    escalated: number;
    dismissed: number;
    total_today: number;
  };
  alerts: AbsenceFollowupAlertWithStudent[];
  date: string; // ISO date of the dashboard view
}

// ============================================================
// SMS Gateway
// ============================================================

export type SmsProvider = "messagemedia" | "burst";

export type SmsStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced"
  | "opted_out";

export type SmsMessageType =
  | "general"
  | "absence_alert"
  | "emergency"
  | "reminder"
  | "broadcast";

export interface SmsGatewayConfig {
  tenant_id: string;
  provider: SmsProvider;
  /** AES-encrypted; server only reads via service role */
  api_key_enc: string;
  api_secret_enc: string | null;
  sender_id: string;
  enabled: boolean;
  daily_limit: number;
  opt_out_list: string[];
  created_at: string;
  updated_at: string;
}

/** Safe config shape exposed to the UI - no key material */
export interface SmsGatewayConfigSafe {
  tenant_id: string;
  provider: SmsProvider;
  /** True if api_key_enc is non-empty (never returns the actual key) */
  has_api_key: boolean;
  sender_id: string;
  enabled: boolean;
  daily_limit: number;
  opt_out_count: number;
  created_at: string;
  updated_at: string;
}

export interface SmsMessage {
  id: string;
  tenant_id: string;
  sent_by_user_id: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  student_id: string | null;
  guardian_id: string | null;
  message_body: string;
  message_type: SmsMessageType;
  provider: SmsProvider;
  provider_message_id: string | null;
  status: SmsStatus;
  error_message: string | null;
  segment_count: number;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface SmsMessageWithStudent extends SmsMessage {
  student: { id: string; first_name: string; last_name: string } | null;
}

export interface SmsDeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  opted_out: number;
  delivery_rate: number; // percentage (0–100)
  segments_used_today: number;
  daily_limit: number;
}

export interface SmsDashboardData {
  config: SmsGatewayConfigSafe | null;
  stats_30d: SmsDeliveryStats;
  recent_messages: SmsMessageWithStudent[];
  failed_messages: SmsMessage[];
}

// ============================================================
// Push Notification Dispatch (Module: Comms)
// ============================================================

export type NotificationTopic =
  | "announcements"
  | "messages"
  | "observations"
  | "attendance"
  | "events"
  | "incidents"
  | "bookings"
  | "reports"
  | "emergency"
  | "billing"
  | "rostering"
  | "general";

export type NotificationStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled"
  | "failed";

export type NotificationTargetType =
  | "all_staff"
  | "all_parents"
  | "all_users"
  | "specific_class"
  | "specific_program"
  | "specific_users";

export type NotificationDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

export interface NotificationDispatch {
  id: string;
  tenant_id: string;
  created_by: string;
  topic: NotificationTopic;
  title: string;
  body: string;
  data: Record<string, unknown>;
  target_type: NotificationTargetType;
  target_class_id: string | null;
  target_program_id: string | null;
  target_user_ids: string[] | null;
  status: NotificationStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NotificationDispatchWithAuthor extends NotificationDispatch {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface NotificationDeliveryLog {
  id: string;
  dispatch_id: string;
  tenant_id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android" | "web";
  status: NotificationDeliveryStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface NotificationTopicPref {
  id: string;
  tenant_id: string;
  user_id: string;
  topic: NotificationTopic;
  push_enabled: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationDashboardData {
  total_dispatches: number;
  sent_last_30d: number;
  avg_delivery_rate: number; // percentage 0–100
  recent_dispatches: NotificationDispatchWithAuthor[];
  topic_breakdown: { topic: NotificationTopic; count: number }[];
}

// ============================================================
// RECURRING BILLING
// ============================================================

export type BillingCollectionMethod =
  | "stripe_becs"
  | "stripe_card"
  | "manual_bank_transfer";
export type RecurringBillingStatus =
  | "active"
  | "paused"
  | "cancelled"
  | "failed";
export type PaymentAttemptStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "retry_scheduled";
export type FailureReason =
  | "insufficient_funds"
  | "card_declined"
  | "expired_card"
  | "invalid_account"
  | "bank_error"
  | "other";

export interface RecurringBillingSetup {
  id: string;
  tenant_id: string;
  family_id: string;
  collection_method: BillingCollectionMethod;
  stripe_setup_intent_id: string | null;
  stripe_payment_method_id: string | null;
  mandate_id: string | null;
  mandate_accepted_at: string | null;
  mandate_accepted_by_user_id: string | null;
  account_holder_name: string;
  account_holder_email: string;
  account_holder_phone: string | null;
  is_ccs_gap_fee_setup: boolean;
  ccs_program_name: string | null;
  status: RecurringBillingStatus;
  auto_retry_enabled: boolean;
  max_retry_attempts: number;
  retry_interval_days: number;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: string | null;
  cancellation_reason: string | null;
}

export interface RecurringBillingSchedule {
  id: string;
  tenant_id: string;
  recurring_billing_setup_id: string;
  invoice_type: string;
  collection_day_of_month: number;
  fixed_amount_cents: number | null;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingPaymentAttempt {
  id: string;
  tenant_id: string;
  recurring_billing_setup_id: string;
  recurring_billing_schedule_id: string | null;
  invoice_id: string | null;
  amount_cents: number;
  attempt_number: number;
  status: PaymentAttemptStatus;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  succeeded_at: string | null;
  failed_at: string | null;
  failure_reason: FailureReason | null;
  failure_message: string | null;
  next_retry_at: string | null;
  retries_exhausted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingFailure {
  id: string;
  tenant_id: string;
  family_id: string;
  recurring_billing_setup_id: string;
  amount_cents: number;
  failure_reason: FailureReason;
  notification_sent_at: string | null;
  notification_method: string | null;
  parent_response_at: string | null;
  parent_response_action: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_by_user_id: string | null;
}

export interface RecurringBillingSetupWithFamily extends RecurringBillingSetup {
  family: { id: string; display_name: string };
}

export interface BillingPaymentAttemptWithSetup extends BillingPaymentAttempt {
  setup: RecurringBillingSetup;
}

export interface RecurringBillingDashboardData {
  total_setups: number;
  active_setups: number;
  paused_setups: number;
  failed_setups: number;
  upcoming_collections: {
    date: string;
    amount_cents: number;
    family_count: number;
  }[];
  failed_payments_last_30d: number;
  total_failed_amount_cents: number;
  setups_by_method: { method: BillingCollectionMethod; count: number }[];
  recent_payment_attempts: BillingPaymentAttemptWithSetup[];
}

// ============================================================
// Work Cycle Integrity Tracking (Montessori)
// ============================================================

export type WorkCycleInterruptionSource =
  | "pa_announcement"
  | "specialist_pullout"
  | "fire_drill"
  | "visitor"
  | "admin_request"
  | "peer_disruption"
  | "staff_interruption"
  | "technology"
  | "noise_external"
  | "other";

export type WorkCycleInterruptionSeverity = "minor" | "moderate" | "severe";

export interface WorkCycleSession {
  id: string;
  tenant_id: string;
  class_id: string;
  session_date: string; // ISO date YYYY-MM-DD
  planned_start_time: string; // HH:MM:SS
  planned_end_time: string; // HH:MM:SS
  actual_start_time: string | null;
  actual_end_time: string | null;
  longest_uninterrupted_minutes: number | null;
  quality_rating: number | null; // 1–5
  completed_full_cycle: boolean;
  general_notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkCycleInterruption {
  id: string;
  tenant_id: string;
  session_id: string;
  occurred_at: string; // HH:MM:SS
  duration_minutes: number;
  source: WorkCycleInterruptionSource;
  severity: WorkCycleInterruptionSeverity;
  description: string | null;
  preventable: boolean;
  created_at: string;
}

export interface WorkCycleSessionWithDetails extends WorkCycleSession {
  interruptions: WorkCycleInterruption[];
  class_name: string;
  recorder_name: string;
  total_interruption_minutes: number;
  interruption_count: number;
}

export interface WorkCycleClassSummary {
  class_id: string;
  class_name: string;
  sessions_last_30d: number;
  avg_interruptions_per_session: number;
  avg_quality_rating: number | null;
  pct_completed_full: number;
  total_interruption_minutes_last_30d: number;
  most_common_source: WorkCycleInterruptionSource | null;
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  flagged: boolean; // > threshold interruptions per session
}

export interface WorkCycleDashboardData {
  class_summaries: WorkCycleClassSummary[];
  total_sessions_this_term: number;
  avg_interruptions_per_session: number;
  avg_quality_rating: number | null;
  pct_completed_full: number;
  interruption_by_source: Record<WorkCycleInterruptionSource, number>;
  interruption_by_severity: Record<WorkCycleInterruptionSeverity, number>;
  pct_preventable: number;
  flagged_class_count: number;
  recent_sessions: WorkCycleSessionWithDetails[];
}

export interface WorkCycleIntegrityTrend {
  week: string; // ISO date of week start (Monday)
  avg_interruptions: number;
  avg_quality: number | null;
  session_count: number;
}

// ============================================================
// THREE-YEAR CYCLE PROGRESS VIEW
// ============================================================
// Longitudinal progress reports spanning the full 3-year age
// band (not per-term). Derived from lesson_records +
// montessori_materials + students - no additional tables.
// ============================================================

/** Progress level for a single material within the 3-year cycle */
export type CycleProgressLevel =
  | "not_started" // no lesson records at all
  | "introduced" // at least one "introduction" stage lesson
  | "practicing" // at least one "practice" stage lesson
  | "mastered"; // at least one "mastery" stage lesson

/** Rolled-up mastery of an entire area for a student */
export type CycleAreaMastery =
  | "not_started" // 0% mastered
  | "beginning" // 1–25% mastered
  | "developing" // 26–50% mastered
  | "consolidating" // 51–75% mastered
  | "advanced"; // 76–100% mastered

/** Progress for a single material in the longitudinal view */
export interface CycleMaterialProgress {
  material_id: string;
  material_name: string;
  area: MontessoriArea;
  age_level: MontessoriAgeLevel;
  sequence_order: number;
  level: CycleProgressLevel;
  first_introduced: string | null; // ISO date of first lesson record
  first_practiced: string | null;
  first_mastered: string | null;
  last_lesson_date: string | null;
  lesson_count: number;
}

/** Per-area summary for one student */
export interface CycleAreaSummary {
  area: MontessoriArea;
  total_materials: number;
  not_started: number;
  introduced: number;
  practicing: number;
  mastered: number;
  mastery_pct: number; // 0–100
  mastery_level: CycleAreaMastery;
}

/** Full longitudinal profile for a single student across their 3-year band */
export interface StudentCycleProfile {
  student_id: string;
  student_name: string;
  preferred_name: string | null;
  photo_url: string | null;
  dob: string | null;
  age_band: MontessoriAgeLevel; // band inferred from age at time of query
  enrollment_start: string | null;
  area_summaries: CycleAreaSummary[];
  materials: CycleMaterialProgress[]; // all materials in this student's band
  /** Percentage of band materials mastered overall */
  overall_mastery_pct: number;
  /** Total lesson records (including all stages) */
  total_lessons: number;
}

/** Row in the class-wide heatmap */
export interface ClassCycleRow {
  student_id: string;
  student_name: string;
  preferred_name: string | null;
  photo_url: string | null;
  age_band: MontessoriAgeLevel;
  area_summaries: CycleAreaSummary[];
  overall_mastery_pct: number;
}

/** Full class-level three-year cycle report */
export interface ClassCycleReport {
  class_id: string | null;
  class_name: string | null;
  generated_at: string;
  students: ClassCycleRow[];
  /** How many materials exist per area (same for all students in same band) */
  area_totals: Record<MontessoriArea, number>;
}

// ============================================================
// Prepared Environment Planner
// ============================================================

export type EnvironmentPlanStatus = "draft" | "active" | "archived";
export type RotationScheduleStatus =
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled";
export type RotationThemeType =
  | "seasonal"
  | "thematic"
  | "developmental"
  | "custom";

export interface EnvironmentPlan {
  id: string;
  tenant_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  status: EnvironmentPlanStatus;
  theme: string | null;
  effective_from: string | null;
  effective_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PlanShelfSlot {
  id: string;
  tenant_id: string;
  plan_id: string;
  inventory_item_id: string | null;
  slot_label: string;
  sort_order: number;
  area: string | null;
  age_range_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RotationSchedule {
  id: string;
  tenant_id: string;
  location_id: string | null;
  plan_id: string | null;
  title: string;
  theme_type: RotationThemeType;
  theme_label: string | null;
  scheduled_date: string;
  completed_at: string | null;
  status: RotationScheduleStatus;
  rationale: string | null;
  materials_added: string | null;
  materials_removed: string | null;
  outcome_notes: string | null;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EnvironmentPlanWithDetails extends EnvironmentPlan {
  location: Pick<MaterialShelfLocation, "id" | "name" | "room_type"> | null;
  slots: PlanShelfSlotWithItem[];
}

export interface PlanShelfSlotWithItem extends PlanShelfSlot {
  inventory_item:
    | (Pick<MaterialInventoryItem, "id" | "condition" | "status"> & {
        material: {
          id: string;
          name: string;
          area: string;
          age_level: string;
        } | null;
      })
    | null;
}

export interface RotationScheduleWithDetails extends RotationSchedule {
  location: Pick<MaterialShelfLocation, "id" | "name"> | null;
}

export interface EnvironmentPlannerDashboardData {
  total_plans: number;
  active_plans: number;
  draft_plans: number;
  upcoming_rotations: number;
  overdue_rotations: number; // upcoming rotations past scheduled_date
  recent_plans: EnvironmentPlan[];
  upcoming_rotation_list: RotationScheduleWithDetails[];
}

// ============================================================
// ACCREDITATION CHECKLIST
// ============================================================

export type AccreditationBodyCode = "ami" | "ams" | "msaa";

export type AccreditationRating =
  | "not_started"
  | "not_met"
  | "partially_met"
  | "met"
  | "exceeds";

export type AccreditationCycleStatus =
  | "draft"
  | "self_study"
  | "submitted"
  | "under_review"
  | "accredited"
  | "conditional"
  | "lapsed";

export type AccreditationEvidenceType =
  | "document"
  | "link"
  | "observation"
  | "photo"
  | "note";

export interface AccreditationCriterion {
  id: string;
  tenant_id: string | null; // null = global seed row
  body_code: AccreditationBodyCode;
  domain_name: string;
  domain_order: number;
  criterion_code: string;
  criterion_title: string;
  description: string | null;
  guidance: string | null;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccreditationCycle {
  id: string;
  tenant_id: string;
  body_code: AccreditationBodyCode;
  cycle_label: string;
  status: AccreditationCycleStatus;
  self_study_start: string | null;
  self_study_end: string | null;
  submission_date: string | null;
  decision_date: string | null;
  decision_notes: string | null;
  accreditation_valid_from: string | null;
  accreditation_valid_to: string | null;
  lead_staff_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AccreditationAssessment {
  id: string;
  tenant_id: string;
  cycle_id: string;
  criterion_id: string;
  rating: AccreditationRating;
  self_assessment: string | null;
  strengths: string | null;
  areas_for_growth: string | null;
  action_required: string | null;
  target_date: string | null;
  assessed_by: string | null;
  assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccreditationEvidence {
  id: string;
  tenant_id: string;
  assessment_id: string;
  evidence_type: AccreditationEvidenceType;
  title: string;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  observation_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ── Join types ───────────────────────────────────────────────

export interface AccreditationAssessmentWithDetails extends AccreditationAssessment {
  criterion: AccreditationCriterion;
  evidence: AccreditationEvidence[];
}

export interface AccreditationCycleWithProgress extends AccreditationCycle {
  total_criteria: number;
  not_started_count: number;
  not_met_count: number;
  partially_met_count: number;
  met_count: number;
  exceeds_count: number;
  overall_progress_pct: number; // (met + exceeds) / total * 100
  lead_staff_name: string | null;
}

// ── Per-domain progress breakdown ────────────────────────────

export interface AccreditationDomainProgress {
  domain_name: string;
  domain_order: number;
  criteria: Array<{
    criterion: AccreditationCriterion;
    assessment: AccreditationAssessment | null;
    evidence_count: number;
  }>;
  met_count: number;
  total_count: number;
}

// ── Dashboard ────────────────────────────────────────────────

export interface AccreditationDashboardData {
  cycles: AccreditationCycleWithProgress[];
  active_cycle_by_body: Record<
    AccreditationBodyCode,
    AccreditationCycleWithProgress | null
  >;
  total_cycles: number;
  accredited_count: number;
}

// ============================================================
// ACARA Attendance Reporting
// ============================================================

export type AcaraReportStatus = "draft" | "verified" | "exported" | "submitted";
export type AcaraCollectionType =
  | "annual_school_collection"
  | "semester_1_snapshot"
  | "semester_2_snapshot";

export interface AcaraReportPeriod {
  id: string;
  tenant_id: string;
  calendar_year: number;
  collection_type: AcaraCollectionType;
  status: AcaraReportStatus;
  period_start: string; // ISO date
  period_end: string; // ISO date
  notes: string | null;
  exported_at: string | null;
  exported_by: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcaraStudentRecord {
  id: string;
  tenant_id: string;
  report_period_id: string;
  student_id: string;
  possible_days: number;
  actual_days: number;
  unexplained_days: number;
  attendance_rate: number; // generated column - actual/possible * 100
  absent_explained: number;
  late_days: number;
  exempt_days: number;
  last_synced_at: string | null;
  override_notes: string | null;
  manually_overridden: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcaraStudentRecordWithStudent extends AcaraStudentRecord {
  student: Pick<
    Student,
    | "id"
    | "first_name"
    | "last_name"
    | "dob"
    | "indigenous_status"
    | "language_background"
  >;
}

export interface AcaraReportPeriodWithCounts extends AcaraReportPeriod {
  total_students: number;
  students_below_85: number; // <85% attendance rate
  students_below_70: number; // <70% - severe
  avg_attendance_rate: number;
}

export interface AcaraDashboardData {
  periods: AcaraReportPeriodWithCounts[];
  current_year: number;
  latest_period: AcaraReportPeriodWithCounts | null;
}

// ============================================================
// Previous School Records
// ============================================================

export interface PreviousSchoolRecord {
  id: string;
  tenant_id: string;
  student_id: string;

  school_name: string;
  school_type: string | null; // government / independent / catholic / international / homeschool
  suburb: string | null;
  state: string | null;
  country: string;

  start_date: string | null; // ISO date
  end_date: string | null; // ISO date
  year_levels: string[] | null;

  principal_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;

  reason_for_leaving: string | null;
  transfer_document_url: string | null;
  notes: string | null;

  recorded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PreviousSchoolRecordWithStudent extends PreviousSchoolRecord {
  student: Pick<Student, "id" | "first_name" | "last_name" | "dob">;
}

// ============================================================
// OBSERVATION AUTO-TAGGING
// ============================================================

export type SuggestionStatus = "pending" | "confirmed" | "dismissed";
export type SuggestionTagType = "curriculum_outcome" | "montessori_area";

export interface ObservationTagSuggestion {
  id: string;
  tenant_id: string;
  observation_id: string;
  tag_type: SuggestionTagType;
  curriculum_node_id: string | null;
  area_label: string | null;
  display_label: string;
  confidence: number;
  rationale: string | null;
  status: SuggestionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObservationTagSuggestionWithNode extends ObservationTagSuggestion {
  curriculum_node: Pick<CurriculumNode, "id" | "title" | "level"> | null;
}

export interface ObservationTagSuggestionsResult {
  observation_id: string;
  suggestions: ObservationTagSuggestionWithNode[];
  /** Count already applied (confirmed) */
  confirmed_count: number;
  /** Count pending review */
  pending_count: number;
  /** Count dismissed */
  dismissed_count: number;
}

// ============================================================
// MONTESSORI LITERACY HUB
// ============================================================

export type HubArticleCategory =
  | "philosophy"
  | "language"
  | "mathematics"
  | "practical_life"
  | "sensorial"
  | "cultural"
  | "cosmic_education"
  | "child_development"
  | "home_connection"
  | "three_period_lesson"
  | "sensitive_periods"
  | "work_cycle"
  | "normalization"
  | "prepared_environment";

export type HubArticleAgeBand =
  | "birth_3"
  | "three_6"
  | "six_9"
  | "nine_12"
  | "all_ages";

export type HubArticleStatus = "draft" | "published" | "archived";

export interface HubArticle {
  id: string;
  /** NULL = platform article (visible to all tenants) */
  tenant_id: string | null;

  title: string;
  slug: string;
  category: HubArticleCategory;
  age_bands: HubArticleAgeBand[];
  status: HubArticleStatus;

  summary: string;
  body_md: string;
  key_takeaways: string[];
  home_tips: string[];

  linked_area_ids: string[];
  linked_keywords: string[];

  author_id: string | null;
  published_at: string | null;
  sort_order: number;

  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface HubArticleRead {
  id: string;
  tenant_id: string;
  article_id: string;
  user_id: string;
  read_at: string;
  bookmarked: boolean;
}

export interface HubArticleFeedback {
  id: string;
  tenant_id: string;
  article_id: string;
  user_id: string;
  helpful: boolean;
  created_at: string;
}

/** Article augmented with current user's read/bookmark/feedback state */
export interface HubArticleWithUserState extends HubArticle {
  is_read: boolean;
  bookmarked: boolean;
  feedback: boolean | null;
  helpful_count: number;
  not_helpful_count: number;
}

/** Summary row for list views */
export interface HubArticleSummary {
  id: string;
  title: string;
  slug: string;
  category: HubArticleCategory;
  age_bands: HubArticleAgeBand[];
  status: HubArticleStatus;
  summary: string;
  tenant_id: string | null;
  published_at: string | null;
  sort_order: number;
  is_read: boolean;
  bookmarked: boolean;
}

export interface HubDashboardData {
  total_articles: number;
  published_articles: number;
  articles_read_by_user: number;
  bookmarked_by_user: number;
  by_category: {
    category: HubArticleCategory;
    count: number;
    articles: HubArticleSummary[];
  }[];
  recent: HubArticleSummary[];
  bookmarks: HubArticleSummary[];
}

// ============================================================
// COSMIC EDUCATION UNIT PLANNING
// ============================================================
// Supports the five Great Lessons and integrated cultural study
// units for Montessori 6–12 programmes.
// ============================================================

export type CosmicGreatLesson =
  | "story_of_universe"
  | "story_of_life"
  | "story_of_humans"
  | "story_of_communication"
  | "story_of_numbers"
  | "custom";

export type CosmicUnitStatus = "draft" | "active" | "completed" | "archived";

export type CosmicStudyArea =
  | "history"
  | "geography"
  | "biology"
  | "physics"
  | "astronomy"
  | "mathematics"
  | "language_arts"
  | "art_music"
  | "culture_society"
  | "economics"
  | "integrated";

export type CosmicStudyStatus =
  | "introduced"
  | "exploring"
  | "presenting"
  | "completed";

// ── Base entities ─────────────────────────────────────────────

export interface CosmicGreatLessonRow {
  id: string;
  tenant_id: string | null; // null = global seed row
  lesson_key: CosmicGreatLesson;
  title: string;
  subtitle: string | null;
  description: string | null;
  age_range: string;
  related_areas: CosmicStudyArea[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CosmicUnit {
  id: string;
  tenant_id: string;
  great_lesson_id: string;
  title: string;
  description: string | null;
  key_questions: string[];
  age_range: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: CosmicUnitStatus;
  lead_staff_id: string | null;
  target_class_id: string | null;
  linked_material_ids: string[];
  linked_lesson_ids: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CosmicUnitStudy {
  id: string;
  tenant_id: string;
  unit_id: string;
  title: string;
  study_area: CosmicStudyArea;
  description: string | null;
  learning_outcomes: string[];
  key_vocabulary: string[];
  materials_needed: string[];
  resources: string[];
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CosmicUnitParticipant {
  id: string;
  tenant_id: string;
  unit_id: string;
  student_id: string;
  enrolled_at: string;
  notes: string | null;
}

export interface CosmicStudyRecord {
  id: string;
  tenant_id: string;
  unit_id: string;
  study_id: string;
  student_id: string;
  status: CosmicStudyStatus;
  introduced_at: string | null;
  exploring_at: string | null;
  presenting_at: string | null;
  completed_at: string | null;
  presentation_notes: string | null;
  staff_notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Join / detail types ───────────────────────────────────────

export interface CosmicUnitWithDetails extends CosmicUnit {
  great_lesson: CosmicGreatLessonRow;
  studies: CosmicUnitStudy[];
  participant_count: number;
  lead_staff_name: string | null;
  target_class_name: string | null;
  completion_pct: number; // % of study records in 'completed' state
}

export interface CosmicStudyWithRecords extends CosmicUnitStudy {
  records: CosmicStudyRecordWithStudent[];
  completed_count: number;
  total_students: number;
}

export interface CosmicStudyRecordWithStudent extends CosmicStudyRecord {
  student: Pick<Student, "id" | "first_name" | "last_name">;
}

export interface CosmicUnitParticipantWithStudent extends CosmicUnitParticipant {
  student: Pick<Student, "id" | "first_name" | "last_name" | "dob">;
  study_progress: Array<{
    study_id: string;
    study_title: string;
    study_area: CosmicStudyArea;
    status: CosmicStudyStatus | null;
  }>;
  completed_studies: number;
  total_studies: number;
}

// ── Dashboard ─────────────────────────────────────────────────

export interface CosmicUnitSummary {
  id: string;
  title: string;
  status: CosmicUnitStatus;
  great_lesson_title: string;
  lesson_key: CosmicGreatLesson;
  planned_start: string | null;
  planned_end: string | null;
  participant_count: number;
  study_count: number;
  completion_pct: number;
}

export interface CosmicEducationDashboardData {
  active_units: CosmicUnitSummary[];
  draft_units: CosmicUnitSummary[];
  completed_units: CosmicUnitSummary[];
  great_lessons: CosmicGreatLessonRow[];
  total_units: number;
  active_count: number;
  completed_count: number;
  units_by_lesson: Record<CosmicGreatLesson, number>;
}

// ============================================================
// Grant Tracking (Finance module)
// ============================================================

export type GrantStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "active"
  | "acquitted"
  | "closed";

export type GrantCategory =
  | "general"
  | "capital"
  | "professional_dev"
  | "curriculum"
  | "technology"
  | "community"
  | "research"
  | "other";

export type GrantMilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "overdue";

export type GrantDocumentType =
  | "application"
  | "approval_letter"
  | "agreement"
  | "progress_report"
  | "acquittal_report"
  | "receipt"
  | "correspondence"
  | "other";

export interface Grant {
  id: string;
  tenant_id: string;
  name: string;
  reference_number: string | null;
  funding_body: string;
  amount_cents: number;
  spent_cents: number;
  start_date: string;
  end_date: string;
  acquittal_due_date: string | null;
  acquitted_at: string | null;
  status: GrantStatus;
  category: GrantCategory;
  managed_by_user_id: string | null;
  description: string | null;
  conditions: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantWithDetails extends Grant {
  managed_by_user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  milestones_total: number;
  milestones_completed: number;
  milestones_overdue: number;
  remaining_cents: number;
  spend_pct: number;
}

export interface GrantMilestone {
  id: string;
  tenant_id: string;
  grant_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: GrantMilestoneStatus;
  completed_at: string | null;
  completed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantExpenditure {
  id: string;
  tenant_id: string;
  grant_id: string;
  description: string;
  amount_cents: number;
  date: string;
  category: string | null;
  invoice_id: string | null;
  receipt_reference: string | null;
  recorded_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantDocument {
  id: string;
  tenant_id: string;
  grant_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  document_type: GrantDocumentType;
  uploaded_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface GrantDashboardData {
  total_grants: number;
  active_grants: number;
  total_awarded_cents: number;
  total_spent_cents: number;
  by_status: { status: GrantStatus; count: number; total_cents: number }[];
  by_category: {
    category: GrantCategory;
    count: number;
    total_cents: number;
  }[];
  upcoming_acquittals: Grant[];
  overdue_milestones: (GrantMilestone & { grant_name: string })[];
}

// ============================================================
// Fee Notice Comms
// ============================================================

export type FeeNoticeTrigger =
  | "invoice_sent"
  | "invoice_overdue"
  | "payment_received"
  | "payment_failed"
  | "reminder_1"
  | "reminder_2"
  | "reminder_3";

export type FeeNoticeChannel = "email" | "sms" | "push";

export type FeeNoticeDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped";

export interface FeeNoticeConfig {
  id: string;
  tenant_id: string;
  enabled_triggers: FeeNoticeTrigger[];
  enabled_channels: FeeNoticeChannel[];
  reminder_1_days: number;
  reminder_2_days: number;
  reminder_3_days: number;
  auto_send: boolean;
  include_payment_link: boolean;
  template_invoice_sent: string | null;
  template_invoice_overdue: string | null;
  template_payment_received: string | null;
  template_payment_failed: string | null;
  template_reminder: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeNotice {
  id: string;
  tenant_id: string;
  invoice_id: string;
  guardian_id: string;
  student_id: string;
  trigger_type: FeeNoticeTrigger;
  invoice_number: string;
  amount_cents: number;
  due_date: string;
  queued_by: string | null;
  queued_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: FeeNoticeDeliveryStatus;
  sent_at: string | null;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FeeNoticeDelivery {
  id: string;
  fee_notice_id: string;
  channel: FeeNoticeChannel;
  status: FeeNoticeDeliveryStatus;
  email_message_id: string | null;
  sms_message_id: string | null;
  push_dispatch_id: string | null;
  recipient_address: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface FeeNoticeWithDetails extends FeeNotice {
  student: { id: string; first_name: string; last_name: string } | null;
  guardian: {
    id: string;
    user_id: string;
    relationship: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    } | null;
  } | null;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    total_cents: number;
    due_date: string;
  } | null;
  deliveries: FeeNoticeDelivery[];
  queued_by_user: { id: string; first_name: string; last_name: string } | null;
}

export interface FeeNoticeCommsData {
  config: FeeNoticeConfig | null;
  recent_notices: FeeNoticeWithDetails[];
  stats: {
    total_sent: number;
    total_pending: number;
    total_failed: number;
    by_trigger: { trigger: FeeNoticeTrigger; count: number }[];
    by_channel: {
      channel: FeeNoticeChannel;
      sent: number;
      delivered: number;
      failed: number;
    }[];
  };
  pending_approval: FeeNoticeWithDetails[];
  overdue_invoices_without_notice: number;
}

// ============================================================
// Newsletter Module
// ============================================================

export type NewsletterStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled";
export type NewsletterAudience =
  | "all_parents"
  | "all_staff"
  | "all_users"
  | "class"
  | "program";
export type NewsletterSectionType =
  | "heading"
  | "text"
  | "image"
  | "divider"
  | "button"
  | "two_column";

export interface NewsletterTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  body_json: Record<string, unknown>[];
  header_image_url: string | null;
  footer_html: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Newsletter {
  id: string;
  tenant_id: string;
  template_id: string | null;
  title: string;
  subject_line: string;
  preheader: string | null;
  body_html: string;
  body_json: Record<string, unknown>[];
  header_image_url: string | null;
  footer_html: string | null;
  status: NewsletterStatus;
  audience: NewsletterAudience;
  target_class_id: string | null;
  target_program_id: string | null;
  author_id: string;
  scheduled_for: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  recipient_count: number;
  read_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewsletterWithDetails extends Newsletter {
  author: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
  target_class: Pick<Class, "id" | "name"> | null;
  sections: NewsletterSection[];
  open_rate: number;
}

export interface NewsletterSection {
  id: string;
  newsletter_id: string;
  tenant_id: string;
  section_type: NewsletterSectionType;
  sort_order: number;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NewsletterRecipient {
  id: string;
  newsletter_id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface NewsletterRecipientWithUser extends NewsletterRecipient {
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

export interface NewsletterDashboardData {
  recent_newsletters: NewsletterWithDetails[];
  templates: NewsletterTemplate[];
  stats: {
    total_sent: number;
    total_drafts: number;
    total_scheduled: number;
    avg_open_rate: number;
    total_recipients_all_time: number;
  };
}

// ============================================================
// Tuckshop Ordering System
// ============================================================

export type TuckshopOrderStatus =
  | "draft"
  | "submitted"
  | "ready"
  | "collected"
  | "cancelled";

export type TuckshopDeliveryStatus =
  | "open"
  | "ordered"
  | "received"
  | "finalized";

export type TuckshopMenuCategory =
  | "hot_food"
  | "cold_food"
  | "snack"
  | "drink"
  | "dessert"
  | "other";

export type TuckshopDayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface TuckshopSupplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  delivery_days: TuckshopDayOfWeek[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TuckshopMenuItem {
  id: string;
  tenant_id: string;
  supplier_id: string | null;
  name: string;
  description: string | null;
  category: TuckshopMenuCategory;
  price_cents: number;
  available_days: TuckshopDayOfWeek[];
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TuckshopMenuItemWithSupplier extends TuckshopMenuItem {
  supplier: Pick<TuckshopSupplier, "id" | "name"> | null;
}

export interface TuckshopDeliveryWeek {
  id: string;
  tenant_id: string;
  supplier_id: string;
  week_start: string;
  week_end: string;
  status: TuckshopDeliveryStatus;
  notes: string | null;
  ordered_at: string | null;
  ordered_by: string | null;
  received_at: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TuckshopDeliveryWeekWithDetails extends TuckshopDeliveryWeek {
  supplier: Pick<TuckshopSupplier, "id" | "name">;
  order_count: number;
  total_revenue_cents: number;
  item_summary: { menu_item_name: string; total_quantity: number }[];
}

export interface TuckshopOrder {
  id: string;
  tenant_id: string;
  student_id: string;
  delivery_week_id: string | null;
  order_date: string;
  status: TuckshopOrderStatus;
  total_price_cents: number;
  placed_by_user_id: string | null;
  notes: string | null;
  submitted_at: string | null;
  collected_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TuckshopOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_cents: number;
  created_at: string;
}

export interface TuckshopOrderItemWithMenuItem extends TuckshopOrderItem {
  menu_item: Pick<TuckshopMenuItem, "id" | "name" | "category" | "image_url">;
}

export interface TuckshopOrderWithDetails extends TuckshopOrder {
  student: Pick<Student, "id" | "first_name" | "last_name">;
  items: TuckshopOrderItemWithMenuItem[];
}

export interface TuckshopDashboardData {
  stats: {
    open_delivery_weeks: number;
    submitted_orders_this_week: number;
    ready_for_collection: number;
    total_revenue_this_week_cents: number;
  };
  active_delivery_weeks: TuckshopDeliveryWeekWithDetails[];
  pending_orders: TuckshopOrderWithDetails[];
  active_suppliers: TuckshopSupplier[];
}
