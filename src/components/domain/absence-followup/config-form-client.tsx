// src/components/domain/absence-followup/config-form-client.tsx

"use client";

import { useState, useTransition } from "react";
import { updateAbsenceFollowupConfig } from "@/lib/actions/absence-followup";
import {
  DEFAULT_CUTOFF_TIME,
  DEFAULT_NOTIFICATION_TEMPLATE,
  ESCALATION_MINUTES_OPTIONS,
  TEMPLATE_PLACEHOLDERS,
} from "@/lib/constants/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceFollowupConfig } from "@/types/domain";

interface ConfigFormClientProps {
  config: AbsenceFollowupConfig;
}

export function ConfigFormClient({ config }: ConfigFormClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalize HH:MM:SS → HH:MM for the input
  const initialCutoff = config.cutoff_time.slice(0, 5);

  const [cutoffTime, setCutoffTime] = useState(initialCutoff || DEFAULT_CUTOFF_TIME);
  const [autoNotify, setAutoNotify] = useState(config.auto_notify_guardians);
  const [template, setTemplate] = useState(
    config.notification_message_template || DEFAULT_NOTIFICATION_TEMPLATE,
  );
  const [escalationMinutes, setEscalationMinutes] = useState(
    config.escalation_minutes,
  );
  const [enabled, setEnabled] = useState(config.enabled);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    haptics.heavy();

    startTransition(async () => {
      const result = await updateAbsenceFollowupConfig({
        cutoff_time: cutoffTime,
        auto_notify_guardians: autoNotify,
        notification_message_template: template,
        escalation_minutes: escalationMinutes,
        enabled,
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Module enabled */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Module Status</h3>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium">Enable Absence Follow-up</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              When disabled, no alerts are generated and no notifications are sent.
            </p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => { haptics.selection(); setEnabled(e.target.checked); }}
            className="h-5 w-5 rounded border-border"
          />
        </label>
      </div>

      {/* Cutoff time */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Alert Cutoff Time</h3>
        <div className="space-y-1.5">
          <label className="block text-sm" style={{ color: "var(--muted-foreground)" }}>
            Absences not explained by this time will trigger a follow-up alert.
          </label>
          <input
            type="time"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
        </div>

        {/* Escalation */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <label className="block text-sm font-medium">Escalation after</label>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            If a pending alert has not been actioned after this many minutes, it escalates.
          </p>
          <select
            value={escalationMinutes}
            onChange={(e) => setEscalationMinutes(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          >
            {ESCALATION_MINUTES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-notify */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Auto-Notification</h3>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium">Auto-notify guardians on alert generation</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              When enabled, push notifications are sent automatically when alerts are generated.
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoNotify}
            onChange={(e) => { haptics.selection(); setAutoNotify(e.target.checked); }}
            className="h-5 w-5 rounded border-border"
          />
        </label>
      </div>

      {/* Notification template */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Notification Message Template</h3>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Sent to guardians via push notification. Use placeholders below.
        </p>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          required
          minLength={10}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
        />
        <div className="space-y-1">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Available placeholders:
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setTemplate((prev) => prev + p.key);
                }}
                className="text-xs rounded px-2 py-1 font-mono transition-colors hover:opacity-80"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
                title={p.description}
              >
                {p.key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {saved && (
        <p className="text-sm" style={{ color: "var(--absence-followup-explained)" }}>
          Settings saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="touch-target active-push rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        {isPending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
