import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getChildCareHistory,
  listEligibleChildren,
} from "@/lib/actions/daily-care";
import { CareLogStatusBadge } from "@/components/domain/daily-care-log/care-log-status-badge";

export const metadata = { title: "Care History - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function CareHistoryPage({ params }: Props) {
  const { studentId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_DAILY_CARE_LOGS) ||
    hasPermission(context, Permissions.MANAGE_DAILY_CARE_LOGS);
  if (!canView) redirect("/dashboard");

  const [historyResult, childrenResult] = await Promise.all([
    getChildCareHistory(studentId),
    listEligibleChildren(),
  ]);

  // Resolve student name from children list
  let studentName = "Unknown Child";
  if (childrenResult.data) {
    const child = childrenResult.data.find((c) => c.id === studentId);
    if (child) {
      const preferred = child.preferred_name;
      const firstName = preferred ?? child.first_name;
      studentName = `${firstName} ${child.last_name}`;
    }
  }

  if (historyResult.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {historyResult.error.message}
        </p>
      </div>
    );
  }

  const logs = historyResult.data;
  const pagination = historyResult.pagination;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/daily-care-log"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Daily Care Log
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link
          href={`/admin/daily-care-log/${studentId}`}
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {studentName}
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>History</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Care History
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Shared daily care logs for {studentName}
        </p>
      </div>

      {/* ── Log List ────────────────────────────────────────────── */}
      {logs.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-border py-12"
          style={{ background: "var(--card)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={48}
            height={48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--empty-state-icon)" }}
          >
            <circle cx={12} cy={12} r={10} />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            No shared care logs yet
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Logs will appear here once they have been shared with the family
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const logDate = new Date(
              log.log_date + "T00:00:00",
            ).toLocaleDateString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const lastEntryTime = log.last_entry_at
              ? new Date(log.last_entry_at).toLocaleTimeString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : null;

            return (
              <Link
                key={log.id}
                href={`/admin/daily-care-log/${studentId}`}
                className="card-interactive flex items-center gap-4 rounded-[var(--radius-lg)] border border-border p-4"
                style={{ background: "var(--card)" }}
              >
                {/* ── Date Icon ─────────────────────────────────── */}
                <div
                  className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)]"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase leading-none">
                    {new Date(log.log_date + "T00:00:00").toLocaleDateString(
                      "en-AU",
                      { month: "short" },
                    )}
                  </span>
                  <span className="text-lg font-bold leading-tight">
                    {new Date(log.log_date + "T00:00:00").getDate()}
                  </span>
                </div>

                {/* ── Log Info ──────────────────────────────────── */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {logDate}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {log.entry_count}{" "}
                      {log.entry_count === 1 ? "entry" : "entries"}
                    </span>
                    {lastEntryTime && (
                      <span style={{ color: "var(--muted-foreground)" }}>
                        Last: {lastEntryTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Status Badge ─────────────────────────────── */}
                <div className="shrink-0">
                  <CareLogStatusBadge status={log.status} />
                </div>

                {/* ── Chevron ───────────────────────────────────── */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Pagination Info ─────────────────────────────────────── */}
      {pagination.total_pages > 1 && (
        <div
          className="flex items-center justify-center gap-4 py-2"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p className="text-sm">
            Page {pagination.page} of {pagination.total_pages} ({pagination.total}{" "}
            {pagination.total === 1 ? "log" : "logs"})
          </p>
        </div>
      )}

      {/* ── Back Link ────────────────────────────────────────────── */}
      <div>
        <Link
          href={`/admin/daily-care-log/${studentId}`}
          className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Today
        </Link>
      </div>
    </div>
  );
}
