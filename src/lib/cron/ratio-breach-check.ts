// src/lib/cron/ratio-breach-check.ts
//
// ────────────────────────────────────────────────────────────
// Cron-only: Ratio Breach Alert Dispatcher (Reg 123)
// ────────────────────────────────────────────────────────────
// NOT a server action. This function is only callable from
// the cron route at /api/cron/ratio-breach-check (gated by
// CRON_SECRET). It was extracted from ratios.ts to prevent
// direct client invocation of admin-scoped logic.
//
// For each class currently out of ratio, checks whether it
// has not been alerted on recently:
//   - alert_interval_minutes: min gap between repeat alerts (5 min)
//   - escalation_threshold_minutes: escalate to principal after 15 min
//
// WHY admin client: Cron has no authenticated user.
// Admin client is constrained to reads from ratio_logs, classes,
// and writes to ratio_breach_alert_log + announcements + audit_logs.
// ────────────────────────────────────────────────────────────

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { logAuditSystem, AuditActions } from "@/lib/utils/audit";

export interface RatioBreachCheckResult {
  tenants_checked: number;
  breached_classes: number;
  alerts_sent: number;
}

const ALERT_INTERVAL_MINUTES = 5;
const ESCALATION_THRESHOLD_MINUTES = 15;

export async function checkRatioBreaches(): Promise<
  ActionResponse<RatioBreachCheckResult>
> {
  try {
    const admin = createSupabaseAdminClient();

    // Find ratio_log breach entries from the last ALERT_INTERVAL_MINUTES.
    // These represent classes that are currently out of ratio.
    const windowStart = new Date(
      Date.now() - ALERT_INTERVAL_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: recentBreaches, error: breachErr } = await admin
      .from("ratio_logs")
      .select(
        "id, tenant_id, class_id, logged_at, children_present, educators_on_floor, required_ratio_denominator",
      )
      .eq("is_breached", true)
      .gte("logged_at", windowStart)
      .order("tenant_id")
      .order("class_id")
      .order("logged_at", { ascending: false });

    if (breachErr) {
      return failure(breachErr.message, "NOT_FOUND");
    }

    const breaches = recentBreaches ?? [];
    if (breaches.length === 0) {
      return success({
        tenants_checked: 0,
        breached_classes: 0,
        alerts_sent: 0,
      });
    }

    // Deduplicate: one entry per (tenant_id, class_id), keeping the latest.
    const latestByClass = new Map<
      string,
      {
        tenant_id: string;
        class_id: string;
        logged_at: string;
        children_present: number;
        educators_on_floor: number;
        required_ratio_denominator: number;
      }
    >();
    for (const row of breaches) {
      const key = `${row.tenant_id}::${row.class_id}`;
      if (!latestByClass.has(key)) {
        latestByClass.set(key, row);
      }
    }

    // Determine which classes have already been alerted recently
    // to avoid duplicate notifications within the same interval.
    const classIds = [...latestByClass.values()].map((r) => r.class_id);
    const { data: recentAlerts } = await admin
      .from("ratio_breach_alert_log")
      .select("class_id, alerted_at")
      .in("class_id", classIds)
      .gte("alerted_at", windowStart);

    const recentlyAlertedClassIds = new Set(
      (recentAlerts ?? []).map((a) => a.class_id),
    );

    // For escalation: find classes breached for > ESCALATION_THRESHOLD_MINUTES.
    const escalationCutoff = new Date(
      Date.now() - ESCALATION_THRESHOLD_MINUTES * 60 * 1000,
    ).toISOString();
    const { data: escalationBreaches } = await admin
      .from("ratio_logs")
      .select("class_id, tenant_id")
      .eq("is_breached", true)
      .lte("logged_at", escalationCutoff)
      .in("class_id", classIds);

    const escalatedClassIds = new Set(
      (escalationBreaches ?? []).map((r) => r.class_id),
    );

    // Fetch class names for messaging
    const { data: classRows } = await admin
      .from("classes")
      .select("id, name")
      .in("id", classIds);
    const classNameMap = new Map(
      (classRows ?? []).map((c) => [c.id, c.name as string]),
    );

    // Group by tenant
    const byTenant = new Map<
      string,
      typeof latestByClass extends Map<string, infer V> ? V[] : never
    >();
    for (const entry of latestByClass.values()) {
      const list = byTenant.get(entry.tenant_id) ?? [];
      list.push(entry);
      byTenant.set(entry.tenant_id, list);
    }

    let alertsSent = 0;

    for (const [tenantId, tenantBreaches] of byTenant) {
      // Filter to classes not recently alerted
      const toAlert = tenantBreaches.filter(
        (b) => !recentlyAlertedClassIds.has(b.class_id),
      );
      if (toAlert.length === 0) continue;

      const now = new Date().toISOString();

      for (const breach of toAlert) {
        const className = classNameMap.get(breach.class_id) ?? "Unknown class";
        const requiredRatio = `1:${breach.required_ratio_denominator}`;
        const isEscalation = escalatedClassIds.has(breach.class_id);
        const tier = isEscalation ? "escalated" : "initial";

        // Build announcement body
        const urgencyLabel = isEscalation
          ? `ESCALATION (>${ESCALATION_THRESHOLD_MINUTES} min out of ratio)`
          : "ALERT";
        const body = [
          `**${urgencyLabel}: Ratio Breach - ${className} (Reg 123)**`,
          ``,
          `**${className}** is out of required ratio.`,
          ``,
          `- Children present: ${breach.children_present}`,
          `- Educators on floor: ${breach.educators_on_floor}`,
          `- Required ratio: ${requiredRatio}`,
          ``,
          isEscalation
            ? `This class has been out of ratio for more than ${ESCALATION_THRESHOLD_MINUTES} minutes. **Immediate action required.**`
            : `Please ensure additional educators are deployed to the floor immediately.`,
          ``,
          `View the [Ratio Dashboard](/admin/ratios) to sign in educators.`,
        ].join("\n");

        const title = isEscalation
          ? `ESCALATION: ${className} out of ratio (${breach.educators_on_floor} of ${breach.required_ratio_denominator} required educators)`
          : `Ratio breach: ${className} - ${breach.educators_on_floor} educators, need ${requiredRatio}`;

        const { error: announceErr } = await admin
          .from("announcements")
          .insert({
            tenant_id: tenantId,
            author_id: null,
            title,
            body,
            audience: "staff",
            priority: "urgent",
            is_published: true,
            published_at: now,
          });

        if (announceErr) {
          console.error(
            `[ratio-breach-check] Failed to post announcement for class ${breach.class_id}:`,
            announceErr.message,
          );
          continue;
        }

        // Record alert in log (for rate-limiting on next run)
        await admin.from("ratio_breach_alert_log").insert({
          tenant_id: tenantId,
          class_id: breach.class_id,
          children_present: breach.children_present,
          educators_on_floor: breach.educators_on_floor,
          required_educators: Math.ceil(
            breach.children_present / breach.required_ratio_denominator,
          ),
          required_ratio: requiredRatio,
          alerted_at: now,
          alert_recipients: [{ role: "staff", method: "announcement" }],
          alert_tier: tier,
        });

        await logAuditSystem({
          tenantId,
          action: AuditActions.RATIO_BREACH_ALERT_SENT,
          entityType: "ratio_log",
          entityId: breach.class_id,
          metadata: {
            class_name: className,
            children_present: breach.children_present,
            educators_on_floor: breach.educators_on_floor,
            required_ratio: requiredRatio,
            alert_tier: tier,
          },
        });

        alertsSent++;
      }
    }

    return success({
      tenants_checked: byTenant.size,
      breached_classes: latestByClass.size,
      alerts_sent: alertsSent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "UNAUTHORIZED");
  }
}
