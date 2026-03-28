// src/lib/utils/audit.ts
//
// ============================================================
// WattleOS V2 - Audit Trail System
// ============================================================
// WHY: Schools manage children's data under Australian Privacy
// Principles. Administrators need to answer "who accessed this
// child's medical record at 3am?" with a concrete audit trail.
//
// ARCHITECTURE:
//   - Append-only: audit_logs has no updated_at or deleted_at
//   - Service role: inserts bypass RLS (users can't write their own logs)
//   - IP + user agent: captured from request headers for forensics
//   - Consistent naming: "entity.action" convention (e.g. "student.created")
//
// USAGE:
//   import { logAudit } from "@/lib/utils/audit";
//
//   await logAudit({
//     context,                        // from getTenantContext()
//     action: "student.created",
//     entityType: "student",
//     entityId: student.id,
//     metadata: { first_name, last_name },
//   });
//
// For system actions (no user context):
//   await logAuditSystem({
//     tenantId: "...",
//     action: "webhook.stripe.invoice_paid",
//     entityType: "invoice",
//     entityId: invoice.id,
//   });
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { TenantContext } from "@/types/domain";
import { headers } from "next/headers";

// ============================================================
// Action Name Constants
// ============================================================
// WHY constants: Typos in string literals are silent bugs.
// These constants are searchable, auto-completable, and
// catch errors at compile time.
// ============================================================

export const AuditActions = {
  // ── Students ────────────────────────────────────────────
  STUDENT_CREATED: "student.created",
  STUDENT_UPDATED: "student.updated",
  STUDENT_DELETED: "student.deleted",
  STUDENT_VIEWED: "student.viewed",
  STUDENT_EXPORTED: "student.exported",

  // ── Medical ─────────────────────────────────────────────
  MEDICAL_VIEWED: "medical.viewed",
  MEDICAL_CREATED: "medical.created",
  MEDICAL_UPDATED: "medical.updated",
  MEDICAL_DELETED: "medical.deleted",

  // ── Custody ─────────────────────────────────────────────
  CUSTODY_VIEWED: "custody_restriction.viewed",
  CUSTODY_CREATED: "custody_restriction.created",
  CUSTODY_UPDATED: "custody_restriction.updated",
  CUSTODY_DELETED: "custody_restriction.deleted",

  // ── Emergency Contacts ──────────────────────────────────
  EMERGENCY_CONTACT_CREATED: "emergency_contact.created",
  EMERGENCY_CONTACT_UPDATED: "emergency_contact.updated",
  EMERGENCY_CONTACT_DELETED: "emergency_contact.deleted",

  // ── Guardians ───────────────────────────────────────────
  GUARDIAN_CREATED: "guardian.created",
  GUARDIAN_UPDATED: "guardian.updated",
  GUARDIAN_REMOVED: "guardian.removed",

  // ── Observations ────────────────────────────────────────
  OBSERVATION_CREATED: "observation.created",
  OBSERVATION_PUBLISHED: "observation.published",
  OBSERVATION_DELETED: "observation.deleted",
  OBSERVATION_MEDIA_ADDED: "observation.media_added",
  OBSERVATION_MEDIA_DELETED: "observation.media_deleted",
  OBSERVATION_TAGS_GENERATED: "observation.tags_generated",
  OBSERVATION_TAG_CONFIRMED: "observation.tag_confirmed",
  OBSERVATION_TAG_DISMISSED: "observation.tag_dismissed",
  OBSERVATION_TAGS_BULK_REVIEWED: "observation.tags_bulk_reviewed",

  // ── Attendance ──────────────────────────────────────────
  ATTENDANCE_MARKED: "attendance.marked",
  ATTENDANCE_UPDATED: "attendance.updated",
  ATTENDANCE_BATCH_MARKED: "attendance.batch_marked",

  // ── Reports ─────────────────────────────────────────────
  REPORT_CREATED: "report.created",
  REPORT_PUBLISHED: "report.published",
  REPORT_EXPORTED: "report.exported",

  // ── Enrollment ──────────────────────────────────────────
  APPLICATION_SUBMITTED: "application.submitted",
  APPLICATION_APPROVED: "application.approved",
  APPLICATION_REJECTED: "application.rejected",
  INVITATION_SENT: "invitation.sent",
  INVITATION_ACCEPTED: "invitation.accepted",

  // ── Admissions ──────────────────────────────────────────
  INQUIRY_SUBMITTED: "inquiry.submitted",
  INQUIRY_STAGE_CHANGED: "inquiry.stage_changed",
  TOUR_BOOKED: "tour.booked",

  // ── User Management ─────────────────────────────────────
  USER_INVITED: "user.invited",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_SUSPENDED: "user.suspended",
  USER_REACTIVATED: "user.reactivated",
  USER_REMOVED: "user.removed",

  // ── Role Management ──────────────────────────────────────
  ROLE_CREATED: "role.created",
  ROLE_UPDATED: "role.updated",
  ROLE_DELETED: "role.deleted",

  // ── Compliance ───────────────────────────────────────────
  COMPLIANCE_RECORD_ADDED: "compliance.record_added",
  COMPLIANCE_RECORD_UPDATED: "compliance.record_updated",
  COMPLIANCE_RECORD_DELETED: "compliance.record_deleted",

  // ── Integrations ────────────────────────────────────────
  INTEGRATION_ENABLED: "integration.enabled",
  INTEGRATION_DISABLED: "integration.disabled",
  INTEGRATION_SYNCED: "integration.synced",

  // ── Billing ─────────────────────────────────────────────
  FEE_SCHEDULE_CREATED: "fee_schedule.created",
  FEE_SCHEDULE_UPDATED: "fee_schedule.updated",
  FEE_SCHEDULE_DELETED: "fee_schedule.deleted",
  INVOICE_CREATED: "invoice.created",
  INVOICE_UPDATED: "invoice.updated",
  INVOICE_SENT: "invoice.sent",
  INVOICE_VOIDED: "invoice.voided",
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_MANUAL_RECORDED: "payment.manual_recorded",
  REFUND_ISSUED: "refund.issued",

  // ── Settings ────────────────────────────────────────────
  SETTINGS_UPDATED: "settings.updated",
  BRANDING_UPDATED: "branding.updated",
  AI_SENSITIVE_DATA_TOGGLED: "settings.ai_sensitive_data_toggled",

  // ── Data Import ─────────────────────────────────────────
  IMPORT_STARTED: "import.started",
  IMPORT_COMPLETED: "import.completed",
  IMPORT_ROLLED_BACK: "import.rolled_back",

  // ── Pickup ──────────────────────────────────────────────
  PICKUP_AUTHORIZED: "pickup.authorized",
  PICKUP_REVOKED: "pickup.revoked",

  // ── Consent ─────────────────────────────────────────────
  CONSENT_GRANTED: "consent.granted",
  CONSENT_REVOKED: "consent.revoked",

  // ── Authentication ──────────────────────────────────────
  LOGIN_SUCCESS: "auth.login",
  LOGIN_FAILED: "auth.login_failed",
  ACCOUNT_LOCKED: "auth.account_locked",
  LOGOUT: "auth.logout",
  TENANT_SWITCHED: "auth.tenant_switched",

  // ── Incidents (Reg 87) ───────────────────────────────────
  INCIDENT_CREATED: "incident.created",
  INCIDENT_UPDATED: "incident.updated",
  INCIDENT_PARENT_NOTIFIED: "incident.parent_notified",
  INCIDENT_REGULATOR_NOTIFIED: "incident.regulator_notified",
  INCIDENT_CLOSED: "incident.closed",
  INCIDENT_ESCALATION_ALERT: "incident.escalation_alert",

  // ── Medication (Reg 93/94) ───────────────────────────────
  MEDICATION_PLAN_CREATED: "medication_plan.created",
  MEDICATION_PLAN_UPDATED: "medication_plan.updated",
  MEDICATION_AUTHORISATION_CREATED: "medication_authorisation.created",
  MEDICATION_ADMINISTERED: "medication.administered",

  // ── Staff Compliance (Reg 136/145/146) ─────────────────
  COMPLIANCE_PROFILE_UPDATED: "staff_compliance.profile_updated",
  CERTIFICATE_ADDED: "staff_compliance.certificate_added",
  CERTIFICATE_UPDATED: "staff_compliance.certificate_updated",
  CERTIFICATE_DELETED: "staff_compliance.certificate_deleted",
  WWCC_VERIFIED: "staff_compliance.wwcc_verified",
  WORKER_REGISTER_EXPORTED: "staff_compliance.worker_register_exported",
  EXPIRY_ALERTS_SENT: "staff_compliance.expiry_alerts_sent",
  CERTIFICATES_BULK_IMPORTED: "staff_compliance.certificates_bulk_imported",

  // ── Ratio Monitoring (Reg 123) ────────────────────────────
  FLOOR_SIGN_IN: "ratio.floor_sign_in",
  FLOOR_SIGN_OUT: "ratio.floor_sign_out",
  RATIO_BREACH_DETECTED: "ratio.breach_detected",
  RATIO_BREACH_ACKNOWLEDGED: "ratio.breach_acknowledged",
  RATIO_BREACH_ALERT_SENT: "ratio.breach_alert_sent",

  // ── QIP Builder (Reg 55) ────────────────────────────────
  SERVICE_PHILOSOPHY_PUBLISHED: "qip.philosophy_published",
  QIP_ASSESSMENT_UPDATED: "qip.assessment_updated",
  QIP_GOAL_CREATED: "qip.goal_created",
  QIP_GOAL_UPDATED: "qip.goal_updated",
  QIP_GOAL_ACHIEVED: "qip.goal_achieved",
  QIP_EVIDENCE_ATTACHED: "qip.evidence_attached",
  QIP_EVIDENCE_REMOVED: "qip.evidence_removed",
  QIP_EXPORTED: "qip.exported",

  // ── Messaging ──────────────────────────────────────────
  MESSAGE_THREAD_DELETED: "message_thread.deleted",

  // ── Excursion Transport Bookings ────────────────────────
  TRANSPORT_BOOKING_CREATED: "excursion_transport.created",
  TRANSPORT_BOOKING_UPDATED: "excursion_transport.updated",
  TRANSPORT_BOOKING_DELETED: "excursion_transport.deleted",

  // ── Excursions (Reg 100-102) ────────────────────────────
  EXCURSION_CREATED: "excursion.created",
  EXCURSION_UPDATED: "excursion.updated",
  EXCURSION_CANCELLED: "excursion.cancelled",
  EXCURSION_RISK_ASSESSED: "excursion.risk_assessed",
  EXCURSION_CONSENT_SUBMITTED: "excursion.consent_submitted",
  EXCURSION_DEPARTED: "excursion.departed",
  EXCURSION_HEADCOUNT_RECORDED: "excursion.headcount_recorded",
  EXCURSION_RETURNED: "excursion.returned",

  // ── Policies & Complaints (Reg 168/170) ──────────────────
  POLICY_CREATED: "policy.created",
  POLICY_UPDATED: "policy.updated",
  POLICY_PUBLISHED: "policy.published",
  POLICY_ARCHIVED: "policy.archived",
  POLICY_ACKNOWLEDGED: "policy.acknowledged",
  COMPLAINT_CREATED: "complaint.created",
  COMPLAINT_UPDATED: "complaint.updated",
  COMPLAINT_RESOLVED: "complaint.resolved",
  COMPLAINT_ESCALATED: "complaint.escalated",
  COMPLAINT_RESPONSE_ADDED: "complaint.response_added",

  // ── Montessori Lesson Tracking (Module J) ────────────────
  LESSON_RECORDED: "lesson.recorded",
  LESSON_UPDATED: "lesson.updated",
  WORK_CYCLE_SESSION_CREATED: "work_cycle.session_created",
  WORK_CYCLE_SESSION_UPDATED: "work_cycle.session_updated",

  // ── Work Cycle Integrity Tracking ────────────────────────
  WORK_CYCLE_SESSION_RECORDED: "work_cycle_integrity.session_recorded",
  WORK_CYCLE_SESSION_EDITED: "work_cycle_integrity.session_edited",
  WORK_CYCLE_SESSION_DELETED: "work_cycle_integrity.session_deleted",
  WORK_CYCLE_INTERRUPTION_ADDED: "work_cycle_integrity.interruption_added",
  WORK_CYCLE_INTERRUPTION_DELETED: "work_cycle_integrity.interruption_deleted",
  WORK_CYCLE_EXPORTED: "work_cycle_integrity.exported",

  // ── Immunisation (No Jab No Pay/Play) ────────────────────
  IMMUNISATION_RECORD_CREATED: "immunisation.record_created",
  IMMUNISATION_RECORD_UPDATED: "immunisation.record_updated",
  IMMUNISATION_RECORD_DELETED: "immunisation.record_deleted",
  IMMUNISATION_EXEMPTION_RECORDED: "immunisation.exemption_recorded",

  // ── CCS Session Reporting ──────────────────────────────────
  CCS_BUNDLE_CREATED: "ccs.bundle_created",
  CCS_BUNDLE_SUBMITTED: "ccs.bundle_submitted",
  CCS_REPORTS_GENERATED: "ccs.reports_generated",
  CCS_REPORT_UPDATED: "ccs.report_updated",
  CCS_BUNDLE_EXPORTED: "ccs.bundle_exported",

  // ── Emergency Drills (Reg 97) ──────────────────────────────
  DRILL_CREATED: "drill.created",
  DRILL_UPDATED: "drill.updated",
  DRILL_STARTED: "drill.started",
  DRILL_COMPLETED: "drill.completed",
  DRILL_CANCELLED: "drill.cancelled",
  DRILL_DEBRIEF_SUBMITTED: "drill.debrief_submitted",
  DRILL_PARTICIPANT_UPDATED: "drill.participant_updated",
  DRILL_FOLLOW_UP_COMPLETED: "drill.follow_up_completed",

  // ── MQ:AP Self-Assessment (Module K) ──────────────────────────
  MQAP_ASSESSMENT_UPDATED: "mqap.assessment_updated",
  MQAP_GOAL_CREATED: "mqap.goal_created",
  MQAP_GOAL_UPDATED: "mqap.goal_updated",
  MQAP_GOAL_ACHIEVED: "mqap.goal_achieved",
  MQAP_GOAL_DELETED: "mqap.goal_deleted",
  MQAP_EXPORTED: "mqap.exported",

  // ── Live Emergency Coordination (Module M) ──────────────────
  EMERGENCY_ACTIVATED: "emergency.activated",
  EMERGENCY_ALL_CLEAR: "emergency.all_clear",
  EMERGENCY_RESOLVED: "emergency.resolved",
  EMERGENCY_CANCELLED: "emergency.cancelled",
  EMERGENCY_ZONE_REPORTED: "emergency.zone_reported",
  EMERGENCY_STUDENT_ACCOUNTED: "emergency.student_accounted",
  EMERGENCY_STAFF_ACCOUNTED: "emergency.staff_accounted",
  EMERGENCY_NOTE_ADDED: "emergency.note_added",
  EMERGENCY_ANNOUNCEMENT_SENT: "emergency.announcement_sent",
  EMERGENCY_ZONE_CREATED: "emergency.zone_created",
  EMERGENCY_ZONE_UPDATED: "emergency.zone_updated",
  EMERGENCY_ZONE_DELETED: "emergency.zone_deleted",

  // ── Staff Rostering & Relief (Module N) ─────────────────────
  ROSTER_TEMPLATE_CREATED: "roster.template_created",
  ROSTER_TEMPLATE_UPDATED: "roster.template_updated",
  ROSTER_TEMPLATE_DELETED: "roster.template_deleted",
  ROSTER_WEEK_CREATED: "roster.week_created",
  ROSTER_WEEK_PUBLISHED: "roster.week_published",
  ROSTER_WEEK_LOCKED: "roster.week_locked",
  SHIFT_CREATED: "roster.shift_created",
  SHIFT_UPDATED: "roster.shift_updated",
  SHIFT_CANCELLED: "roster.shift_cancelled",
  LEAVE_REQUESTED: "roster.leave_requested",
  LEAVE_APPROVED: "roster.leave_approved",
  LEAVE_REJECTED: "roster.leave_rejected",
  LEAVE_WITHDRAWN: "roster.leave_withdrawn",
  SHIFT_SWAP_REQUESTED: "roster.swap_requested",
  SHIFT_SWAP_APPROVED: "roster.swap_approved",
  SHIFT_SWAP_REJECTED: "roster.swap_rejected",
  COVERAGE_REQUEST_CREATED: "roster.coverage_created",
  COVERAGE_REQUEST_ACCEPTED: "roster.coverage_accepted",
  COVERAGE_REQUEST_RESOLVED: "roster.coverage_resolved",

  // ── Timesheets & Payroll (Module 9) ─────────────────────────
  TIMESHEET_SUBMITTED: "payroll.timesheet_submitted",
  TIMESHEET_APPROVED: "payroll.timesheet_approved",
  TIMESHEET_REJECTED: "payroll.timesheet_rejected",
  TIMESHEET_SYNCED: "payroll.timesheet_synced",
  TIME_ENTRY_LOGGED: "payroll.time_entry_logged",
  TIME_ENTRY_DELETED: "payroll.time_entry_deleted",
  PAY_PERIOD_CREATED: "payroll.pay_period_created",
  PAY_PERIOD_LOCKED: "payroll.pay_period_locked",
  PAY_PERIOD_PROCESSED: "payroll.pay_period_processed",
  PAYROLL_SETTINGS_UPDATED: "payroll.settings_updated",
  EMPLOYEE_MAPPING_CREATED: "payroll.employee_mapping_created",
  EMPLOYEE_MAPPING_DELETED: "payroll.employee_mapping_deleted",

  // ── Individual Learning Plans (Module Q) ─────────────────
  ILP_PLAN_CREATED: "ilp.plan_created",
  ILP_PLAN_UPDATED: "ilp.plan_updated",
  ILP_PLAN_ACTIVATED: "ilp.plan_activated",
  ILP_PLAN_ARCHIVED: "ilp.plan_archived",
  ILP_PLAN_STATUS_CHANGED: "ilp.plan_status_changed",
  ILP_GOAL_CREATED: "ilp.goal_created",
  ILP_GOAL_UPDATED: "ilp.goal_updated",
  ILP_GOAL_ACHIEVED: "ilp.goal_achieved",
  ILP_GOAL_DISCONTINUED: "ilp.goal_discontinued",
  ILP_GOAL_DELETED: "ilp.goal_deleted",
  ILP_STRATEGY_CREATED: "ilp.strategy_created",
  ILP_STRATEGY_UPDATED: "ilp.strategy_updated",
  ILP_STRATEGY_DELETED: "ilp.strategy_deleted",
  ILP_REVIEW_CREATED: "ilp.review_created",
  ILP_COLLABORATOR_ADDED: "ilp.collaborator_added",
  ILP_COLLABORATOR_REMOVED: "ilp.collaborator_removed",
  ILP_EVIDENCE_ATTACHED: "ilp.evidence_attached",
  ILP_EVIDENCE_REMOVED: "ilp.evidence_removed",
  ILP_CONSENT_RECORDED: "ilp.consent_recorded",
  ILP_PLAN_EXPORTED: "ilp.plan_exported",
  TRANSITION_STATEMENT_CREATED: "transition.statement_created",
  TRANSITION_STATEMENT_UPDATED: "transition.statement_updated",
  TRANSITION_SHARED_WITH_FAMILY: "transition.shared_with_family",
  TRANSITION_SHARED_WITH_SCHOOL: "transition.shared_with_school",
  TRANSITION_FAMILY_APPROVED: "transition.family_approved",

  // ── Daily Care Log (Reg 162) ────────────────────────────
  DAILY_CARE_LOG_CREATED: "daily_care.log_created",
  DAILY_CARE_LOG_SHARED: "daily_care.log_shared",
  DAILY_CARE_ENTRY_CREATED: "daily_care.entry_created",
  DAILY_CARE_ENTRY_UPDATED: "daily_care.entry_updated",
  DAILY_CARE_ENTRY_DELETED: "daily_care.entry_deleted",
  DAILY_CARE_SLEEP_CHECK_RECORDED: "daily_care.sleep_check_recorded",
  DAILY_CARE_FIELD_CONFIG_UPDATED: "daily_care.field_config_updated",

  // ── Wellbeing & Pastoral Care (Module P) ─────────────────
  WELLBEING_FLAG_CREATED: "wellbeing.flag_created",
  WELLBEING_FLAG_UPDATED: "wellbeing.flag_updated",
  WELLBEING_FLAG_ASSIGNED: "wellbeing.flag_assigned",
  WELLBEING_FLAG_RESOLVED: "wellbeing.flag_resolved",
  WELLBEING_FLAG_DELETED: "wellbeing.flag_deleted",
  REFERRAL_CREATED: "wellbeing.referral_created",
  REFERRAL_UPDATED: "wellbeing.referral_updated",
  REFERRAL_STATUS_CHANGED: "wellbeing.referral_status_changed",
  REFERRAL_DELETED: "wellbeing.referral_deleted",
  CASE_NOTE_VIEWED: "wellbeing.case_note_viewed",
  CASE_NOTE_CREATED: "wellbeing.case_note_created",
  CASE_NOTE_UPDATED: "wellbeing.case_note_updated",
  CASE_NOTE_DELETED: "wellbeing.case_note_deleted",
  CHECKIN_SCHEDULED: "wellbeing.checkin_scheduled",
  CHECKIN_COMPLETED: "wellbeing.checkin_completed",
  CHECKIN_RESCHEDULED: "wellbeing.checkin_rescheduled",
  CHECKIN_DELETED: "wellbeing.checkin_deleted",
  PASTORAL_RECORD_CREATED: "wellbeing.pastoral_record_created",
  PASTORAL_RECORD_UPDATED: "wellbeing.pastoral_record_updated",
  PASTORAL_RECORD_DELETED: "wellbeing.pastoral_record_deleted",

  // ── School Photos & ID Cards (Module R) ──────────────────
  PHOTO_SESSION_CREATED: "photo_session.created",
  PHOTO_SESSION_UPDATED: "photo_session.updated",
  PHOTO_SESSION_CLOSED: "photo_session.closed",
  PHOTO_SESSION_ARCHIVED: "photo_session.archived",
  PHOTO_UPLOADED: "photo.uploaded",
  PHOTO_BULK_UPLOADED: "photo.bulk_uploaded",
  PHOTO_SET_CURRENT: "photo.set_current",
  PHOTO_DELETED: "photo.deleted",
  PHOTO_CROPPED: "photo.cropped",
  ID_CARDS_GENERATED: "id_cards.generated",
  ID_CARD_TEMPLATE_SAVED: "id_card_template.saved",

  // ── NCCD Disability Register ──────────────────────────────
  NCCD_ENTRY_CREATED: "nccd.entry_created",
  NCCD_ENTRY_UPDATED: "nccd.entry_updated",
  NCCD_ENTRY_DELETED: "nccd.entry_deleted",
  NCCD_EVIDENCE_ADDED: "nccd.evidence_added",
  NCCD_EVIDENCE_REMOVED: "nccd.evidence_removed",
  NCCD_COLLECTION_SUBMITTED: "nccd.collection_submitted",
  NCCD_COLLECTION_EXPORTED: "nccd.collection_exported",

  // ── Sign-In/Out Kiosk (Late Arrival / Early Departure) ───
  SIGN_IN_OUT_LATE_ARRIVAL: "sign_in_out.late_arrival",
  SIGN_IN_OUT_EARLY_DEPARTURE: "sign_in_out.early_departure",
  SIGN_IN_OUT_DELETED: "sign_in_out.deleted",
  SIGN_IN_OUT_EXPORTED: "sign_in_out.exported",

  // ── Sick Bay Visits Log ────────────────────────────────────
  SICK_BAY_VISIT_CREATED: "sick_bay.visit_created",
  SICK_BAY_VISIT_UPDATED: "sick_bay.visit_updated",
  SICK_BAY_VISIT_RESOLVED: "sick_bay.visit_resolved",
  SICK_BAY_VISIT_REFERRED: "sick_bay.visit_referred",
  SICK_BAY_VISIT_DELETED: "sick_bay.visit_deleted",
  SICK_BAY_PARENT_NOTIFIED: "sick_bay.parent_notified",

  // ── Visitor Sign-In Log (Module U) ─────────────────────────
  VISITOR_SIGNED_IN: "visitor_log.signed_in",
  VISITOR_SIGNED_OUT: "visitor_log.signed_out",
  VISITOR_RECORD_UPDATED: "visitor_log.record_updated",
  VISITOR_RECORD_DELETED: "visitor_log.record_deleted",
  VISITOR_LOG_EXPORTED: "visitor_log.exported",

  // ── Contractor Sign-In Log (Module U) ──────────────────────
  CONTRACTOR_SIGNED_IN: "contractor_log.signed_in",
  CONTRACTOR_SIGNED_OUT: "contractor_log.signed_out",
  CONTRACTOR_RECORD_UPDATED: "contractor_log.record_updated",
  CONTRACTOR_RECORD_DELETED: "contractor_log.record_deleted",
  CONTRACTOR_LOG_EXPORTED: "contractor_log.exported",

  // ── Three-Period Lessons (Module T) ───────────────────────
  THREE_PERIOD_LESSON_CREATED: "three_period.lesson_created",
  THREE_PERIOD_LESSON_UPDATED: "three_period.lesson_updated",
  THREE_PERIOD_LESSON_PERIOD_ADVANCED: "three_period.period_advanced",
  THREE_PERIOD_LESSON_COMPLETE: "three_period.lesson_complete",
  THREE_PERIOD_LESSON_DELETED: "three_period.lesson_deleted",

  // ── Sensitive Periods (Module T) ──────────────────────────
  SENSITIVE_PERIOD_RECORDED: "sensitive_period.recorded",
  SENSITIVE_PERIOD_UPDATED: "sensitive_period.updated",
  SENSITIVE_PERIOD_CLOSED: "sensitive_period.closed",
  SENSITIVE_PERIOD_DELETED: "sensitive_period.deleted",
  SENSITIVE_PERIOD_MATERIAL_LINKED: "sensitive_period.material_linked",
  SENSITIVE_PERIOD_MATERIAL_UNLINKED: "sensitive_period.material_unlinked",
  SENSITIVE_PERIOD_OBS_TAGGED: "sensitive_period.observation_tagged",

  // ── End-of-Day Dismissal & Pickup (Module V) ───────────────
  // Safety-critical: changes to who can collect a child are "high"
  BUS_ROUTE_CREATED: "dismissal.bus_route_created",
  BUS_ROUTE_UPDATED: "dismissal.bus_route_updated",
  BUS_ROUTE_DELETED: "dismissal.bus_route_deleted",
  PICKUP_AUTH_CREATED: "dismissal.pickup_auth_created",
  PICKUP_AUTH_UPDATED: "dismissal.pickup_auth_updated",
  PICKUP_AUTH_REVOKED: "dismissal.pickup_auth_revoked",
  DISMISSAL_METHOD_SET: "dismissal.method_set",
  DISMISSAL_RECORDS_SEEDED: "dismissal.records_seeded",
  DISMISSAL_CONFIRMED: "dismissal.confirmed",
  DISMISSAL_EXCEPTION_FLAGGED: "dismissal.exception_flagged",
  DISMISSAL_RECORD_UPDATED: "dismissal.record_updated",
  DISMISSAL_EXPORTED: "dismissal.exported",

  // ── Chronic Absence Monitoring (Module W) ───────────────────
  CHRONIC_ABSENCE_FLAG_CREATED: "chronic_absence.flag_created",
  CHRONIC_ABSENCE_FLAG_UPDATED: "chronic_absence.flag_updated",
  CHRONIC_ABSENCE_FLAG_RESOLVED: "chronic_absence.flag_resolved",
  CHRONIC_ABSENCE_FLAG_DISMISSED: "chronic_absence.flag_dismissed",
  CHRONIC_ABSENCE_FOLLOW_UP_LOGGED: "chronic_absence.follow_up_logged",
  CHRONIC_ABSENCE_CONFIG_UPDATED: "chronic_absence.config_updated",
  CHRONIC_ABSENCE_EXPORTED: "chronic_absence.exported",

  // ── Parent-Teacher Interview Scheduling (Module X) ─────────
  INTERVIEW_SESSION_CREATED: "interview.session_created",
  INTERVIEW_SESSION_UPDATED: "interview.session_updated",
  INTERVIEW_SESSION_OPENED: "interview.session_opened",
  INTERVIEW_SESSION_CLOSED: "interview.session_closed",
  INTERVIEW_SESSION_ARCHIVED: "interview.session_archived",
  INTERVIEW_SESSION_DELETED: "interview.session_deleted",
  INTERVIEW_SLOTS_GENERATED: "interview.slots_generated",
  INTERVIEW_SLOT_BLOCKED: "interview.slot_blocked",
  INTERVIEW_SLOT_UNBLOCKED: "interview.slot_unblocked",
  INTERVIEW_BOOKED: "interview.booked",
  INTERVIEW_CANCELLED: "interview.cancelled",
  INTERVIEW_OUTCOME_RECORDED: "interview.outcome_recorded",
  INTERVIEW_REMINDER_SENT: "interview.reminder_sent",

  // ── SMS Gateway ───────────────────────────────────────────
  SMS_GATEWAY_CONFIG_UPDATED: "sms_gateway.config_updated",
  SMS_GATEWAY_ENABLED: "sms_gateway.enabled",
  SMS_GATEWAY_DISABLED: "sms_gateway.disabled",
  SMS_SENT: "sms.sent",
  SMS_BROADCAST_SENT: "sms.broadcast_sent",
  SMS_DELIVERY_UPDATED: "sms.delivery_updated",
  SMS_OPT_OUT_ADDED: "sms.opt_out_added",
  SMS_OPT_OUT_REMOVED: "sms.opt_out_removed",
  SMS_EXPORTED: "sms.exported",

  // ── Push Notification Dispatch ─────────────────────────────
  PUSH_DISPATCH_CREATED: "push_notification.dispatch_created",
  PUSH_DISPATCH_UPDATED: "push_notification.dispatch_updated",
  PUSH_DISPATCH_SENT: "push_notification.dispatch_sent",
  PUSH_DISPATCH_SCHEDULED: "push_notification.dispatch_scheduled",
  PUSH_DISPATCH_CANCELLED: "push_notification.dispatch_cancelled",
  PUSH_DISPATCH_DELETED: "push_notification.dispatch_deleted",
  PUSH_TOPIC_PREF_UPDATED: "push_notification.topic_pref_updated",
  PUSH_ANALYTICS_EXPORTED: "push_notification.analytics_exported",

  // ── Volunteer Coordination (Module Y) ──────────────────────
  VOLUNTEER_CREATED: "volunteer.created",
  VOLUNTEER_UPDATED: "volunteer.updated",
  VOLUNTEER_DEACTIVATED: "volunteer.deactivated",
  VOLUNTEER_WWCC_VERIFIED: "volunteer.wwcc_verified",
  VOLUNTEER_ASSIGNED: "volunteer.assigned",
  VOLUNTEER_ASSIGNMENT_UPDATED: "volunteer.assignment_updated",
  VOLUNTEER_ASSIGNMENT_CANCELLED: "volunteer.assignment_cancelled",

  // ── Material / Shelf Inventory (Module Z) ──────────────────
  MATERIAL_INVENTORY_ITEM_CREATED: "material_inventory.item_created",
  MATERIAL_INVENTORY_ITEM_UPDATED: "material_inventory.item_updated",
  MATERIAL_INVENTORY_ITEM_DELETED: "material_inventory.item_deleted",
  MATERIAL_INVENTORY_ITEM_RETIRED: "material_inventory.item_retired",
  MATERIAL_INVENTORY_CONDITION_UPDATED: "material_inventory.condition_updated",
  MATERIAL_INVENTORY_STATUS_UPDATED: "material_inventory.status_updated",
  MATERIAL_SHELF_LOCATION_CREATED: "material_inventory.location_created",
  MATERIAL_SHELF_LOCATION_UPDATED: "material_inventory.location_updated",
  MATERIAL_SHELF_LOCATION_DELETED: "material_inventory.location_deleted",
  MATERIAL_INVENTORY_EXPORTED: "material_inventory.exported",

  // ── NAPLAN Coordination ─────────────────────────────────────────────
  NAPLAN_WINDOW_CREATED: "naplan.window_created",
  NAPLAN_WINDOW_UPDATED: "naplan.window_updated",
  NAPLAN_WINDOW_STATUS_SET: "naplan.window_status_set",
  NAPLAN_WINDOW_DELETED: "naplan.window_deleted",
  NAPLAN_COHORT_GENERATED: "naplan.cohort_generated",
  NAPLAN_COHORT_ENTRY_ADDED: "naplan.cohort_entry_added",
  NAPLAN_COHORT_ENTRY_REMOVED: "naplan.cohort_entry_removed",
  NAPLAN_OPT_OUT_RECORDED: "naplan.opt_out_recorded",
  NAPLAN_OPT_OUT_REMOVED: "naplan.opt_out_removed",
  NAPLAN_RESULT_RECORDED: "naplan.result_recorded",
  NAPLAN_RESULTS_EXPORTED: "naplan.results_exported",

  // ── Normalization Indicators ──────────────────────────────
  NORMALIZATION_OBSERVATION_CREATED: "normalization.observation_created",
  NORMALIZATION_OBSERVATION_UPDATED: "normalization.observation_updated",
  NORMALIZATION_OBSERVATION_DELETED: "normalization.observation_deleted",
  NORMALIZATION_GOAL_CREATED: "normalization.goal_created",
  NORMALIZATION_GOAL_UPDATED: "normalization.goal_updated",
  NORMALIZATION_GOAL_ACHIEVED: "normalization.goal_achieved",
  NORMALIZATION_GOAL_DELETED: "normalization.goal_deleted",

  // ── Unexplained Absence Follow-up ─────────────────────────
  ABSENCE_ALERT_GENERATED: "absence_followup.alert_generated",
  ABSENCE_ALERT_NOTIFIED: "absence_followup.notification_sent",
  ABSENCE_ALERT_EXPLAINED: "absence_followup.explained",
  ABSENCE_ALERT_ESCALATED: "absence_followup.escalated",
  ABSENCE_ALERT_DISMISSED: "absence_followup.dismissed",
  ABSENCE_FOLLOWUP_CONFIG_UPDATED: "absence_followup.config_updated",
  ABSENCE_FOLLOWUP_EXPORTED: "absence_followup.exported",

  // ── School Events & RSVPs (Module 12) ──────────────────────
  EVENT_CREATED: "school_event.created",
  EVENT_UPDATED: "school_event.updated",
  EVENT_DELETED: "school_event.deleted",
  EVENT_RSVP_SUBMITTED: "school_event.rsvp_submitted",

  // ── Direct Debit / Recurring Billing ───────────────────────
  RECURRING_BILLING_SETUP_CREATED: "recurring_billing.setup_created",
  RECURRING_BILLING_SETUP_UPDATED: "recurring_billing.setup_updated",
  RECURRING_BILLING_SETUP_CANCELLED: "recurring_billing.setup_cancelled",
  RECURRING_BILLING_SCHEDULE_CREATED: "recurring_billing.schedule_created",
  RECURRING_BILLING_SCHEDULE_UPDATED: "recurring_billing.schedule_updated",
  RECURRING_BILLING_SCHEDULE_DELETED: "recurring_billing.schedule_deleted",
  BILLING_PAYMENT_ATTEMPT_CREATED: "recurring_billing.payment_attempt_created",
  BILLING_PAYMENT_ATTEMPT_UPDATED: "recurring_billing.payment_attempt_updated",
  BILLING_FAILURE_CREATED: "recurring_billing.failure_created",
  BILLING_FAILURE_RESOLVED: "recurring_billing.failure_resolved",

  // ── Prepared Environment Planner ──────────────────────────
  ENVIRONMENT_PLAN_CREATED: "environment_planner.plan_created",
  ENVIRONMENT_PLAN_UPDATED: "environment_planner.plan_updated",
  ENVIRONMENT_PLAN_DELETED: "environment_planner.plan_deleted",
  ENVIRONMENT_SLOT_UPDATED: "environment_planner.slot_updated",
  ROTATION_SCHEDULE_CREATED: "environment_planner.rotation_created",
  ROTATION_SCHEDULE_UPDATED: "environment_planner.rotation_updated",
  ROTATION_SCHEDULE_COMPLETED: "environment_planner.rotation_completed",
  ROTATION_SCHEDULE_CANCELLED: "environment_planner.rotation_cancelled",

  // ── Montessori Accreditation Checklist ─────────────────────
  ACCREDITATION_CYCLE_CREATED: "accreditation.cycle_created",
  ACCREDITATION_CYCLE_UPDATED: "accreditation.cycle_updated",
  ACCREDITATION_CYCLE_DELETED: "accreditation.cycle_deleted",
  ACCREDITATION_STATUS_CHANGED: "accreditation.status_changed",
  ACCREDITATION_ASSESSMENT_SAVED: "accreditation.assessment_saved",
  ACCREDITATION_EVIDENCE_ADDED: "accreditation.evidence_added",
  ACCREDITATION_EVIDENCE_DELETED: "accreditation.evidence_deleted",
  ACCREDITATION_EXPORTED: "accreditation.exported",

  // ── Previous School Records ──────────────────────────────
  PREVIOUS_SCHOOL_RECORD_CREATED: "previous_school.record_created",
  PREVIOUS_SCHOOL_RECORD_UPDATED: "previous_school.record_updated",
  PREVIOUS_SCHOOL_RECORD_DELETED: "previous_school.record_deleted",
  PREVIOUS_SCHOOL_RECORDS_EXPORTED: "previous_school.records_exported",

  // ── ACARA Attendance Reporting ──────────────────────────────
  ACARA_REPORT_PERIOD_CREATED: "acara.report_period_created",
  ACARA_REPORT_PERIOD_UPDATED: "acara.report_period_updated",
  ACARA_REPORT_PERIOD_DELETED: "acara.report_period_deleted",
  ACARA_REPORT_STATUS_CHANGED: "acara.report_status_changed",
  ACARA_RECORDS_SYNCED: "acara.records_synced",
  ACARA_STUDENT_RECORD_OVERRIDDEN: "acara.student_record_overridden",
  ACARA_REPORT_EXPORTED: "acara.report_exported",
  ACARA_STUDENT_PROFILE_EXPORTED: "acara.student_profile_exported",

  // ── Montessori Literacy Hub ──────────────────────────────
  HUB_ARTICLE_CREATED: "hub.article_created",
  HUB_ARTICLE_UPDATED: "hub.article_updated",
  HUB_ARTICLE_DELETED: "hub.article_deleted",
  HUB_ARTICLE_BOOKMARKED: "hub.article_bookmarked",
  HUB_ARTICLE_UNBOOKMARKED: "hub.article_unbookmarked",
  HUB_ARTICLE_FEEDBACK_SUBMITTED: "hub.article_feedback_submitted",

  // ── Cosmic Education Unit Planning ──────────────────────────
  COSMIC_GREAT_LESSON_CREATED: "cosmic.great_lesson_created",
  COSMIC_UNIT_CREATED: "cosmic.unit_created",
  COSMIC_UNIT_UPDATED: "cosmic.unit_updated",
  COSMIC_UNIT_DELETED: "cosmic.unit_deleted",
  COSMIC_STUDY_CREATED: "cosmic.study_created",
  COSMIC_STUDY_UPDATED: "cosmic.study_updated",
  COSMIC_STUDY_DELETED: "cosmic.study_deleted",
  COSMIC_PARTICIPANTS_UPDATED: "cosmic.participants_updated",
  COSMIC_STUDY_RECORD_UPDATED: "cosmic.study_record_updated",

  // ── Debt Management ──────────────────────────────────────────
  DEBT_STAGE_CREATED: "debt.stage_created",
  DEBT_STAGE_ADVANCED: "debt.stage_advanced",
  DEBT_ESCALATED: "debt.escalated",
  DEBT_REFERRED: "debt.referred",
  DEBT_RESOLVED: "debt.resolved",
  DEBT_REMINDER_SENT: "debt.reminder_sent",
  DEBT_REMINDER_MANUAL: "debt.reminder_manual",
  DEBT_PLAN_CREATED: "debt.plan_created",
  DEBT_PLAN_UPDATED: "debt.plan_updated",
  DEBT_PLAN_CANCELLED: "debt.plan_cancelled",
  DEBT_PLAN_DEFAULTED: "debt.plan_defaulted",
  DEBT_PLAN_COMPLETED: "debt.plan_completed",
  DEBT_INSTALLMENT_PAID: "debt.installment_paid",
  DEBT_WRITE_OFF_REQUESTED: "debt.write_off_requested",
  DEBT_WRITE_OFF_APPROVED: "debt.write_off_approved",
  DEBT_EXPORTED: "debt.exported",

  // ── Grant Tracking ──────────────────────────────────────────
  GRANT_CREATED: "grant.created",
  GRANT_UPDATED: "grant.updated",
  GRANT_STATUS_CHANGED: "grant.status_changed",
  GRANT_DELETED: "grant.deleted",
  GRANT_MILESTONE_CREATED: "grant.milestone_created",
  GRANT_MILESTONE_UPDATED: "grant.milestone_updated",
  GRANT_MILESTONE_COMPLETED: "grant.milestone_completed",
  GRANT_MILESTONE_DELETED: "grant.milestone_deleted",
  GRANT_EXPENDITURE_CREATED: "grant.expenditure_created",
  GRANT_EXPENDITURE_UPDATED: "grant.expenditure_updated",
  GRANT_EXPENDITURE_DELETED: "grant.expenditure_deleted",
  GRANT_DOCUMENT_UPLOADED: "grant.document_uploaded",
  GRANT_DOCUMENT_DELETED: "grant.document_deleted",
  GRANT_EXPORTED: "grant.exported",

  // ── Fee Notice Comms ──────────────────────────────────────────
  FEE_NOTICE_QUEUED: "fee_notice.queued",
  FEE_NOTICE_APPROVED: "fee_notice.approved",
  FEE_NOTICE_SENT: "fee_notice.sent",
  FEE_NOTICE_FAILED: "fee_notice.failed",
  FEE_NOTICE_CONFIG_UPDATED: "fee_notice.config_updated",

  // ── Newsletter ──────────────────────────────────────────────────
  NEWSLETTER_CREATED: "newsletter.created",
  NEWSLETTER_UPDATED: "newsletter.updated",
  NEWSLETTER_PUBLISHED: "newsletter.published",
  NEWSLETTER_SCHEDULED: "newsletter.scheduled",
  NEWSLETTER_SENT: "newsletter.sent",
  NEWSLETTER_CANCELLED: "newsletter.cancelled",
  NEWSLETTER_DELETED: "newsletter.deleted",
  NEWSLETTER_TEMPLATE_CREATED: "newsletter.template_created",
  NEWSLETTER_TEMPLATE_UPDATED: "newsletter.template_updated",
  NEWSLETTER_TEMPLATE_DELETED: "newsletter.template_deleted",

  // ── Tuckshop ─────────────────────────────────────────────────────
  TUCKSHOP_SUPPLIER_CREATED: "tuckshop.supplier_created",
  TUCKSHOP_SUPPLIER_UPDATED: "tuckshop.supplier_updated",
  TUCKSHOP_SUPPLIER_DELETED: "tuckshop.supplier_deleted",
  TUCKSHOP_MENU_ITEM_CREATED: "tuckshop.menu_item_created",
  TUCKSHOP_MENU_ITEM_UPDATED: "tuckshop.menu_item_updated",
  TUCKSHOP_MENU_ITEM_DELETED: "tuckshop.menu_item_deleted",
  TUCKSHOP_ORDER_PLACED: "tuckshop.order_placed",
  TUCKSHOP_ORDER_CANCELLED: "tuckshop.order_cancelled",
  TUCKSHOP_ORDER_COLLECTED: "tuckshop.order_collected",
  TUCKSHOP_DELIVERY_ORDERED: "tuckshop.delivery_ordered",
  TUCKSHOP_DELIVERY_RECEIVED: "tuckshop.delivery_received",
  TUCKSHOP_DELIVERY_FINALIZED: "tuckshop.delivery_finalized",

  // ── Tenant Offboarding (Prompt 46) ────────────────────────
  TENANT_OFFBOARD_INITIATED: "tenant.offboard_initiated",
  TENANT_OFFBOARD_CANCELLED: "tenant.offboard_cancelled",
  TENANT_OFFBOARD_PHASE_ADVANCED: "tenant.offboard_phase_advanced",
  TENANT_PURGED: "tenant.purged",

  // ── Soft-Delete Attribution (Prompt 47) ───────────────────
  STUDENT_DELETED_WITH_REASON: "student.deleted_with_reason",
  ENROLLMENT_DELETED_WITH_REASON: "enrollment.deleted_with_reason",
  INCIDENT_DELETED_WITH_REASON: "incident.deleted_with_reason",
  MEDICAL_DELETED_WITH_REASON: "medical.deleted_with_reason",
  ILP_DELETED_WITH_REASON: "ilp.deleted_with_reason",

  // ── Data Corrections APP 13 (Prompt 48) ───────────────────
  DATA_CORRECTION_REQUESTED: "data_correction.requested",
  DATA_CORRECTION_APPROVED: "data_correction.approved",
  DATA_CORRECTION_REJECTED: "data_correction.rejected",
  DATA_CORRECTION_APPLIED: "data_correction.applied",

  // ── Data Exports (Prompt 49) ──────────────────────────────
  STUDENT_DATA_EXPORTED_CSV: "student.data_exported_csv",
  STUDENT_DATA_EXPORTED_JSON: "student.data_exported_json",
  CLASS_DATA_EXPORTED_CSV: "class.data_exported_csv",
  ATTENDANCE_DATA_EXPORTED_CSV: "attendance.data_exported_csv",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

// ============================================================
// Sensitivity Levels
// ============================================================
// WHY: Some actions are more sensitive than others. This lets
// the admin UI highlight high-sensitivity events and enables
// future features like real-time alerts for critical actions.
// ============================================================

export type AuditSensitivity = "low" | "medium" | "high" | "critical";

const ACTION_SENSITIVITY: Partial<Record<AuditAction, AuditSensitivity>> = {
  // Critical: custody, medical, user management
  [AuditActions.CUSTODY_VIEWED]: "high",
  [AuditActions.CUSTODY_CREATED]: "critical",
  [AuditActions.CUSTODY_UPDATED]: "critical",
  [AuditActions.CUSTODY_DELETED]: "critical",
  [AuditActions.MEDICAL_CREATED]: "high",
  [AuditActions.MEDICAL_UPDATED]: "high",
  [AuditActions.MEDICAL_DELETED]: "high",
  [AuditActions.MEDICAL_VIEWED]: "medium",
  [AuditActions.STUDENT_VIEWED]: "low",
  [AuditActions.USER_INVITED]: "high",
  [AuditActions.USER_ROLE_CHANGED]: "critical",
  [AuditActions.USER_SUSPENDED]: "critical",
  [AuditActions.USER_REMOVED]: "critical",
  [AuditActions.ROLE_CREATED]: "high",
  [AuditActions.ROLE_UPDATED]: "high",
  [AuditActions.ROLE_DELETED]: "high",
  [AuditActions.COMPLIANCE_RECORD_ADDED]: "medium",
  [AuditActions.COMPLIANCE_RECORD_UPDATED]: "medium",
  [AuditActions.COMPLIANCE_RECORD_DELETED]: "high",
  [AuditActions.SETTINGS_UPDATED]: "high",
  [AuditActions.AI_SENSITIVE_DATA_TOGGLED]: "critical",
  [AuditActions.PICKUP_AUTHORIZED]: "high",
  [AuditActions.PICKUP_REVOKED]: "high",
  [AuditActions.CONSENT_REVOKED]: "high",
  [AuditActions.STUDENT_EXPORTED]: "high",
  [AuditActions.REPORT_EXPORTED]: "medium",

  // Medium: enrollment, billing
  [AuditActions.APPLICATION_APPROVED]: "medium",
  [AuditActions.APPLICATION_REJECTED]: "medium",
  [AuditActions.INVITATION_ACCEPTED]: "medium",
  // Billing sensitivity
  [AuditActions.FEE_SCHEDULE_CREATED]: "medium",
  [AuditActions.FEE_SCHEDULE_UPDATED]: "medium",
  [AuditActions.FEE_SCHEDULE_DELETED]: "high",
  [AuditActions.INVOICE_CREATED]: "medium",
  [AuditActions.INVOICE_UPDATED]: "medium",
  [AuditActions.INVOICE_SENT]: "medium",
  [AuditActions.INVOICE_VOIDED]: "high",
  [AuditActions.PAYMENT_RECEIVED]: "high",
  [AuditActions.PAYMENT_MANUAL_RECORDED]: "high",
  [AuditActions.REFUND_ISSUED]: "high",
  // Debt Management
  [AuditActions.DEBT_STAGE_CREATED]: "medium",
  [AuditActions.DEBT_STAGE_ADVANCED]: "medium",
  [AuditActions.DEBT_ESCALATED]: "high",
  [AuditActions.DEBT_REFERRED]: "high",
  [AuditActions.DEBT_RESOLVED]: "medium",
  [AuditActions.DEBT_REMINDER_SENT]: "medium",
  [AuditActions.DEBT_REMINDER_MANUAL]: "medium",
  [AuditActions.DEBT_PLAN_CREATED]: "high",
  [AuditActions.DEBT_PLAN_UPDATED]: "medium",
  [AuditActions.DEBT_PLAN_CANCELLED]: "high",
  [AuditActions.DEBT_PLAN_DEFAULTED]: "high",
  [AuditActions.DEBT_PLAN_COMPLETED]: "medium",
  [AuditActions.DEBT_INSTALLMENT_PAID]: "medium",
  [AuditActions.DEBT_WRITE_OFF_REQUESTED]: "high",
  [AuditActions.DEBT_WRITE_OFF_APPROVED]: "critical",
  [AuditActions.DEBT_EXPORTED]: "medium",
  [AuditActions.IMPORT_STARTED]: "medium",
  [AuditActions.IMPORT_ROLLED_BACK]: "high",

  // Auth
  [AuditActions.LOGIN_FAILED]: "medium",
  [AuditActions.ACCOUNT_LOCKED]: "critical",
  [AuditActions.LOGIN_SUCCESS]: "low",
  [AuditActions.TENANT_SWITCHED]: "low",

  // Incidents - Reg 87 mandatory records
  [AuditActions.INCIDENT_CREATED]: "high",
  [AuditActions.INCIDENT_UPDATED]: "high",
  [AuditActions.INCIDENT_PARENT_NOTIFIED]: "high",
  [AuditActions.INCIDENT_REGULATOR_NOTIFIED]: "critical",
  [AuditActions.INCIDENT_CLOSED]: "medium",

  // Medication - Reg 93/94 mandatory records
  [AuditActions.MEDICATION_PLAN_CREATED]: "high",
  [AuditActions.MEDICATION_PLAN_UPDATED]: "high",
  [AuditActions.MEDICATION_AUTHORISATION_CREATED]: "high",
  [AuditActions.MEDICATION_ADMINISTERED]: "critical",

  // Staff Compliance - Reg 136/145/146
  [AuditActions.COMPLIANCE_PROFILE_UPDATED]: "medium",
  [AuditActions.CERTIFICATE_ADDED]: "medium",
  [AuditActions.CERTIFICATE_UPDATED]: "medium",
  [AuditActions.CERTIFICATE_DELETED]: "high",
  [AuditActions.WWCC_VERIFIED]: "high",
  [AuditActions.WORKER_REGISTER_EXPORTED]: "high",
  [AuditActions.EXPIRY_ALERTS_SENT]: "medium",
  [AuditActions.CERTIFICATES_BULK_IMPORTED]: "high",

  // Ratio Monitoring - Reg 123
  [AuditActions.FLOOR_SIGN_IN]: "low",
  [AuditActions.FLOOR_SIGN_OUT]: "low",
  [AuditActions.RATIO_BREACH_DETECTED]: "critical",
  [AuditActions.RATIO_BREACH_ACKNOWLEDGED]: "high",
  [AuditActions.RATIO_BREACH_ALERT_SENT]: "critical",

  // QIP Builder - Reg 55
  [AuditActions.SERVICE_PHILOSOPHY_PUBLISHED]: "high",
  [AuditActions.QIP_ASSESSMENT_UPDATED]: "medium",
  [AuditActions.QIP_GOAL_CREATED]: "medium",
  [AuditActions.QIP_GOAL_UPDATED]: "medium",
  [AuditActions.QIP_GOAL_ACHIEVED]: "medium",
  [AuditActions.QIP_EVIDENCE_ATTACHED]: "low",
  [AuditActions.QIP_EVIDENCE_REMOVED]: "medium",
  [AuditActions.QIP_EXPORTED]: "high",

  // Immunisation - No Jab No Pay/Play
  [AuditActions.IMMUNISATION_RECORD_CREATED]: "high",
  [AuditActions.IMMUNISATION_RECORD_UPDATED]: "high",
  [AuditActions.IMMUNISATION_RECORD_DELETED]: "high",
  [AuditActions.IMMUNISATION_EXEMPTION_RECORDED]: "high",

  // CCS Session Reporting
  [AuditActions.CCS_BUNDLE_CREATED]: "medium",
  [AuditActions.CCS_BUNDLE_SUBMITTED]: "high",
  [AuditActions.CCS_REPORTS_GENERATED]: "medium",
  [AuditActions.CCS_REPORT_UPDATED]: "medium",
  [AuditActions.CCS_BUNDLE_EXPORTED]: "high",

  // Emergency Drills - Reg 97
  [AuditActions.DRILL_CREATED]: "medium",
  [AuditActions.DRILL_UPDATED]: "medium",
  [AuditActions.DRILL_STARTED]: "high",
  [AuditActions.DRILL_COMPLETED]: "high",
  [AuditActions.DRILL_CANCELLED]: "medium",
  [AuditActions.DRILL_DEBRIEF_SUBMITTED]: "medium",
  [AuditActions.DRILL_PARTICIPANT_UPDATED]: "low",
  [AuditActions.DRILL_FOLLOW_UP_COMPLETED]: "medium",

  // MQ:AP Self-Assessment - Module K
  [AuditActions.MQAP_ASSESSMENT_UPDATED]: "medium",
  [AuditActions.MQAP_GOAL_CREATED]: "medium",
  [AuditActions.MQAP_GOAL_UPDATED]: "medium",
  [AuditActions.MQAP_GOAL_ACHIEVED]: "medium",
  [AuditActions.MQAP_GOAL_DELETED]: "high",
  [AuditActions.MQAP_EXPORTED]: "high",

  // Live Emergency Coordination - Module M
  [AuditActions.EMERGENCY_ACTIVATED]: "critical",
  [AuditActions.EMERGENCY_ALL_CLEAR]: "critical",
  [AuditActions.EMERGENCY_RESOLVED]: "high",
  [AuditActions.EMERGENCY_CANCELLED]: "high",
  [AuditActions.EMERGENCY_ZONE_REPORTED]: "medium",
  [AuditActions.EMERGENCY_STUDENT_ACCOUNTED]: "low",
  [AuditActions.EMERGENCY_STAFF_ACCOUNTED]: "low",
  [AuditActions.EMERGENCY_NOTE_ADDED]: "medium",
  [AuditActions.EMERGENCY_ANNOUNCEMENT_SENT]: "high",
  [AuditActions.EMERGENCY_ZONE_CREATED]: "medium",
  [AuditActions.EMERGENCY_ZONE_UPDATED]: "medium",
  [AuditActions.EMERGENCY_ZONE_DELETED]: "medium",

  // Staff Rostering & Relief - Module N
  [AuditActions.ROSTER_TEMPLATE_CREATED]: "medium",
  [AuditActions.ROSTER_TEMPLATE_UPDATED]: "medium",
  [AuditActions.ROSTER_TEMPLATE_DELETED]: "high",
  [AuditActions.ROSTER_WEEK_CREATED]: "medium",
  [AuditActions.ROSTER_WEEK_PUBLISHED]: "high",
  [AuditActions.ROSTER_WEEK_LOCKED]: "high",
  [AuditActions.SHIFT_CREATED]: "low",
  [AuditActions.SHIFT_UPDATED]: "low",
  [AuditActions.SHIFT_CANCELLED]: "medium",
  [AuditActions.LEAVE_REQUESTED]: "low",
  [AuditActions.LEAVE_APPROVED]: "medium",
  [AuditActions.LEAVE_REJECTED]: "medium",
  [AuditActions.LEAVE_WITHDRAWN]: "low",
  [AuditActions.SHIFT_SWAP_REQUESTED]: "low",
  [AuditActions.SHIFT_SWAP_APPROVED]: "medium",
  [AuditActions.SHIFT_SWAP_REJECTED]: "low",
  [AuditActions.COVERAGE_REQUEST_CREATED]: "medium",
  [AuditActions.COVERAGE_REQUEST_ACCEPTED]: "medium",
  [AuditActions.COVERAGE_REQUEST_RESOLVED]: "medium",

  // Timesheets & Payroll - Module 9 (financial records)
  [AuditActions.TIMESHEET_SUBMITTED]: "low",
  [AuditActions.TIMESHEET_APPROVED]: "high",
  [AuditActions.TIMESHEET_REJECTED]: "high",
  [AuditActions.TIMESHEET_SYNCED]: "high",
  [AuditActions.TIME_ENTRY_LOGGED]: "low",
  [AuditActions.TIME_ENTRY_DELETED]: "medium",
  [AuditActions.PAY_PERIOD_CREATED]: "medium",
  [AuditActions.PAY_PERIOD_LOCKED]: "high",
  [AuditActions.PAY_PERIOD_PROCESSED]: "high",
  [AuditActions.PAYROLL_SETTINGS_UPDATED]: "high",
  [AuditActions.EMPLOYEE_MAPPING_CREATED]: "medium",
  [AuditActions.EMPLOYEE_MAPPING_DELETED]: "high",

  // Individual Learning Plans - Module Q (disability/additional needs data)
  [AuditActions.ILP_PLAN_CREATED]: "high",
  [AuditActions.ILP_PLAN_UPDATED]: "high",
  [AuditActions.ILP_PLAN_ACTIVATED]: "high",
  [AuditActions.ILP_PLAN_ARCHIVED]: "high",
  [AuditActions.ILP_PLAN_STATUS_CHANGED]: "high",
  [AuditActions.ILP_GOAL_CREATED]: "medium",
  [AuditActions.ILP_GOAL_UPDATED]: "medium",
  [AuditActions.ILP_GOAL_ACHIEVED]: "medium",
  [AuditActions.ILP_GOAL_DISCONTINUED]: "medium",
  [AuditActions.ILP_GOAL_DELETED]: "high",
  [AuditActions.ILP_STRATEGY_CREATED]: "medium",
  [AuditActions.ILP_STRATEGY_UPDATED]: "medium",
  [AuditActions.ILP_STRATEGY_DELETED]: "medium",
  [AuditActions.ILP_REVIEW_CREATED]: "high",
  [AuditActions.ILP_COLLABORATOR_ADDED]: "medium",
  [AuditActions.ILP_COLLABORATOR_REMOVED]: "medium",
  [AuditActions.ILP_EVIDENCE_ATTACHED]: "low",
  [AuditActions.ILP_EVIDENCE_REMOVED]: "medium",
  [AuditActions.ILP_CONSENT_RECORDED]: "high",
  [AuditActions.ILP_PLAN_EXPORTED]: "high",
  [AuditActions.TRANSITION_STATEMENT_CREATED]: "high",
  [AuditActions.TRANSITION_STATEMENT_UPDATED]: "high",
  [AuditActions.TRANSITION_SHARED_WITH_FAMILY]: "high",
  [AuditActions.TRANSITION_SHARED_WITH_SCHOOL]: "high",
  [AuditActions.TRANSITION_FAMILY_APPROVED]: "high",

  // Daily Care Log - Reg 162 (child health/care data)
  [AuditActions.DAILY_CARE_LOG_CREATED]: "medium",
  [AuditActions.DAILY_CARE_LOG_SHARED]: "medium",
  [AuditActions.DAILY_CARE_ENTRY_CREATED]: "medium",
  [AuditActions.DAILY_CARE_ENTRY_UPDATED]: "medium",
  [AuditActions.DAILY_CARE_ENTRY_DELETED]: "high",
  [AuditActions.DAILY_CARE_SLEEP_CHECK_RECORDED]: "medium",
  [AuditActions.DAILY_CARE_FIELD_CONFIG_UPDATED]: "medium",

  // Wellbeing & Pastoral Care - Module P (child welfare data)
  [AuditActions.WELLBEING_FLAG_CREATED]: "high",
  [AuditActions.WELLBEING_FLAG_UPDATED]: "high",
  [AuditActions.WELLBEING_FLAG_ASSIGNED]: "high",
  [AuditActions.WELLBEING_FLAG_RESOLVED]: "high",
  [AuditActions.WELLBEING_FLAG_DELETED]: "critical",
  [AuditActions.REFERRAL_CREATED]: "high",
  [AuditActions.REFERRAL_UPDATED]: "medium",
  [AuditActions.REFERRAL_STATUS_CHANGED]: "high",
  [AuditActions.REFERRAL_DELETED]: "critical",
  [AuditActions.CASE_NOTE_VIEWED]: "high",
  [AuditActions.CASE_NOTE_CREATED]: "high",
  [AuditActions.CASE_NOTE_UPDATED]: "high",
  [AuditActions.CASE_NOTE_DELETED]: "critical",
  [AuditActions.CHECKIN_SCHEDULED]: "medium",
  [AuditActions.CHECKIN_COMPLETED]: "high",
  [AuditActions.CHECKIN_RESCHEDULED]: "medium",
  [AuditActions.CHECKIN_DELETED]: "high",
  [AuditActions.PASTORAL_RECORD_CREATED]: "high",
  [AuditActions.PASTORAL_RECORD_UPDATED]: "medium",
  [AuditActions.PASTORAL_RECORD_DELETED]: "critical",

  // School Photos & ID Cards - Module R
  [AuditActions.PHOTO_SESSION_CREATED]: "medium",
  [AuditActions.PHOTO_SESSION_UPDATED]: "medium",
  [AuditActions.PHOTO_SESSION_CLOSED]: "medium",
  [AuditActions.PHOTO_SESSION_ARCHIVED]: "low",
  [AuditActions.PHOTO_UPLOADED]: "low",
  [AuditActions.PHOTO_BULK_UPLOADED]: "medium",
  [AuditActions.PHOTO_SET_CURRENT]: "medium",
  [AuditActions.PHOTO_DELETED]: "medium",
  [AuditActions.PHOTO_CROPPED]: "low",
  [AuditActions.ID_CARDS_GENERATED]: "medium",
  [AuditActions.ID_CARD_TEMPLATE_SAVED]: "medium",

  // NCCD Disability Register - disability data, high sensitivity
  [AuditActions.NCCD_ENTRY_CREATED]: "high",
  [AuditActions.NCCD_ENTRY_UPDATED]: "high",
  [AuditActions.NCCD_ENTRY_DELETED]: "high",
  [AuditActions.NCCD_EVIDENCE_ADDED]: "medium",
  [AuditActions.NCCD_EVIDENCE_REMOVED]: "medium",
  [AuditActions.NCCD_COLLECTION_SUBMITTED]: "high",
  [AuditActions.NCCD_COLLECTION_EXPORTED]: "high",

  // Sick Bay Visits Log - health/welfare records, medium/high sensitivity
  [AuditActions.SICK_BAY_VISIT_CREATED]: "medium",
  [AuditActions.SICK_BAY_VISIT_UPDATED]: "medium",
  [AuditActions.SICK_BAY_VISIT_RESOLVED]: "medium",
  [AuditActions.SICK_BAY_VISIT_REFERRED]: "high", // Escalation
  [AuditActions.SICK_BAY_VISIT_DELETED]: "high",
  [AuditActions.SICK_BAY_PARENT_NOTIFIED]: "medium",

  // Three-Period Lessons - Module T (pedagogical records, low sensitivity)
  [AuditActions.THREE_PERIOD_LESSON_CREATED]: "low",
  [AuditActions.THREE_PERIOD_LESSON_UPDATED]: "low",
  [AuditActions.THREE_PERIOD_LESSON_PERIOD_ADVANCED]: "low",
  [AuditActions.THREE_PERIOD_LESSON_COMPLETE]: "medium",
  [AuditActions.THREE_PERIOD_LESSON_DELETED]: "medium",

  // Sensitive Periods - Module T (developmental observations, medium sensitivity)
  [AuditActions.SENSITIVE_PERIOD_RECORDED]: "medium",
  [AuditActions.SENSITIVE_PERIOD_UPDATED]: "medium",
  [AuditActions.SENSITIVE_PERIOD_CLOSED]: "medium",
  [AuditActions.SENSITIVE_PERIOD_DELETED]: "high",
  [AuditActions.SENSITIVE_PERIOD_MATERIAL_LINKED]: "low",
  [AuditActions.SENSITIVE_PERIOD_MATERIAL_UNLINKED]: "low",
  [AuditActions.SENSITIVE_PERIOD_OBS_TAGGED]: "low",

  // Dismissal & Pickup - Module V (SAFETY-CRITICAL: controls child handover)
  [AuditActions.BUS_ROUTE_CREATED]: "medium",
  [AuditActions.BUS_ROUTE_UPDATED]: "medium",
  [AuditActions.BUS_ROUTE_DELETED]: "high",
  [AuditActions.PICKUP_AUTH_CREATED]: "high",
  [AuditActions.PICKUP_AUTH_UPDATED]: "high",
  [AuditActions.PICKUP_AUTH_REVOKED]: "high",
  [AuditActions.DISMISSAL_METHOD_SET]: "medium",
  [AuditActions.DISMISSAL_RECORDS_SEEDED]: "low",
  [AuditActions.DISMISSAL_CONFIRMED]: "medium",
  [AuditActions.DISMISSAL_EXCEPTION_FLAGGED]: "high",
  [AuditActions.DISMISSAL_RECORD_UPDATED]: "medium",
  [AuditActions.DISMISSAL_EXPORTED]: "medium",

  // Chronic Absence Monitoring - Module W (child welfare records)
  [AuditActions.CHRONIC_ABSENCE_FLAG_CREATED]: "high",
  [AuditActions.CHRONIC_ABSENCE_FLAG_UPDATED]: "medium",
  [AuditActions.CHRONIC_ABSENCE_FLAG_RESOLVED]: "high",
  [AuditActions.CHRONIC_ABSENCE_FLAG_DISMISSED]: "medium",
  [AuditActions.CHRONIC_ABSENCE_FOLLOW_UP_LOGGED]: "medium",
  [AuditActions.CHRONIC_ABSENCE_CONFIG_UPDATED]: "high",
  [AuditActions.CHRONIC_ABSENCE_EXPORTED]: "medium",

  // Material / Shelf Inventory - Module Z (physical resource management)
  [AuditActions.MATERIAL_INVENTORY_ITEM_CREATED]: "low",
  [AuditActions.MATERIAL_INVENTORY_ITEM_UPDATED]: "low",
  [AuditActions.MATERIAL_INVENTORY_ITEM_DELETED]: "medium",
  [AuditActions.MATERIAL_INVENTORY_ITEM_RETIRED]: "medium",
  [AuditActions.MATERIAL_INVENTORY_CONDITION_UPDATED]: "low",
  [AuditActions.MATERIAL_INVENTORY_STATUS_UPDATED]: "low",
  [AuditActions.MATERIAL_SHELF_LOCATION_CREATED]: "low",
  [AuditActions.MATERIAL_SHELF_LOCATION_UPDATED]: "low",
  [AuditActions.MATERIAL_SHELF_LOCATION_DELETED]: "medium",
  [AuditActions.MATERIAL_INVENTORY_EXPORTED]: "medium",

  // NAPLAN Coordination - student assessment data (medium sensitivity)
  [AuditActions.NAPLAN_WINDOW_CREATED]: "medium",
  [AuditActions.NAPLAN_WINDOW_UPDATED]: "medium",
  [AuditActions.NAPLAN_WINDOW_STATUS_SET]: "medium",
  [AuditActions.NAPLAN_WINDOW_DELETED]: "high",
  [AuditActions.NAPLAN_COHORT_GENERATED]: "medium",
  [AuditActions.NAPLAN_COHORT_ENTRY_ADDED]: "medium",
  [AuditActions.NAPLAN_COHORT_ENTRY_REMOVED]: "medium",
  [AuditActions.NAPLAN_OPT_OUT_RECORDED]: "high",
  [AuditActions.NAPLAN_OPT_OUT_REMOVED]: "high",
  [AuditActions.NAPLAN_RESULT_RECORDED]: "medium",
  [AuditActions.NAPLAN_RESULTS_EXPORTED]: "medium",

  // Normalization Indicators
  [AuditActions.NORMALIZATION_OBSERVATION_CREATED]: "medium",
  [AuditActions.NORMALIZATION_OBSERVATION_UPDATED]: "medium",
  [AuditActions.NORMALIZATION_OBSERVATION_DELETED]: "medium",
  [AuditActions.NORMALIZATION_GOAL_CREATED]: "medium",
  [AuditActions.NORMALIZATION_GOAL_UPDATED]: "medium",
  [AuditActions.NORMALIZATION_GOAL_ACHIEVED]: "medium",
  [AuditActions.NORMALIZATION_GOAL_DELETED]: "medium",

  // SMS Gateway - config changes are high; individual sends are medium
  [AuditActions.SMS_GATEWAY_CONFIG_UPDATED]: "high",
  [AuditActions.SMS_GATEWAY_ENABLED]: "high",
  [AuditActions.SMS_GATEWAY_DISABLED]: "high",
  [AuditActions.SMS_SENT]: "medium",
  [AuditActions.SMS_BROADCAST_SENT]: "high",
  [AuditActions.SMS_DELIVERY_UPDATED]: "low",
  [AuditActions.SMS_OPT_OUT_ADDED]: "medium",
  [AuditActions.SMS_OPT_OUT_REMOVED]: "medium",
  [AuditActions.SMS_EXPORTED]: "medium",

  // Push Notification Dispatch
  [AuditActions.PUSH_DISPATCH_CREATED]: "medium",
  [AuditActions.PUSH_DISPATCH_UPDATED]: "medium",
  [AuditActions.PUSH_DISPATCH_SENT]: "high",
  [AuditActions.PUSH_DISPATCH_SCHEDULED]: "medium",
  [AuditActions.PUSH_DISPATCH_CANCELLED]: "medium",
  [AuditActions.PUSH_DISPATCH_DELETED]: "medium",
  [AuditActions.PUSH_TOPIC_PREF_UPDATED]: "low",
  [AuditActions.PUSH_ANALYTICS_EXPORTED]: "medium",

  // Prepared Environment Planner - shelf layout + rotations (low sensitivity)
  [AuditActions.ENVIRONMENT_PLAN_CREATED]: "low",
  [AuditActions.ENVIRONMENT_PLAN_UPDATED]: "low",
  [AuditActions.ENVIRONMENT_PLAN_DELETED]: "medium",
  [AuditActions.ENVIRONMENT_SLOT_UPDATED]: "low",
  [AuditActions.ROTATION_SCHEDULE_CREATED]: "low",
  [AuditActions.ROTATION_SCHEDULE_UPDATED]: "low",
  [AuditActions.ROTATION_SCHEDULE_COMPLETED]: "low",
  [AuditActions.ROTATION_SCHEDULE_CANCELLED]: "low",

  // Accreditation Checklist (AMI / AMS / MSAA)
  [AuditActions.ACCREDITATION_CYCLE_CREATED]: "medium",
  [AuditActions.ACCREDITATION_CYCLE_UPDATED]: "medium",
  [AuditActions.ACCREDITATION_CYCLE_DELETED]: "medium",
  [AuditActions.ACCREDITATION_STATUS_CHANGED]: "medium",
  [AuditActions.ACCREDITATION_ASSESSMENT_SAVED]: "low",
  [AuditActions.ACCREDITATION_EVIDENCE_ADDED]: "low",
  [AuditActions.ACCREDITATION_EVIDENCE_DELETED]: "low",
  [AuditActions.ACCREDITATION_EXPORTED]: "low",

  // Previous School Records
  [AuditActions.PREVIOUS_SCHOOL_RECORD_CREATED]: "medium",
  [AuditActions.PREVIOUS_SCHOOL_RECORD_UPDATED]: "medium",
  [AuditActions.PREVIOUS_SCHOOL_RECORD_DELETED]: "high",
  [AuditActions.PREVIOUS_SCHOOL_RECORDS_EXPORTED]: "medium",

  // ACARA Attendance Reporting
  [AuditActions.ACARA_REPORT_PERIOD_CREATED]: "medium",
  [AuditActions.ACARA_REPORT_PERIOD_UPDATED]: "medium",
  [AuditActions.ACARA_REPORT_PERIOD_DELETED]: "high",
  [AuditActions.ACARA_REPORT_STATUS_CHANGED]: "medium",
  [AuditActions.ACARA_RECORDS_SYNCED]: "low",
  [AuditActions.ACARA_STUDENT_RECORD_OVERRIDDEN]: "high",
  [AuditActions.ACARA_REPORT_EXPORTED]: "medium",
  [AuditActions.ACARA_STUDENT_PROFILE_EXPORTED]: "high",

  // Montessori Literacy Hub
  [AuditActions.HUB_ARTICLE_CREATED]: "medium",
  [AuditActions.HUB_ARTICLE_UPDATED]: "medium",
  [AuditActions.HUB_ARTICLE_DELETED]: "medium",
  [AuditActions.HUB_ARTICLE_BOOKMARKED]: "low",
  [AuditActions.HUB_ARTICLE_UNBOOKMARKED]: "low",
  [AuditActions.HUB_ARTICLE_FEEDBACK_SUBMITTED]: "low",

  // Cosmic Education
  [AuditActions.COSMIC_GREAT_LESSON_CREATED]: "low",
  [AuditActions.COSMIC_UNIT_CREATED]: "medium",
  [AuditActions.COSMIC_UNIT_UPDATED]: "medium",
  [AuditActions.COSMIC_UNIT_DELETED]: "medium",
  [AuditActions.COSMIC_STUDY_CREATED]: "low",
  [AuditActions.COSMIC_STUDY_UPDATED]: "low",
  [AuditActions.COSMIC_STUDY_DELETED]: "low",
  [AuditActions.COSMIC_PARTICIPANTS_UPDATED]: "low",
  [AuditActions.COSMIC_STUDY_RECORD_UPDATED]: "low",

  // Grant Tracking - financial records, medium sensitivity
  [AuditActions.GRANT_CREATED]: "medium",
  [AuditActions.GRANT_UPDATED]: "medium",
  [AuditActions.GRANT_STATUS_CHANGED]: "high",
  [AuditActions.GRANT_DELETED]: "high",
  [AuditActions.GRANT_MILESTONE_CREATED]: "low",
  [AuditActions.GRANT_MILESTONE_UPDATED]: "low",
  [AuditActions.GRANT_MILESTONE_COMPLETED]: "medium",
  [AuditActions.GRANT_MILESTONE_DELETED]: "medium",
  [AuditActions.GRANT_EXPENDITURE_CREATED]: "medium",
  [AuditActions.GRANT_EXPENDITURE_UPDATED]: "medium",
  [AuditActions.GRANT_EXPENDITURE_DELETED]: "high",
  [AuditActions.GRANT_DOCUMENT_UPLOADED]: "low",
  [AuditActions.GRANT_DOCUMENT_DELETED]: "medium",
  [AuditActions.GRANT_EXPORTED]: "medium",

  // Fee Notice Comms - financial comms, medium-high sensitivity
  [AuditActions.FEE_NOTICE_QUEUED]: "medium",
  [AuditActions.FEE_NOTICE_APPROVED]: "medium",
  [AuditActions.FEE_NOTICE_SENT]: "medium",
  [AuditActions.FEE_NOTICE_FAILED]: "high",
  [AuditActions.FEE_NOTICE_CONFIG_UPDATED]: "high",
};

export function getActionSensitivity(action: string): AuditSensitivity {
  return (
    (ACTION_SENSITIVITY as Record<string, AuditSensitivity>)[action] ?? "low"
  );
}

// ============================================================
// Request Context Capture
// ============================================================
// WHY IP + user agent: For forensic investigation. If a parent
// reports unauthorized access, the school can see "this action
// came from IP X on Chrome/iPad at 3:47pm" and correlate with
// their network logs or device inventory.
// ============================================================

interface RequestContext {
  ip: string;
  userAgent: string;
}

async function getRequestContext(): Promise<RequestContext> {
  try {
    const headerStore = await headers();

    const forwarded = headerStore.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : (headerStore.get("x-real-ip") ?? "unknown");

    const userAgent = headerStore.get("user-agent") ?? "unknown";

    return { ip, userAgent };
  } catch {
    // headers() can fail in certain contexts (e.g., generateStaticParams)
    return { ip: "unknown", userAgent: "unknown" };
  }
}

// ============================================================
// Core Audit Logger (authenticated user actions)
// ============================================================

interface LogAuditInput {
  /** Tenant context from getTenantContext() */
  context: TenantContext;
  /** Action name - use AuditActions constants */
  action: AuditAction | string;
  /** Entity type being acted upon (e.g., "student", "medical_condition") */
  entityType: string;
  /** UUID of the affected entity */
  entityId?: string | null;
  /** Additional context (old values, change details, etc.) */
  metadata?: Record<string, unknown>;
  /** Outcome of the action: 'success' (default), 'failure', or 'partial' */
  outcome?: "success" | "failure" | "partial";
}

/**
 * Log an auditable action performed by an authenticated user.
 *
 * WHY admin client: The audit_logs table has no INSERT policy
 * for regular users (users shouldn't be able to forge logs).
 * We use the service role to bypass RLS for inserts.
 *
 * WHY fire-and-forget pattern: Audit logging should never block
 * or fail the primary action. If the log insert fails, we
 * console.error but don't propagate the error.
 *
 * @example
 * ```ts
 * const context = await getTenantContext();
 * await logAudit({
 *   context,
 *   action: AuditActions.STUDENT_CREATED,
 *   entityType: "student",
 *   entityId: newStudent.id,
 *   metadata: { first_name: "Jamie", last_name: "Chen" },
 * });
 * ```
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const reqCtx = await getRequestContext();
    const sensitivity = getActionSensitivity(input.action);

    await admin.from("audit_logs").insert({
      tenant_id: input.context.tenant.id,
      user_id: input.context.user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      outcome: input.outcome ?? "success",
      // Promoted to top-level column (Prompt 40) for indexable forensic queries.
      // Also kept in metadata._ip for backward compatibility.
      ip_address: reqCtx.ip ?? null,
      metadata: {
        ...input.metadata,
        _ip: reqCtx.ip,
        _user_agent: reqCtx.userAgent,
        _sensitivity: sensitivity,
        _user_email: input.context.user.email,
        _user_name:
          `${input.context.user.first_name} ${input.context.user.last_name}`.trim(),
        _role: input.context.role.name,
      },
    });
  } catch (err) {
    // Never fail the primary action due to audit logging
    console.error("[audit] Failed to write audit log:", err);
  }
}

// ============================================================
// System Audit Logger (no user context - webhooks, cron, etc.)
// ============================================================

interface LogAuditSystemInput {
  tenantId: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Outcome of the action: 'success' (default), 'failure', or 'partial' */
  outcome?: "success" | "failure" | "partial";
}

/**
 * Log an auditable system action (no authenticated user).
 * Used for webhooks, cron jobs, and automated processes.
 */
export async function logAuditSystem(
  input: LogAuditSystemInput,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();

    await admin.from("audit_logs").insert({
      tenant_id: input.tenantId,
      user_id: null, // System action - no user
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      outcome: input.outcome ?? "success",
      // System actions have no end-user IP; ip_address stays null.
      // The field is populated for completeness (Prompt 40).
      ip_address: null,
      metadata: {
        ...input.metadata,
        _system: true,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write system audit log:", err);
  }
}

// ============================================================
// Bulk Audit Logger (for batch operations)
// ============================================================

interface BulkAuditEntry {
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log multiple audit entries in a single insert for batch operations
 * (e.g., batch attendance marking, bulk import).
 */
export async function logAuditBulk(
  context: TenantContext,
  entries: BulkAuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  try {
    const admin = createSupabaseAdminClient();
    const reqCtx = await getRequestContext();

    const rows = entries.map((entry) => ({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: {
        ...entry.metadata,
        _ip: reqCtx.ip,
        _user_agent: reqCtx.userAgent,
        _sensitivity: getActionSensitivity(entry.action),
        _user_email: context.user.email,
        _bulk: true,
        _batch_size: entries.length,
      },
    }));

    await admin.from("audit_logs").insert(rows);
  } catch (err) {
    console.error("[audit] Failed to write bulk audit logs:", err);
  }
}
