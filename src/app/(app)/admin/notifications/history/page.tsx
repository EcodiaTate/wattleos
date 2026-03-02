// src/app/(app)/admin/notifications/history/page.tsx
// Paginated history of all dispatches.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listDispatches } from "@/lib/actions/push-notifications";
import { DispatchStatusBadge } from "@/components/domain/push-notifications/dispatch-status-badge";
import type { NotificationStatus, NotificationTopic } from "@/types/domain";

export const metadata = { title: "Notification History" };

const TOPIC_EMOJIS: Record<NotificationTopic, string> = {
  announcements: "📢", messages: "💬", attendance: "✅", events: "📅",
  incidents: "🚨", bookings: "🎒", reports: "📊", billing: "🧾",
  rostering: "📅", observations: "👁", emergency: "🆘", general: "🔔",
};

interface Props {
  searchParams: Promise<{ page?: string; status?: string; topic?: string }>;
}

export default async function NotificationHistoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.VIEW_NOTIFICATION_ANALYTICS)) {
    redirect("/admin/notifications");
  }

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const status = sp.status as NotificationStatus | undefined;
  const topic = sp.topic as NotificationTopic | undefined;

  const result = await listDispatches({ page, status, topic, page_size: 20 });

  const statuses: NotificationStatus[] = ["draft", "scheduled", "sending", "sent", "cancelled", "failed"];

  function buildUrl(params: Record<string, string | number | undefined>) {
    const base = new URLSearchParams();
    const merged = { page, status, topic, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined) base.set(k, String(v)); });
    return `/admin/notifications/history?${base.toString()}`;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/notifications"
          className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
          style={{ color: "var(--foreground)" }}
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Notification History
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ status: undefined, page: 1 })}
          className="rounded-full px-3 py-1 text-xs font-medium border transition-all active-push"
          style={{
            borderColor: !status ? "var(--primary)" : "var(--border)",
            background: !status ? "var(--primary)" : "var(--card)",
            color: !status ? "var(--primary-foreground)" : "var(--foreground)",
          }}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s, page: 1 })}
            className="rounded-full px-3 py-1 text-xs font-medium border transition-all active-push"
            style={{
              borderColor: status === s ? "var(--primary)" : "var(--border)",
              background: status === s ? "var(--primary)" : "var(--card)",
              color: status === s ? "var(--primary-foreground)" : "var(--foreground)",
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* List */}
      {result.data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No dispatches found.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {result.data.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-xl shrink-0">{TOPIC_EMOJIS[d.topic]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                  {d.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <DispatchStatusBadge status={d.status} />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {d.status === "sent" && `${d.delivered_count}/${d.recipient_count} delivered`}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(d.created_at).toLocaleDateString("en-AU", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              {d.status === "sent" && (
                <Link
                  href={`/admin/notifications/${d.id}`}
                  className="shrink-0 text-xs active-push"
                  style={{ color: "var(--primary)" }}
                >
                  Receipts →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {result.pagination.total} total
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: page - 1 })}
              className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs active-push"
              style={{ color: "var(--foreground)" }}
            >
              ← Prev
            </Link>
          )}
          {result.data.length === 20 && (
            <Link
              href={buildUrl({ page: page + 1 })}
              className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs active-push"
              style={{ color: "var(--foreground)" }}
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
