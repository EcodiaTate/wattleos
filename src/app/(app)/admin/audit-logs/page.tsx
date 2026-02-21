// src/app/(app)/admin/audit-logs/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Audit Logs Viewer
// ============================================================
// Server Component. Permission-gated to VIEW_AUDIT_LOGS.
// Loads initial audit log data and filter options, then
// delegates interactive filtering/pagination to the client.
//
// WHY a dedicated page (not embedded in Settings): Audit logs
// are a security/compliance tool that admins, auditors, and
// principals access independently. A separate route makes it
// linkable and keeps the Settings page focused on config.
// ============================================================

import { redirect } from "next/navigation";

import {
  getAuditLogFilterOptions,
  getAuditLogStats,
  listAuditLogs,
} from "@/lib/actions/audit-logs";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

import { AuditLogClient } from "./audit-log-client";

export default async function AuditLogsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_AUDIT_LOGS)) {
    redirect("/dashboard");
  }

  // Load initial data in parallel
  const [logsResult, statsResult, filtersResult] = await Promise.all([
    listAuditLogs({ limit: 50, offset: 0 }),
    getAuditLogStats(30),
    getAuditLogFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Security event log for your school. All sensitive actions are recorded
          with user, timestamp, and IP address.
        </p>
      </div>

      <AuditLogClient
        initialLogs={logsResult.data?.logs ?? []}
        initialTotal={logsResult.data?.total ?? 0}
        initialHasMore={logsResult.data?.has_more ?? false}
        stats={statsResult.data ?? null}
        filterOptions={filtersResult.data ?? null}
      />
    </div>
  );
}
