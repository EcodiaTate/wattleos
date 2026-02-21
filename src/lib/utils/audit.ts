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
  USER_ROLE_CHANGED: "user.role_changed",
  USER_SUSPENDED: "user.suspended",
  USER_REACTIVATED: "user.reactivated",

  // ── Integrations ────────────────────────────────────────
  INTEGRATION_ENABLED: "integration.enabled",
  INTEGRATION_DISABLED: "integration.disabled",
  INTEGRATION_SYNCED: "integration.synced",

  // ── Billing ─────────────────────────────────────────────
  INVOICE_CREATED: "invoice.created",
  INVOICE_SENT: "invoice.sent",
  PAYMENT_RECEIVED: "payment.received",
  REFUND_ISSUED: "refund.issued",

  // ── Settings ────────────────────────────────────────────
  SETTINGS_UPDATED: "settings.updated",
  BRANDING_UPDATED: "branding.updated",

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
  LOGOUT: "auth.logout",
  TENANT_SWITCHED: "auth.tenant_switched",
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
  [AuditActions.CUSTODY_CREATED]: "critical",
  [AuditActions.CUSTODY_UPDATED]: "critical",
  [AuditActions.CUSTODY_DELETED]: "critical",
  [AuditActions.MEDICAL_CREATED]: "high",
  [AuditActions.MEDICAL_UPDATED]: "high",
  [AuditActions.MEDICAL_DELETED]: "high",
  [AuditActions.MEDICAL_VIEWED]: "medium",
  [AuditActions.USER_ROLE_CHANGED]: "critical",
  [AuditActions.USER_SUSPENDED]: "critical",
  [AuditActions.SETTINGS_UPDATED]: "high",
  [AuditActions.PICKUP_AUTHORIZED]: "high",
  [AuditActions.PICKUP_REVOKED]: "high",
  [AuditActions.CONSENT_REVOKED]: "high",
  [AuditActions.STUDENT_EXPORTED]: "high",
  [AuditActions.REPORT_EXPORTED]: "medium",

  // Medium: enrollment, billing
  [AuditActions.APPLICATION_APPROVED]: "medium",
  [AuditActions.APPLICATION_REJECTED]: "medium",
  [AuditActions.INVITATION_ACCEPTED]: "medium",
  [AuditActions.INVOICE_CREATED]: "medium",
  [AuditActions.REFUND_ISSUED]: "medium",
  [AuditActions.IMPORT_STARTED]: "medium",
  [AuditActions.IMPORT_ROLLED_BACK]: "high",

  // Auth
  [AuditActions.LOGIN_FAILED]: "medium",
  [AuditActions.LOGIN_SUCCESS]: "low",
  [AuditActions.TENANT_SWITCHED]: "low",
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
  /** Action name — use AuditActions constants */
  action: AuditAction | string;
  /** Entity type being acted upon (e.g., "student", "medical_condition") */
  entityType: string;
  /** UUID of the affected entity */
  entityId?: string | null;
  /** Additional context (old values, change details, etc.) */
  metadata?: Record<string, unknown>;
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
// System Audit Logger (no user context — webhooks, cron, etc.)
// ============================================================

interface LogAuditSystemInput {
  tenantId: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
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
      user_id: null, // System action — no user
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
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
