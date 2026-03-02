"use client";

// src/components/domain/sms-gateway/sms-dashboard-client.tsx

import Link from "next/link";
import type { SmsDashboardData } from "@/types/domain";
import { SmsStatusPill } from "./sms-status-pill";

interface Props {
  data: SmsDashboardData;
}

export function SmsDashboardClient({ data }: Props) {
  const { config, stats_30d: s, recent_messages, failed_messages } = data;

  const limitPct = config
    ? Math.min(100, Math.round((s.segments_used_today / s.daily_limit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Gateway status banner */}
      <div
        className="flex items-center justify-between rounded-2xl border p-4"
        style={{
          borderColor: config?.enabled
            ? "var(--sms-delivered-bg)"
            : "var(--sms-failed-bg)",
          background: config?.enabled
            ? "var(--sms-delivered-bg)"
            : "var(--sms-failed-bg)",
        }}
      >
        <div>
          <p
            className="text-sm font-semibold"
            style={{
              color: config?.enabled
                ? "var(--sms-delivered-fg)"
                : "var(--sms-failed-fg)",
            }}
          >
            {config
              ? config.enabled
                ? `Gateway active · ${config.provider === "messagemedia" ? "MessageMedia" : "Burst SMS"}`
                : "Gateway disabled"
              : "Gateway not configured"}
          </p>
          {config && (
            <p
              className="mt-0.5 text-xs"
              style={{
                color: config.enabled
                  ? "var(--sms-delivered-fg)"
                  : "var(--sms-failed-fg)",
              }}
            >
              Sender: {config.sender_id} · {config.opt_out_count} opted out
            </p>
          )}
        </div>
        <Link
          href="/admin/sms-gateway/settings"
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold active-push touch-target"
          style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
        >
          Settings
        </Link>
      </div>

      {/* Daily limit bar */}
      {config && (
        <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: "var(--foreground)" }}>Today&apos;s Usage</span>
            <span style={{ color: "var(--muted-foreground)" }}>
              {s.segments_used_today} / {s.daily_limit} segments
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--muted)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:      `${limitPct}%`,
                background: limitPct >= 90
                  ? "var(--sms-failed)"
                  : limitPct >= 70
                  ? "var(--sms-bounced)"
                  : "var(--sms-delivered)",
              }}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {limitPct}% of daily limit used
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total (30d)",  value: s.total,         color: "var(--foreground)" },
          { label: "Sent",         value: s.sent,          color: "var(--sms-sent-fg)" },
          { label: "Delivered",    value: s.delivered,     color: "var(--sms-delivered-fg)" },
          { label: "Failed",       value: s.failed,        color: "var(--sms-failed-fg)" },
          { label: "Pending",      value: s.pending,       color: "var(--sms-pending-fg)" },
          { label: "Delivery Rate",value: `${s.delivery_rate}%`, color: s.delivery_rate >= 90 ? "var(--sms-delivered-fg)" : "var(--sms-bounced-fg)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-3 text-center"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/sms-gateway/send"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold active-push touch-target"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", borderColor: "var(--primary)" }}
        >
          Send SMS
        </Link>
        <Link
          href="/admin/sms-gateway/broadcast"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold active-push touch-target"
          style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          Broadcast
        </Link>
        <Link
          href="/admin/sms-gateway/log"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold active-push touch-target"
          style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          Message Log
        </Link>
        <Link
          href="/admin/sms-gateway/opt-outs"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold active-push touch-target"
          style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }}
        >
          Opt-Out List
        </Link>
      </div>

      {/* Failed messages */}
      {failed_messages.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Recent Failures ({failed_messages.length})
          </h2>
          <div className="space-y-2">
            {failed_messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-3 rounded-xl border p-3"
                style={{ borderColor: "var(--sms-failed-bg)", background: "var(--sms-failed-bg)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono" style={{ color: "var(--sms-failed-fg)" }}>
                    {msg.recipient_phone}
                  </p>
                  <p className="text-xs line-clamp-1" style={{ color: "var(--muted-foreground)" }}>
                    {msg.error_message ?? "No error details"}
                  </p>
                </div>
                <SmsStatusPill status={msg.status} size="sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent messages */}
      {recent_messages.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Recent Messages</h2>
            <Link href="/admin/sms-gateway/log" className="text-xs font-medium" style={{ color: "var(--primary)" }}>
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--muted)" }}>
                  {["Time", "Phone", "Type", "Status", "Message"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent_messages.slice(0, 10).map((msg, i) => (
                  <tr
                    key={msg.id}
                    className="border-t"
                    style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--card)" : "var(--background)" }}
                  >
                    <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(msg.queued_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: "var(--foreground)" }}>{msg.recipient_phone}</td>
                    <td className="px-3 py-2" style={{ color: "var(--muted-foreground)" }}>{msg.message_type}</td>
                    <td className="px-3 py-2"><SmsStatusPill status={msg.status} size="sm" /></td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <p className="line-clamp-1" style={{ color: "var(--foreground)" }}>{msg.message_body}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
