// src/app/(app)/admin/audit-logs/audit-log-client.tsx
//
// ============================================================
// WattleOS V2 - Audit Log Client (Interactive Viewer)
// ============================================================
// Client component handling filtering, pagination, row
// expansion, CSV export, and real-time filter updates for
// audit logs.
//
// WHY client component: Filters, pagination, and expandable
// rows all require interactivity. We minimize client JS by
// keeping the page.tsx as a server component and only shipping
// this interactive shell to the browser.
//
// DESIGN: Uses WattleOS global CSS variables (--audit-*)
// for severity badges. No emojis — SVG icons throughout.
//
// EXPORT: CSV export for compliance and auditor handoff.
// Exports all logs matching current filters (not just the
// visible page) via a server action that returns CSV string.
// ============================================================

"use client";

import { useCallback, useState, useTransition } from "react";

import {
  exportAuditLogsCsv,
  listAuditLogs,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditLogStats,
} from "@/lib/actions/audit-logs";

// ============================================================
// Types
// ============================================================

interface AuditLogClientProps {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
  initialHasMore: boolean;
  stats: AuditLogStats | null;
  filterOptions: {
    entity_types: string[];
    actions: string[];
    users: Array<{ id: string; name: string; email: string }>;
  } | null;
}

// ============================================================
// Constants
// ============================================================

const PAGE_SIZE = 50;

/** Maps sensitivity levels to CSS variable names from --audit-* in globals.css */
const SENSITIVITY_CONFIG: Record<
  string,
  { var: string; label: string }
> = {
  critical: { var: "audit-critical", label: "Critical" },
  high: { var: "audit-high", label: "High" },
  medium: { var: "audit-medium", label: "Medium" },
  low: { var: "audit-low", label: "Low" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  student: "Student",
  medical_condition: "Medical",
  custody_restriction: "Custody",
  guardian: "Guardian",
  emergency_contact: "Emergency Contact",
  pickup_authorization: "Pickup Auth",
  observation: "Observation",
  attendance: "Attendance",
  invoice: "Invoice",
  fee_schedule: "Fee Schedule",
  report: "Report",
  user: "User",
  enrollment: "Enrollment",
  application: "Application",
  invitation: "Invitation",
  integration: "Integration",
  import: "Import",
  tenant: "Tenant",
  role: "Role",
  permission: "Permission",
};

// ============================================================
// Component
// ============================================================

export function AuditLogClient({
  initialLogs,
  initialTotal,
  initialHasMore,
  stats,
  filterOptions,
}: AuditLogClientProps) {
  // ── State ─────────────────────────────────────────────────
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sensitivity, setSensitivity] = useState("");
  const [search, setSearch] = useState("");

  // ── Build current filters object ──────────────────────────
  const buildFilters = useCallback(
    (overrides?: Partial<AuditLogFilters>): AuditLogFilters => ({
      entity_type: entityType || undefined,
      action: action || undefined,
      user_id: userId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sensitivity:
        (sensitivity as AuditLogFilters["sensitivity"]) || undefined,
      search: search || undefined,
      ...overrides,
    }),
    [entityType, action, userId, dateFrom, dateTo, sensitivity, search],
  );

  // ── Fetch ─────────────────────────────────────────────────
  const fetchLogs = useCallback(
    (newPage: number, overrideFilters?: Partial<AuditLogFilters>) => {
      startTransition(async () => {
        const filters = buildFilters({
          limit: PAGE_SIZE,
          offset: newPage * PAGE_SIZE,
          ...overrideFilters,
        });

        const result = await listAuditLogs(filters);
        if (result.data) {
          setLogs(result.data.logs);
          setTotal(result.data.total);
          setHasMore(result.data.has_more);
          setPage(newPage);
          setExpandedId(null);
        }
      });
    },
    [buildFilters],
  );

  const handleFilter = () => fetchLogs(0);

  const handleClearFilters = () => {
    setEntityType("");
    setAction("");
    setUserId("");
    setDateFrom("");
    setDateTo("");
    setSensitivity("");
    setSearch("");
    startTransition(async () => {
      const result = await listAuditLogs({ limit: PAGE_SIZE, offset: 0 });
      if (result.data) {
        setLogs(result.data.logs);
        setTotal(result.data.total);
        setHasMore(result.data.has_more);
        setPage(0);
        setExpandedId(null);
      }
    });
  };

  // ── Export ─────────────────────────────────────────────────
  // WHY server-side CSV: We export ALL matching logs (not just
  // the current page), which could be thousands of rows. The
  // server action handles pagination internally and returns a
  // complete CSV string. This ensures consistency and avoids
  // client-side memory issues.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filters = buildFilters();
      const result = await exportAuditLogsCsv(filters);

      if (result.data) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    entityType ||
    action ||
    userId ||
    dateFrom ||
    dateTo ||
    sensitivity ||
    search;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Filters */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label
              htmlFor="audit-search"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Search
            </label>
            <input
              id="audit-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              placeholder="Search actions or entities..."
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Entity Type */}
          <div>
            <label
              htmlFor="audit-entity"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Entity Type
            </label>
            <select
              id="audit-entity"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All entities</option>
              {(filterOptions?.entity_types ?? []).map((et) => (
                <option key={et} value={et}>
                  {ENTITY_TYPE_LABELS[et] ?? et}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label
              htmlFor="audit-action"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Action
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All actions</option>
              {(filterOptions?.actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {formatActionLabel(a)}
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div>
            <label
              htmlFor="audit-user"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              User
            </label>
            <select
              id="audit-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All users</option>
              {(filterOptions?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Sensitivity */}
          <div>
            <label
              htmlFor="audit-sensitivity"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Sensitivity
            </label>
            <select
              id="audit-sensitivity"
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              htmlFor="audit-date-from"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              From
            </label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Date To */}
          <div>
            <label
              htmlFor="audit-date-to"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              To
            </label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleFilter}
              disabled={isPending}
              className="w-full rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>
      </div>

      {/* Results Header + Export */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No audit events found"
            : `Showing ${page * PAGE_SIZE + 1}\u2013${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()} events`}
        </p>
        <div className="flex items-center gap-3">
          {isPending && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
          {total > 0 && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Timestamp
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Action
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Entity
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Sensitivity
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  IP
                </th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedId === log.id}
                  onToggle={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {logs.length === 0 && !isPending && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
            />
          </svg>
          <p className="mt-3 text-sm text-muted-foreground">
            No audit events match your filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-2 text-xs text-primary underline hover:text-primary/80"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fetchLogs(page - 1)}
            disabled={page === 0 || isPending}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Previous
          </button>

          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>

          <button
            type="button"
            onClick={() => fetchLogs(page + 1)}
            disabled={!hasMore || isPending}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            Next
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatsCards({ stats }: { stats: AuditLogStats }) {
  const cards: Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
    severity?: string;
  }> = [
    {
      label: "Events (30d)",
      value: stats.total_events.toLocaleString(),
      icon: <ChartIcon />,
    },
    {
      label: "Critical Events",
      value: stats.critical_events.toLocaleString(),
      icon: <ShieldAlertIcon />,
      severity: stats.critical_events > 0 ? "critical" : undefined,
    },
    {
      label: "Active Users",
      value: stats.unique_users.toLocaleString(),
      icon: <UserIcon />,
    },
    {
      label: "Most Common",
      value: stats.most_common_action
        ? formatActionLabel(stats.most_common_action)
        : "\u2014",
      icon: <RepeatIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const hasSeverity = !!card.severity;
        const config = card.severity
          ? SENSITIVITY_CONFIG[card.severity]
          : null;

        return (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-background p-4"
            style={
              hasSeverity && config
                ? {
                    borderColor: `var(--${config.var})`,
                    backgroundColor: `var(--${config.var}-bg)`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span
                className="text-muted-foreground"
                style={
                  hasSeverity && config
                    ? { color: `var(--${config.var})` }
                    : undefined
                }
              >
                {card.icon}
              </span>
              <span className="text-xs text-muted-foreground">
                {card.label}
              </span>
            </div>
            <p
              className="mt-1 text-lg font-semibold text-foreground"
              style={
                hasSeverity && config
                  ? { color: `var(--${config.var})` }
                  : undefined
              }
            >
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function AuditLogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const meta = log.metadata;
  const sensitivityKey = (meta._sensitivity as string) ?? "low";
  const config = SENSITIVITY_CONFIG[sensitivityKey] ?? SENSITIVITY_CONFIG.low;
  const userName = (meta._user_name as string) ?? "System";
  const userEmail = (meta._user_email as string) ?? "";
  const ip = (meta._ip as string) ?? "\u2014";
  const entityLabel = ENTITY_TYPE_LABELS[log.entity_type] ?? log.entity_type;

  // Filter out internal metadata keys for the expanded view
  const displayMeta = Object.entries(meta).filter(
    ([key]) => !key.startsWith("_"),
  );

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-border transition-colors hover:bg-muted/20 ${
          isExpanded ? "bg-muted/10" : ""
        }`}
        onClick={onToggle}
      >
        {/* Timestamp */}
        <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
          {formatTimestamp(log.created_at)}
        </td>

        {/* User */}
        <td className="px-4 py-2.5">
          <div className="text-xs font-medium text-foreground">{userName}</div>
          {userEmail && (
            <div className="text-[11px] text-muted-foreground">{userEmail}</div>
          )}
        </td>

        {/* Action */}
        <td className="px-4 py-2.5">
          <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs text-foreground">
            {formatActionLabel(log.action)}
          </span>
        </td>

        {/* Entity */}
        <td className="px-4 py-2.5">
          <span className="text-xs text-foreground">{entityLabel}</span>
          {log.entity_id && (
            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
              {log.entity_id.slice(0, 8)}...
            </span>
          )}
        </td>

        {/* Sensitivity */}
        <td className="px-4 py-2.5">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `var(--${config.var}-bg)`,
              color: `var(--${config.var})`,
            }}
          >
            {config.label}
          </span>
        </td>

        {/* IP */}
        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          {ip}
        </td>

        {/* Expand Arrow */}
        <td className="px-4 py-2.5 text-center text-muted-foreground">
          <svg
            className={`inline-block h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </td>
      </tr>

      {/* Expanded metadata */}
      {isExpanded && (
        <tr className="border-b border-border bg-muted/5">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* IDs */}
              <div className="space-y-1">
                <MetaRow label="Log ID" value={log.id} mono />
                {log.entity_id && (
                  <MetaRow label="Entity ID" value={log.entity_id} mono />
                )}
                {log.user_id && (
                  <MetaRow label="User ID" value={log.user_id} mono />
                )}
                <MetaRow
                  label="User Agent"
                  value={(meta._user_agent as string) ?? "\u2014"}
                  truncate
                />
                <MetaRow label="Role" value={(meta._role as string) ?? "\u2014"} />
              </div>

              {/* Business metadata */}
              <div className="space-y-1">
                {displayMeta.length > 0 ? (
                  displayMeta.map(([key, value]) => (
                    <MetaRow
                      key={key}
                      label={formatMetaKey(key)}
                      value={formatMetaValue(value)}
                    />
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    No additional metadata
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MetaRow({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span
        className={`text-foreground ${mono ? "font-mono text-[11px]" : ""} ${
          truncate ? "max-w-[300px] truncate" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// SVG Icons (replacing emojis)
// ============================================================

function ChartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
    </svg>
  );
}

// ============================================================
// Formatters
// ============================================================

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatActionLabel(action: string): string {
  // "student.created" -> "Student Created"
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetaKey(key: string): string {
  // "student_id" -> "Student ID", "updated_fields" -> "Updated Fields"
  return key
    .replace(/_/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}