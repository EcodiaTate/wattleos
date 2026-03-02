"use client";

// src/components/domain/sms-gateway/sms-message-log.tsx
// Paginated table of outbound SMS messages with filter bar.

import { useState, useTransition, useCallback } from "react";
import { listSmsMessages } from "@/lib/actions/sms-gateway";
import type { SmsMessageWithStudent, SmsStatus, SmsMessageType } from "@/types/domain";
import { SMS_STATUS_CONFIG, SMS_MESSAGE_TYPE_LABELS } from "@/lib/constants/sms-gateway";
import { SmsStatusPill } from "./sms-status-pill";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  initialMessages: SmsMessageWithStudent[];
  initialTotal:    number;
}

const STATUS_OPTIONS: { value: SmsStatus | ""; label: string }[] = [
  { value: "",          label: "All statuses" },
  { value: "pending",   label: "Pending" },
  { value: "sent",      label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "failed",    label: "Failed" },
  { value: "bounced",   label: "Bounced" },
  { value: "opted_out", label: "Opted Out" },
];

const TYPE_OPTIONS: { value: SmsMessageType | ""; label: string }[] = [
  { value: "",              label: "All types" },
  { value: "general",       label: "General" },
  { value: "absence_alert", label: "Absence Alert" },
  { value: "emergency",     label: "Emergency" },
  { value: "reminder",      label: "Reminder" },
  { value: "broadcast",     label: "Broadcast" },
];

const PER_PAGE = 50;

export function SmsMessageLog({ initialMessages, initialTotal }: Props) {
  const haptics  = useHaptics();
  const [pending, startTransition] = useTransition();

  const [messages,   setMessages]   = useState(initialMessages);
  const [total,      setTotal]      = useState(initialTotal);
  const [page,       setPage]       = useState(1);
  const [status,     setStatus]     = useState<SmsStatus | "">("");
  const [msgType,    setMsgType]    = useState<SmsMessageType | "">("");
  const [search,     setSearch]     = useState("");

  const totalPages = Math.ceil(total / PER_PAGE);

  const reload = useCallback((newPage: number, newStatus: SmsStatus | "", newType: SmsMessageType | "", newSearch: string) => {
    startTransition(async () => {
      const result = await listSmsMessages({
        page:         newPage,
        per_page:     PER_PAGE,
        status:       newStatus || undefined,
        message_type: newType || undefined,
        search:       newSearch || undefined,
      });
      setMessages(result.data as SmsMessageWithStudent[]);
      setTotal(result.pagination.total);
    });
  }, []);

  function handleFilter() {
    haptics.impact("light");
    setPage(1);
    reload(1, status, msgType, search);
  }

  function handlePage(p: number) {
    haptics.impact("light");
    setPage(p);
    reload(p, status, msgType, search);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SmsStatus | "")}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Type</label>
          <select
            value={msgType}
            onChange={(e) => setMsgType(e.target.value as SmsMessageType | "")}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Phone</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone…"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>

        <button
          onClick={handleFilter}
          disabled={pending}
          className="rounded-xl px-4 py-2 text-sm font-semibold active-push touch-target"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: pending ? 0.7 : 1 }}
        >
          {pending ? "Loading…" : "Filter"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--muted)" }}>
              {["Date/Time", "Phone", "Recipient", "Type", "Status", "Segments", "Message"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  No messages found.
                </td>
              </tr>
            ) : (
              messages.map((msg, i) => (
                <tr
                  key={msg.id}
                  className="border-t transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: i % 2 === 0 ? "var(--card)" : "var(--background)",
                  }}
                >
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(msg.queued_at).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--foreground)" }}>
                    {msg.recipient_phone}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--foreground)" }}>
                    {msg.recipient_name ?? (msg.student ? `${msg.student.first_name} ${msg.student.last_name}` : "—")}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {SMS_MESSAGE_TYPE_LABELS[msg.message_type] ?? msg.message_type}
                  </td>
                  <td className="px-3 py-2">
                    <SmsStatusPill status={msg.status} size="sm" />
                  </td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {msg.segment_count}
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    <p className="line-clamp-2 text-xs" style={{ color: "var(--foreground)" }}>
                      {msg.message_body}
                    </p>
                    {msg.error_message && (
                      <p className="mt-0.5 text-[10px]" style={{ color: "var(--sms-failed-fg)" }}>
                        {msg.error_message}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {total} message{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1 || pending}
              className="rounded-lg border px-3 py-1.5 text-xs active-push"
              style={{ borderColor: "var(--border)", color: "var(--foreground)", opacity: page <= 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <button
              onClick={() => handlePage(page + 1)}
              disabled={page >= totalPages || pending}
              className="rounded-lg border px-3 py-1.5 text-xs active-push"
              style={{ borderColor: "var(--border)", color: "var(--foreground)", opacity: page >= totalPages ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
