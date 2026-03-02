import Link from "next/link";
import { getTenantContext } from "@/lib/auth/tenant-context";
import {
  getChildCareHistory,
  getChildCareLogForDate,
} from "@/lib/actions/daily-care";
import { ParentCareSummary } from "@/components/domain/daily-care-log/parent-care-summary";
import { ParentCareTimeline } from "@/components/domain/daily-care-log/parent-care-timeline";
import { CareLogStatusBadge } from "@/components/domain/daily-care-log/care-log-status-badge";

export const metadata = { title: "Daily Care Log - WattleOS" };

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ParentDailyCareLogPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;

  // getTenantContext still needed for auth - RLS enforces guardian access
  await getTenantContext();

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch today's log and recent history in parallel
  const [todayResult, historyResult] = await Promise.all([
    getChildCareLogForDate(studentId, todayStr),
    getChildCareHistory(studentId, 1, 10),
  ]);

  const todayLog = todayResult.data ?? null;
  const historyItems = historyResult.data ?? [];
  const totalItems = historyResult.pagination?.total ?? 0;

  // Filter out today's log from history to avoid duplication
  const pastItems = historyItems.filter((item) => item.log_date !== todayStr);

  const hasAnyContent = todayLog || pastItems.length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Link
          href={`/my-children/${studentId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Daily Care Log
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Daily care records shared by educators
        </p>
      </div>

      {/* Empty state */}
      {!hasAnyContent && (
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <svg
              className="h-6 w-6"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No Daily Care Logs Yet
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Your child&apos;s daily care log will appear here once shared by
            educators.
          </p>
        </div>
      )}

      {/* Today's log */}
      {todayLog && (
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Today
          </h2>
          <ParentCareSummary log={todayLog} />
          {todayLog.entries.length > 0 && (
            <ParentCareTimeline entries={todayLog.entries} />
          )}
        </div>
      )}

      {/* Past logs list */}
      {pastItems.length > 0 && (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Recent Days
          </h2>
          <div className="space-y-2">
            {pastItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatDate(item.log_date)}
                  </p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.entry_count}{" "}
                    {item.entry_count === 1 ? "entry" : "entries"}
                  </p>
                </div>
                <CareLogStatusBadge status={item.status} />
              </div>
            ))}
          </div>
          {totalItems > 10 && (
            <p
              className="text-center text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Showing most recent logs. {totalItems} total records available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
