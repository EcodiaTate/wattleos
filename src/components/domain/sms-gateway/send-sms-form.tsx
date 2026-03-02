"use client";

// src/components/domain/sms-gateway/send-sms-form.tsx
// Single SMS send form - used on the admin send page.

import { useState, useTransition } from "react";
import { sendSmsMessage } from "@/lib/actions/sms-gateway";
import type { SendSmsInput } from "@/lib/validations/sms-gateway";
import { SMS_TEMPLATES, SMS_SEGMENT_LENGTH } from "@/lib/constants/sms-gateway";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  onSent?: () => void;
}

export function SendSmsForm({ onSent }: Props) {
  const haptics = useHaptics();
  const [pending, startTransition] = useTransition();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] =
    useState<SendSmsInput["message_type"]>("general");
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  const segments = Math.max(1, Math.ceil(body.length / SMS_SEGMENT_LENGTH));
  const remaining =
    SMS_SEGMENT_LENGTH -
    (body.length % SMS_SEGMENT_LENGTH || SMS_SEGMENT_LENGTH);

  function applyTemplate(key: string) {
    const tpl = SMS_TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      setBody(tpl.body);
      setMessageType(tpl.type);
      haptics.impact("light");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentId(null);
    haptics.impact("medium");

    startTransition(async () => {
      const result = await sendSmsMessage({
        recipient_phone: phone.trim(),
        recipient_name: name.trim() || undefined,
        message_body: body.trim(),
        message_type: messageType,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        setSentId(result.data?.id ?? "sent");
        setPhone("");
        setName("");
        setBody("");
        haptics.success();
        onSent?.();
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

      {/* Recipient phone */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Phone Number <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+61400000000"
          required
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Recipient name (optional) */}
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Recipient Name{" "}
          <span
            className="text-xs font-normal"
            style={{ color: "var(--muted-foreground)" }}
          >
            (optional)
          </span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Parent/guardian name"
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
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
            setMessageType(e.target.value as SendSmsInput["message_type"])
          }
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
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
            style={{
              color:
                body.length > 0
                  ? "var(--muted-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            {body.length} chars · {segments}{" "}
            {segments === 1 ? "segment" : "segments"} · {remaining} remaining
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          maxLength={1600}
          placeholder="Type your message…"
          className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{
            background: "var(--input)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />
        {segments > 1 && (
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Messages over 160 characters are split into {segments} segments and
            may incur additional charges.
          </p>
        )}
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
      {sentId && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--sms-delivered-bg)",
            color: "var(--sms-delivered-fg)",
          }}
        >
          Message sent successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !phone.trim() || !body.trim()}
        className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all active-push touch-target"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          opacity: pending || !phone.trim() || !body.trim() ? 0.5 : 1,
        }}
      >
        {pending ? "Sending…" : "Send SMS"}
      </button>
    </form>
  );
}
