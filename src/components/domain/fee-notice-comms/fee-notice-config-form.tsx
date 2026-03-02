"use client";

// src/components/domain/fee-notice-comms/fee-notice-config-form.tsx

import { useState, useTransition } from "react";
import { upsertFeeNoticeConfig } from "@/lib/actions/fee-notice-comms";
import type { FeeNoticeConfig, FeeNoticeTrigger, FeeNoticeChannel } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";

const ALL_TRIGGERS: { value: FeeNoticeTrigger; label: string }[] = [
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "invoice_overdue", label: "Invoice Overdue" },
  { value: "payment_received", label: "Payment Received" },
  { value: "payment_failed", label: "Payment Failed" },
  { value: "reminder_1", label: "Reminder 1" },
  { value: "reminder_2", label: "Reminder 2" },
  { value: "reminder_3", label: "Reminder 3 (Final)" },
];

const ALL_CHANNELS: { value: FeeNoticeChannel; label: string; desc: string }[] = [
  { value: "email", label: "Email", desc: "Via Resend transactional email" },
  { value: "sms", label: "SMS", desc: "Via configured SMS gateway" },
  { value: "push", label: "Push", desc: "Via push notification dispatch" },
];

interface Props {
  config: FeeNoticeConfig | null;
}

export function FeeNoticeConfigForm({ config }: Props) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [triggers, setTriggers] = useState<FeeNoticeTrigger[]>(
    config?.enabled_triggers ?? ["invoice_sent", "invoice_overdue", "payment_received"],
  );
  const [channels, setChannels] = useState<FeeNoticeChannel[]>(
    config?.enabled_channels ?? ["email", "push"],
  );
  const [autoSend, setAutoSend] = useState(config?.auto_send ?? false);
  const [includePaymentLink, setIncludePaymentLink] = useState(
    config?.include_payment_link ?? true,
  );
  const [reminder1Days, setReminder1Days] = useState(config?.reminder_1_days ?? 7);
  const [reminder2Days, setReminder2Days] = useState(config?.reminder_2_days ?? 14);
  const [reminder3Days, setReminder3Days] = useState(config?.reminder_3_days ?? 28);

  // Templates
  const [templateInvoiceSent, setTemplateInvoiceSent] = useState(
    config?.template_invoice_sent ?? "",
  );
  const [templateOverdue, setTemplateOverdue] = useState(
    config?.template_invoice_overdue ?? "",
  );
  const [templatePaymentReceived, setTemplatePaymentReceived] = useState(
    config?.template_payment_received ?? "",
  );
  const [templatePaymentFailed, setTemplatePaymentFailed] = useState(
    config?.template_payment_failed ?? "",
  );
  const [templateReminder, setTemplateReminder] = useState(
    config?.template_reminder ?? "",
  );

  function toggleTrigger(t: FeeNoticeTrigger) {
    setTriggers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
    haptics.impact("light");
  }

  function toggleChannel(c: FeeNoticeChannel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
    haptics.impact("light");
  }

  function handleSubmit() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await upsertFeeNoticeConfig({
        enabled_triggers: triggers,
        enabled_channels: channels,
        reminder_1_days: reminder1Days,
        reminder_2_days: reminder2Days,
        reminder_3_days: reminder3Days,
        auto_send: autoSend,
        include_payment_link: includePaymentLink,
        template_invoice_sent: templateInvoiceSent || null,
        template_invoice_overdue: templateOverdue || null,
        template_payment_received: templatePaymentReceived || null,
        template_payment_failed: templatePaymentFailed || null,
        template_reminder: templateReminder || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        setSaved(true);
        haptics.success();
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Triggers */}
      <section>
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Notification Triggers
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          Select which billing events should generate notices.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_TRIGGERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className="active-push touch-target rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: triggers.includes(value)
                  ? "var(--primary)"
                  : "var(--border)",
                background: triggers.includes(value)
                  ? "var(--primary)"
                  : "var(--card)",
                color: triggers.includes(value)
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
              }}
              onClick={() => toggleTrigger(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Channels */}
      <section>
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Delivery Channels
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {ALL_CHANNELS.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              className="active-push touch-target rounded-lg border px-3 py-2 text-left transition-colors"
              style={{
                borderColor: channels.includes(value)
                  ? "var(--primary)"
                  : "var(--border)",
                background: channels.includes(value)
                  ? "var(--primary)"
                  : "var(--card)",
                color: channels.includes(value)
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
              }}
              onClick={() => toggleChannel(value)}
            >
              <span className="text-xs font-medium">{label}</span>
              <br />
              <span className="text-[10px] opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Reminder Schedule */}
      <section>
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Overdue Reminder Schedule
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          Days after due date to send each reminder.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Reminder 1
            </span>
            <input
              type="number"
              min={1}
              max={90}
              value={reminder1Days}
              onChange={(e) => setReminder1Days(Number(e.target.value))}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              days
            </span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Reminder 2
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={reminder2Days}
              onChange={(e) => setReminder2Days(Number(e.target.value))}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              days
            </span>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Final Reminder
            </span>
            <input
              type="number"
              min={1}
              max={180}
              value={reminder3Days}
              onChange={(e) => setReminder3Days(Number(e.target.value))}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              days
            </span>
          </label>
        </div>
      </section>

      {/* Toggles */}
      <section className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => {
              setAutoSend(e.target.checked);
              haptics.impact("light");
            }}
            className="h-4 w-4 rounded"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Auto-send notices
            </span>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Send immediately when triggered. If off, notices queue for manual approval.
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={includePaymentLink}
            onChange={(e) => {
              setIncludePaymentLink(e.target.checked);
              haptics.impact("light");
            }}
            className="h-4 w-4 rounded"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Include payment link
            </span>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Append Stripe hosted payment link to notices (when available).
            </p>
          </div>
        </label>
      </section>

      {/* Templates */}
      <section>
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
          Message Templates (optional)
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          Leave blank to use system defaults. Variables:{" "}
          <code className="text-[10px]">
            {"{{student_name}} {{invoice_number}} {{amount}} {{due_date}} {{school_name}} {{payment_link_line}}"}
          </code>
        </p>

        <div className="space-y-3">
          {[
            { label: "Invoice Sent", value: templateInvoiceSent, set: setTemplateInvoiceSent },
            { label: "Invoice Overdue", value: templateOverdue, set: setTemplateOverdue },
            { label: "Payment Received", value: templatePaymentReceived, set: setTemplatePaymentReceived },
            { label: "Payment Failed", value: templatePaymentFailed, set: setTemplatePaymentFailed },
            { label: "Reminder", value: templateReminder, set: setTemplateReminder },
          ].map(({ label, value, set }) => (
            <label key={label} className="block space-y-1">
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                {label}
              </span>
              <textarea
                value={value}
                onChange={(e) => set(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-2 py-1.5 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="Leave blank for system default"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Actions */}
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm" style={{ color: "var(--fee-notice-delivered)" }}>
          Configuration saved.
        </p>
      )}

      <button
        type="button"
        disabled={isPending || triggers.length === 0 || channels.length === 0}
        onClick={handleSubmit}
        className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}
