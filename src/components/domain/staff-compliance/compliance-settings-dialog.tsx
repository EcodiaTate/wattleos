"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateComplianceSettings,
  sendExpiryAlerts,
} from "@/lib/actions/staff-compliance";
import type { ComplianceSettings } from "@/lib/constants/tenant-settings";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  settings: ComplianceSettings;
  staffList: Array<{ id: string; name: string }>;
}

export function ComplianceSettingsDialog({ settings, staffList }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [alertPending, setAlertPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const router = useRouter();
  const haptics = useHaptics();

  const [ectRatio, setEctRatio] = useState(settings.ect_children_per_educator);
  const [qualPct, setQualPct] = useState(settings.qualification_target_pct);
  const [warningDays, setWarningDays] = useState(settings.expiry_warning_days);
  const [supervisorId, setSupervisorId] = useState(
    settings.nominated_supervisor_id ?? "",
  );

  function handleSave() {
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const result = await updateComplianceSettings({
        ect_children_per_educator: ectRatio,
        qualification_target_pct: qualPct,
        expiry_warning_days: warningDays,
        nominated_supervisor_id: supervisorId || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setOpen(false);
        router.refresh();
      }
    });
  }

  async function handleSendAlerts() {
    setAlertMessage(null);
    setAlertPending(true);
    haptics.impact("medium");

    const result = await sendExpiryAlerts();

    if (result.error) {
      setAlertMessage(result.error.message);
      haptics.error();
    } else if (result.data) {
      if (result.data.items_flagged === 0) {
        setAlertMessage("No expiring items to alert about.");
      } else {
        setAlertMessage(
          `Alert sent: ${result.data.items_flagged} item${result.data.items_flagged !== 1 ? "s" : ""} flagged to ${result.data.alert_sent_to}.`,
        );
      }
      haptics.success();
    }

    setAlertPending(false);
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="active-push touch-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
          }}
        >
          <span aria-hidden>&#9881;</span>
          Settings
        </button>
        {settings.nominated_supervisor_id && (
          <button
            type="button"
            onClick={handleSendAlerts}
            disabled={alertPending}
            className="active-push touch-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            {alertPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending…
              </>
            ) : (
              <>
                <span aria-hidden>&#128276;</span>
                Send Expiry Alerts
              </>
            )}
          </button>
        )}
        {alertMessage && (
          <span
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {alertMessage}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border p-6 shadow-xl"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Compliance Settings
        </h3>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Configure ratio targets, expiry warning thresholds, and alert
          recipients.
        </p>

        <div className="mt-4 space-y-4">
          {/* ECT Ratio */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Children per ECT
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={ectRatio}
              onChange={(e) => setEctRatio(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              1 ECT required per this many enrolled children (default: 60)
            </p>
          </div>

          {/* Qualification Target */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Diploma+ Target (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={qualPct}
              onChange={(e) => setQualPct(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Percentage of staff that must hold Diploma or higher (default: 50%)
            </p>
          </div>

          {/* Warning Days */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Expiry Warning (days)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={warningDays}
              onChange={(e) => setWarningDays(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Flag items as "expiring soon" within this many days (default: 60)
            </p>
          </div>

          {/* Nominated Supervisor */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Nominated Supervisor
            </label>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <option value="">Not configured</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Receives expiry alert announcements
            </p>
          </div>
        </div>

        {error && (
          <p
            className="mt-3 text-xs"
            style={{ color: "var(--destructive)" }}
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
