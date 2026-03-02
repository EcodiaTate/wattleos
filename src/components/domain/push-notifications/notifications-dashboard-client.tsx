"use client";

// src/components/domain/push-notifications/notifications-dashboard-client.tsx

import Link from "next/link";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { sendDispatch, cancelDispatch, deleteDispatch } from "@/lib/actions/push-notifications";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { DispatchStatusBadge } from "./dispatch-status-badge";
import type { NotificationDashboardData, NotificationDispatchWithAuthor, NotificationTopic } from "@/types/domain";

const TOPIC_EMOJIS: Record<NotificationTopic, string> = {
  announcements: "📢",
  messages: "💬",
  attendance: "✅",
  events: "📅",
  incidents: "🚨",
  bookings: "🎒",
  reports: "📊",
  billing: "🧾",
  rostering: "📅",
  observations: "👁",
  emergency: "🆘",
  general: "🔔",
};

interface Props {
  data: NotificationDashboardData;
}

export function NotificationsDashboardClient({ data }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  function handleSend(dispatch: NotificationDispatchWithAuthor) {
    haptics.impact("heavy");
    setActionId(dispatch.id);
    startTransition(async () => {
      const result = await sendDispatch({ dispatch_id: dispatch.id });
      if (result.error) {
        haptics.error();
        alert(result.error.message);
      } else {
        haptics.success();
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleCancel(dispatch: NotificationDispatchWithAuthor) {
    haptics.impact("medium");
    setActionId(dispatch.id);
    startTransition(async () => {
      await cancelDispatch({ dispatch_id: dispatch.id });
      haptics.success();
      router.refresh();
      setActionId(null);
    });
  }

  function handleDelete(dispatch: NotificationDispatchWithAuthor) {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    haptics.impact("medium");
    setActionId(dispatch.id);
    startTransition(async () => {
      await deleteDispatch(dispatch.id);
      haptics.success();
      router.refresh();
      setActionId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Total Dispatches
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            {data.total_dispatches}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Sent (30 days)
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--push-sent)" }}>
            {data.sent_last_30d}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Avg Delivery Rate
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{
              color:
                data.avg_delivery_rate >= 90
                  ? "var(--push-sent)"
                  : data.avg_delivery_rate >= 70
                  ? "var(--push-sending)"
                  : "var(--push-failed)",
            }}
          >
            {data.avg_delivery_rate}%
          </p>
        </div>
      </div>

      {/* Topic breakdown */}
      {data.topic_breakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Topics sent (last 30 days)
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.topic_breakdown.map(({ topic, count }) => (
              <div
                key={topic}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-border"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
              >
                <span>{TOPIC_EMOJIS[topic]}</span>
                <span>{topic}</span>
                <span
                  className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent dispatches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Recent Dispatches
          </h3>
          <Link
            href="/admin/notifications/history"
            className="text-xs"
            style={{ color: "var(--primary)" }}
          >
            View all →
          </Link>
        </div>

        {data.recent_dispatches.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              No dispatches yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Create your first push notification above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recent_dispatches.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl shrink-0">{TOPIC_EMOJIS[d.topic]}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--foreground)" }}>
                        {d.title}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted-foreground)" }}>
                        {d.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <DispatchStatusBadge status={d.status} />
                        {d.status === "sent" && (
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {d.delivered_count}/{d.recipient_count} delivered
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {new Date(d.created_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(d.status === "draft" || d.status === "scheduled") && (
                      <>
                        <Link
                          href={`/admin/notifications/${d.id}/edit`}
                          className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs font-medium active-push"
                          style={{ color: "var(--foreground)" }}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={isPending && actionId === d.id}
                          onClick={() => handleSend(d)}
                          className="touch-target rounded-lg px-3 py-1.5 text-xs font-semibold active-push disabled:opacity-50"
                          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                        >
                          {isPending && actionId === d.id ? "…" : "Send Now"}
                        </button>
                        <button
                          type="button"
                          disabled={isPending && actionId === d.id}
                          onClick={() => handleCancel(d)}
                          className="touch-target rounded-lg border border-border px-2 py-1.5 text-xs active-push"
                          style={{ color: "var(--muted-foreground)" }}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {(d.status === "draft" || d.status === "cancelled" || d.status === "failed") && (
                      <button
                        type="button"
                        disabled={isPending && actionId === d.id}
                        onClick={() => handleDelete(d)}
                        className="touch-target rounded-lg border border-border px-2 py-1.5 text-xs active-push"
                        style={{ color: "var(--muted-foreground)" }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    )}
                    {d.status === "sent" && (
                      <Link
                        href={`/admin/notifications/${d.id}`}
                        className="touch-target rounded-lg border border-border px-3 py-1.5 text-xs active-push"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Receipts
                      </Link>
                    )}
                  </div>
                </div>

                {/* Delivery bar for sent dispatches */}
                {d.status === "sent" && d.recipient_count > 0 && (
                  <div className="mt-3">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "var(--muted)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((d.delivered_count / d.recipient_count) * 100)}%`,
                          background: "var(--push-sent)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
