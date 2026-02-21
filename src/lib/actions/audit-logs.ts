// src/lib/actions/audit-logs.ts
//
// ============================================================
// WattleOS V2 - Audit Log Query Actions
// ============================================================
// Read-only server actions for querying the audit_logs table.
// Permission-gated to VIEW_AUDIT_LOGS.
//
// WHY server action (not direct Supabase query from client):
// Even though RLS protects the table, server actions let us
// add application-level validations and consistent pagination
// without exposing query patterns to the client.
//
// EXPORT: CSV export iterates all matching logs (up to 10k)
// and returns a formatted CSV string for compliance handoff.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  /** Filter by entity type (e.g., "student", "invoice") */
  entity_type?: string;
  /** Filter by action (e.g., "student.created") */
  action?: string;
  /** Filter by user ID */
  user_id?: string;
  /** Filter logs after this date (ISO string) */
  date_from?: string;
  /** Filter logs before this date (ISO string) */
  date_to?: string;
  /** Free-text search across action + entity_type + metadata */
  search?: string;
  /** Sensitivity level filter from metadata._sensitivity */
  sensitivity?: "critical" | "high" | "medium" | "low";
  /** Pagination: number of records per page */
  limit?: number;
  /** Pagination: offset */
  offset?: number;
}

export interface AuditLogResult {
  logs: AuditLogEntry[];
  total: number;
  has_more: boolean;
}

export interface AuditLogStats {
  total_events: number;
  critical_events: number;
  unique_users: number;
  most_common_action: string | null;
}

export interface AuditLogCsvResult {
  csv: string;
  filename: string;
  row_count: number;
}

// ============================================================
// Internal: Apply filters to a query builder
// ============================================================
// WHY extracted: listAuditLogs and exportAuditLogsCsv both need
// the same filter logic. DRY.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { eq: any; gte: any; lt: any; or: any }>(
  query: T,
  filters: AuditLogFilters,
): T {
  let q = query;

  if (filters.entity_type) {
    q = q.eq("entity_type", filters.entity_type);
  }

  if (filters.action) {
    q = q.eq("action", filters.action);
  }

  if (filters.user_id) {
    q = q.eq("user_id", filters.user_id);
  }

  if (filters.date_from) {
    q = q.gte("created_at", filters.date_from);
  }

  if (filters.date_to) {
    const endDate = new Date(filters.date_to);
    endDate.setDate(endDate.getDate() + 1);
    q = q.lt("created_at", endDate.toISOString());
  }

  if (filters.sensitivity) {
    q = q.eq("metadata->>_sensitivity", filters.sensitivity);
  }

  if (filters.search) {
    q = q.or(
      `action.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%`,
    );
  }

  return q;
}

// ============================================================
// List Audit Logs (paginated, filtered)
// ============================================================

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<ActionResponse<AuditLogResult>> {
  try {
    await requirePermission(Permissions.VIEW_AUDIT_LOGS);
    const supabase = await createSupabaseServerClient();

    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    query = applyFilters(query, filters);

    const { data, error, count } = await query;

    if (error) return failure(error.message, ErrorCodes.DATABASE_ERROR);

    const total = count ?? 0;

    return success({
      logs: (data ?? []) as AuditLogEntry[],
      total,
      has_more: offset + limit < total,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load audit logs",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Get Audit Log Stats (for dashboard cards)
// ============================================================

export async function getAuditLogStats(
  days: number = 30,
): Promise<ActionResponse<AuditLogStats>> {
  try {
    await requirePermission(Permissions.VIEW_AUDIT_LOGS);
    const supabase = await createSupabaseServerClient();

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total events in period
    const { count: totalEvents } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    // Critical events in period
    const { count: criticalEvents } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .eq("metadata->>_sensitivity", "critical");

    // Unique users in period
    const { data: uniqueUsersData } = await supabase
      .from("audit_logs")
      .select("user_id")
      .gte("created_at", since.toISOString())
      .not("user_id", "is", null);

    const uniqueUserIds = new Set(
      (uniqueUsersData ?? []).map((r) => r.user_id),
    );

    // Most common action in period
    const { data: actionsData } = await supabase
      .from("audit_logs")
      .select("action")
      .gte("created_at", since.toISOString())
      .limit(500);

    let mostCommonAction: string | null = null;
    if (actionsData && actionsData.length > 0) {
      const actionCounts = new Map<string, number>();
      for (const row of actionsData) {
        actionCounts.set(row.action, (actionCounts.get(row.action) ?? 0) + 1);
      }
      let maxCount = 0;
      for (const [action, count] of actionCounts) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonAction = action;
        }
      }
    }

    return success({
      total_events: totalEvents ?? 0,
      critical_events: criticalEvents ?? 0,
      unique_users: uniqueUserIds.size,
      most_common_action: mostCommonAction,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load stats",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Get Distinct Values (for filter dropdowns)
// ============================================================

export async function getAuditLogFilterOptions(): Promise<
  ActionResponse<{
    entity_types: string[];
    actions: string[];
    users: Array<{ id: string; name: string; email: string }>;
  }>
> {
  try {
    await requirePermission(Permissions.VIEW_AUDIT_LOGS);
    const supabase = await createSupabaseServerClient();

    // Get distinct entity types (last 90 days for performance)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: entityData } = await supabase
      .from("audit_logs")
      .select("entity_type")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .limit(1000);

    const entityTypes = [
      ...new Set((entityData ?? []).map((r) => r.entity_type)),
    ].sort();

    // Get distinct actions
    const { data: actionData } = await supabase
      .from("audit_logs")
      .select("action")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .limit(1000);

    const actions = [
      ...new Set((actionData ?? []).map((r) => r.action)),
    ].sort();

    // Get distinct users who have audit entries
    const { data: userData } = await supabase
      .from("audit_logs")
      .select("user_id, metadata")
      .gte("created_at", ninetyDaysAgo.toISOString())
      .not("user_id", "is", null)
      .limit(1000);

    const userMap = new Map<
      string,
      { id: string; name: string; email: string }
    >();
    for (const row of userData ?? []) {
      if (row.user_id && !userMap.has(row.user_id)) {
        const meta = row.metadata as Record<string, unknown>;
        userMap.set(row.user_id, {
          id: row.user_id,
          name: (meta._user_name as string) ?? "Unknown",
          email: (meta._user_email as string) ?? "",
        });
      }
    }

    return success({
      entity_types: entityTypes,
      actions,
      users: [...userMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to load filter options",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}

// ============================================================
// Export Audit Logs as CSV
// ============================================================
// WHY server-side: Exports up to 10,000 rows matching the
// current filters. Building CSV on the server avoids shipping
// all that data as JSON to the client and re-serializing.
//
// WHY 10k cap: Prevents runaway exports from timing out or
// consuming excessive memory. Schools with more than 10k events
// in a period should narrow their filters.
//
// COLUMNS: Matches what an auditor or compliance officer would
// need — timestamp, user, action, entity, sensitivity, IP,
// plus flattened metadata for forensic detail.
// ============================================================

const EXPORT_MAX_ROWS = 10_000;

export async function exportAuditLogsCsv(
  filters: AuditLogFilters = {},
): Promise<ActionResponse<AuditLogCsvResult>> {
  try {
    await requirePermission(Permissions.VIEW_AUDIT_LOGS);
    const supabase = await createSupabaseServerClient();

    // Fetch all matching logs up to cap, paginated in chunks
    const allLogs: AuditLogEntry[] = [];
    const chunkSize = 500;
    let offset = 0;
    let keepFetching = true;

    while (keepFetching && allLogs.length < EXPORT_MAX_ROWS) {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + chunkSize - 1);

      query = applyFilters(query, filters);

      const { data, error } = await query;

      if (error) {
        return failure(
          `Export failed at offset ${offset}: ${error.message}`,
          ErrorCodes.DATABASE_ERROR,
        );
      }

      const rows = (data ?? []) as AuditLogEntry[];
      allLogs.push(...rows);

      if (rows.length < chunkSize) {
        keepFetching = false;
      } else {
        offset += chunkSize;
      }
    }

    // Trim to cap (in case last chunk pushed us over)
    const exportRows = allLogs.slice(0, EXPORT_MAX_ROWS);

    // Build CSV
    const csvHeaders = [
      "Timestamp",
      "User",
      "Email",
      "Role",
      "Action",
      "Entity Type",
      "Entity ID",
      "Sensitivity",
      "IP Address",
      "User Agent",
      "Metadata",
    ];

    const csvRows = exportRows.map((log) => {
      const meta = log.metadata;
      const userName = (meta._user_name as string) ?? "System";
      const userEmail = (meta._user_email as string) ?? "";
      const role = (meta._role as string) ?? "";
      const sensitivityVal = (meta._sensitivity as string) ?? "low";
      const ip = (meta._ip as string) ?? "";
      const userAgent = (meta._user_agent as string) ?? "";

      // Flatten non-internal metadata for the last column
      const businessMeta = Object.entries(meta)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("; ");

      return [
        log.created_at,
        userName,
        userEmail,
        role,
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        sensitivityVal,
        ip,
        userAgent,
        businessMeta,
      ];
    });

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Generate filename with date range
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filterSuffix = filters.date_from
      ? `_${filters.date_from}_to_${filters.date_to ?? dateStr}`
      : `_${dateStr}`;

    return success({
      csv: csvContent,
      filename: `wattleos_audit_log${filterSuffix}.csv`,
      row_count: exportRows.length,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to export audit logs",
      ErrorCodes.INTERNAL_ERROR,
    );
  }
}