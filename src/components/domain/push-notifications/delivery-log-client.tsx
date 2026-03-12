"use client";

// src/components/domain/push-notifications/delivery-log-client.tsx
//
// Per-dispatch delivery receipt viewer (admin only).

import { DeliveryStatusBadge } from "./dispatch-status-badge";
import type { NotificationDeliveryLog, NotificationDispatch } from "@/types/domain";

interface Props {
  dispatch: NotificationDispatch;
  log: NotificationDeliveryLog[];
}

const PLATFORM_ICONS: Record<string, string> = {
  ios: "🍎",
  android: "🤖",
  web: "🌐",
};

export function DeliveryLogClient({ dispatch, log }: Props) {
  const delivered = log.filter((l) => l.status === "delivered").length;
  const failed = log.filter((l) => l.status === "failed" || l.status === "bounced").length;
  const pending = log.filter((l) => l.status === "pending" || l.status === "sent").length;
  const rate = log.length > 0 ? Math.round((delivered / log.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {dispatch.title}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
          {dispatch.body}
        </p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{log.length}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Recipients</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--push-sent)" }}>{delivered}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Delivered</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--push-sending)" }}>{pending}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>In flight</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--push-failed)" }}>{failed}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Failed</p>
          </div>
        </div>
        {/* Delivery bar */}
        {log.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              <span>Delivery rate</span>
              <span>{rate}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${rate}%`, background: "var(--push-sent)" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Device delivery log
          </h3>
        </div>

        {log.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No delivery records yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span title={entry.platform}>{PLATFORM_ICONS[entry.platform] ?? "📱"}</span>
                  <span
                    className="text-xs font-mono truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {entry.token.slice(0, 20)}…
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DeliveryStatusBadge status={entry.status} />
                  <span className="text-xs hidden sm:block" style={{ color: "var(--muted-foreground)" }}>
                    {entry.sent_at
                      ? new Date(entry.sent_at).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                  {entry.error_message && (
                    <span className="text-xs" style={{ color: "var(--push-failed)" }}>
                      {entry.error_message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
