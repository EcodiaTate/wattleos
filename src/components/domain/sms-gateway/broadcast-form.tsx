"use client";

// src/components/domain/sms-gateway/broadcast-form.tsx
// Broadcast SMS form - paste/upload phone list, write message, send.

import { useState, useTransition } from "react";
import { broadcastSms } from "@/lib/actions/sms-gateway";
import { SMS_TEMPLATES, SMS_SEGMENT_LENGTH } from "@/lib/constants/sms-gateway";
import type { BroadcastSmsInput } from "@/lib/validations/sms-gateway";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  onSent?: (stats: { sent: number; failed: number; opted_out: number }) => void;
}

/** Parse a newline/comma-separated phone number list into E.164-like strings. */
function parsePhoneList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().replace(/\s/g, ""))
    .filter(Boolean);
}

export function BroadcastForm({ onSent }: Props) {
  const haptics = useHaptics();
  const [pending, startTransition] = useTransition();

  const [phoneList, setPhoneList] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] =
    useState<BroadcastSmsInput["message_type"]>("broadcast");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    opted_out: number;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const phones = parsePhoneList(phoneList);
  const segments = Math.max(1, Math.ceil(body.length / SMS_SEGMENT_LENGTH));

  function applyTemplate(key: string) {
    const tpl = SMS_TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      setBody(tpl.body);
      setMessageType(tpl.type as BroadcastSmsInput["message_type"]);
      haptics.impact("light");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setError(null);
    setResult(null);
    setConfirmed(false);
    haptics.impact("heavy");

    const recipients = phones.map((phone) => ({ phone }));

    startTransition(async () => {
      const res = await broadcastSms({
        recipients,
        message_body: body.trim(),
        message_type: messageType,
      });

      if (res.error) {
        setError(res.error.message);
        haptics.error();
      } else if (res.data) {
        setResult(res.data);
        setPhoneList("");
        setBody("");
        haptics.success();
        onSent?.(res.data);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Template picker */}
      <div>
        <label
          className="mb-1 block text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          Template (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {SMS_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-all active-push"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
                background: "var(--card)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phone list */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Recipients <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          {phones.length > 0 && (
            <span
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              {phones.length} number{phones.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <textarea
          value={phoneList}
          onChange={(e) => setPhoneList(e.target.value)}
          required
          rows={5}
          placeholder={
            "+61400000000\n+61411111111\n+61422222222\nOne number per line, or comma-separated"
          }
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none font-mono"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Message type */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Message Type
        </label>
        <select
          value={messageType}
          onChange={(e) =>
            setMessageType(e.target.value as BroadcastSmsInput["message_type"])
          }
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <option value="broadcast">Broadcast</option>
          <option value="general">General</option>
          <option value="absence_alert">Absence Alert</option>
          <option value="emergency">Emergency</option>
          <option value="reminder">Reminder</option>
        </select>
      </div>

      {/* Message body */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Message <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {body.length} chars · {segments}{" "}
            {segments === 1 ? "segment" : "segments"}
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          maxLength={1600}
          placeholder="Type your broadcast message…"
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {error && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--sms-failed-bg)",
            color: "var(--sms-failed-fg)",
          }}
        >
          {error}
        </p>
      )}
      {result && (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{
            borderColor: "var(--sms-delivered-bg)",
            background: "var(--sms-delivered-bg)",
            color: "var(--sms-delivered-fg)",
          }}
        >
          <p className="font-semibold">Broadcast complete</p>
          <p>
            {result.sent} sent · {result.failed} failed · {result.opted_out}{" "}
            opted out
          </p>
        </div>
      )}

      {/* Confirm step */}
      {confirmed && (
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--warning-border, var(--border))",
            background: "var(--sms-bounced-bg)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--sms-bounced-fg)" }}
          >
            Confirm broadcast to {phones.length} recipients?
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--sms-bounced-fg)" }}
          >
            This will send {segments * phones.length} SMS segment
            {segments * phones.length !== 1 ? "s" : ""}. Click Send again to
            confirm.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || phones.length === 0 || !body.trim()}
        className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all active-push touch-target"
        style={{
          background: confirmed
            ? "var(--destructive, var(--primary))"
            : "var(--primary)",
          color: "var(--primary-foreground)",
          opacity: pending || phones.length === 0 || !body.trim() ? 0.5 : 1,
        }}
      >
        {pending
          ? "Sending…"
          : confirmed
            ? `Confirm - Send to ${phones.length} recipients`
            : `Send Broadcast (${phones.length} recipients)`}
      </button>
    </form>
  );
}
