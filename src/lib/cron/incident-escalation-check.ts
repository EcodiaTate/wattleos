// src/lib/cron/incident-escalation-check.ts
//
// ============================================================
// Cron-only: Incident NQA ITS Escalation Checker (Reg 87)
// ============================================================
// NOT a server action. This function is only callable from
// the cron route at /api/cron/incident-escalation-check (gated
// by CRON_SECRET). It was extracted from incidents.ts to prevent
// direct client invocation of admin-scoped logic.
//
// Finds serious incidents that have passed the 24-hour NQA ITS
// notification deadline. For each tenant with overdue incidents,
// creates an urgent staff announcement.
//
// WHY admin client: The cron has no authenticated user, so
// requirePermission() would reject the call. Admin client
// bypasses RLS - safe because we constrain writes to
// announcements we create and audit_logs we insert.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import { logAuditSystem, AuditActions } from "@/lib/utils/audit";

export interface EscalationCheckResult {
  tenants_checked: number;
  overdue_incidents: number;
  alerts_sent: number;
}

export async function checkIncidentNqaEscalations(): Promise<
  ActionResponse<EscalationCheckResult>
> {
  try {
    const admin = createSupabaseAdminClient();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find all serious incidents past 24h that still have no regulator notification.
    // `created_at` is used (not occurred_at) because the 24h clock for NQA ITS
    // notification runs from when the incident was recorded, not when it occurred.
    const { data: overdue, error } = await admin
      .from("incidents")
      .select("id, tenant_id, incident_type, occurred_at, created_at, severity")
      .eq("is_serious_incident", true)
      .is("regulator_notified_at", null)
      .is("deleted_at", null)
      .neq("status", "closed")
      .lt("created_at", cutoff)
      .order("tenant_id")
      .order("created_at", { ascending: true });

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const incidents = overdue ?? [];

    if (incidents.length === 0) {
      return success({
        tenants_checked: 0,
        overdue_incidents: 0,
        alerts_sent: 0,
      });
    }

    // Group by tenant so we send one announcement per tenant (not one per incident)
    const byTenant = new Map<
      string,
      Array<{
        id: string;
        incident_type: string;
        occurred_at: string;
        created_at: string;
        severity: string;
      }>
    >();
    for (const inc of incidents) {
      const list = byTenant.get(inc.tenant_id) ?? [];
      list.push(inc);
      byTenant.set(inc.tenant_id, list);
    }

    let alertsSent = 0;

    for (const [tenantId, tenantIncidents] of byTenant) {
      const lines = tenantIncidents.map((inc) => {
        const hoursOverdue = Math.floor(
          (Date.now() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60) -
            24,
        );
        const typeLabel =
          inc.incident_type.charAt(0).toUpperCase() +
          inc.incident_type.slice(1);
        return `- **${typeLabel}** (${inc.severity}) - occurred ${new Date(inc.occurred_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} - ${hoursOverdue}h overdue`;
      });

      const body = [
        `**Urgent: NQA ITS Notification Overdue - Reg 87**`,
        ``,
        `${tenantIncidents.length} serious incident${tenantIncidents.length !== 1 ? "s" : ""} passed the 24-hour regulatory notification deadline without being reported to NQA ITS:`,
        ``,
        ...lines,
        ``,
        `**Immediate action required.** Open each incident in the [Incident Register](/incidents) and record the NQA ITS notification reference.`,
        ``,
        `Failure to report serious incidents to the regulatory authority is a breach of Reg 87 (Education and Care Services National Regulations).`,
      ].join("\n");

      const { error: announceError } = await admin
        .from("announcements")
        .insert({
          tenant_id: tenantId,
          author_id: null,
          title: `ACTION REQUIRED: ${tenantIncidents.length} serious incident${tenantIncidents.length !== 1 ? "s" : ""} not reported to NQA ITS`,
          body,
          audience: "staff",
          priority: "urgent",
          is_published: true,
          published_at: new Date().toISOString(),
        });

      if (announceError) {
        console.error(
          `[incident-escalation] Failed to post announcement for tenant ${tenantId}:`,
          announceError.message,
        );
        // Continue to next tenant - don't abort the whole run
        continue;
      }

      // Audit log one entry per overdue incident
      await Promise.all(
        tenantIncidents.map((inc) =>
          logAuditSystem({
            tenantId,
            action: AuditActions.INCIDENT_ESCALATION_ALERT,
            entityType: "incident",
            entityId: inc.id,
            metadata: {
              hours_overdue: Math.floor(
                (Date.now() - new Date(inc.created_at).getTime()) /
                  (1000 * 60 * 60) -
                  24,
              ),
              severity: inc.severity,
            },
          }),
        ),
      );

      alertsSent++;
    }

    return success({
      tenants_checked: byTenant.size,
      overdue_incidents: incidents.length,
      alerts_sent: alertsSent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
