// src/components/domain/absence-followup/notification-send-form.tsx

"use client";

import { useState, useTransition } from "react";
import { sendGuardianNotification } from "@/lib/actions/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceFollowupAlertWithStudent } from "@/types/domain";

interface NotificationSendFormProps {
  alert: AbsenceFollowupAlertWithStudent;
  onSuccess?: (result: { sent: number; failed: number }) => void;
}

export function NotificationSendForm({
  alert,
  onSuccess,
}: NotificationSendFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    // Pre-select guardians with app accounts
    alert.guardians.filter((g) => g.user_id).map((g) => g.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(
    null,
  );

  const notifiableGuardians = alert.guardians.filter((g) => g.user_id);

  function toggleGuardian(id: string) {
    haptics.selection();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function handleSend() {
    if (selectedIds.length === 0) return;
    setError(null);
    setResult(null);
    haptics.heavy();

    startTransition(async () => {
      const res = await sendGuardianNotification({
        alert_id: alert.id,
        guardian_ids: selectedIds,
        channel: "push",
      });

      if (res.error) {
        setError(res.error.message);
        haptics.error();
      } else if (res.data) {
        setResult(res.data);
        haptics.success();
        onSuccess?.(res.data);
      }
    });
  }

  if (notifiableGuardians.length === 0) {
    return (
      <div
        className="rounded-lg border border-border p-4 text-sm text-center"
        style={{ color: "var(--muted-foreground)" }}
      >
        No guardians have the app installed. Push notifications require
        guardians to have an account and device registered.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Select guardians to notify</p>
        {alert.guardians.map((guardian) => {
          const canNotify = !!guardian.user_id;
          const isSelected = selectedIds.includes(guardian.id);

          return (
            <label
              key={guardian.id}
              className={`flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer transition-colors ${
                canNotify ? "hover:bg-muted" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!canNotify}
                onChange={() => canNotify && toggleGuardian(guardian.id)}
                className="h-4 w-4 rounded border-border"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {guardian.first_name} {guardian.last_name}
                  {guardian.is_primary && (
                    <span
                      className="ml-2 text-xs rounded-full px-1.5 py-0.5"
                      style={{
                        background: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Primary
                    </span>
                  )}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {canNotify
                    ? "Has app account ✓"
                    : "No app account - push unavailable"}
                  {guardian.phone && ` · ${guardian.phone}`}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      <div
        className="rounded-lg border border-border p-3 text-xs"
        style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}
      >
        Channel: <strong>Push Notification</strong> · SMS and email require
        gateway configuration
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {result && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            background: "var(--absence-followup-explained-bg)",
            borderColor: "var(--absence-followup-explained)",
            color: "var(--absence-followup-explained-fg)",
          }}
        >
          {result.sent} sent · {result.failed} failed
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isPending || selectedIds.length === 0}
        className="touch-target active-push w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        style={{
          background: "var(--absence-followup-notified)",
          color: "var(--absence-followup-notified-fg)",
        }}
      >
        {isPending
          ? "Sending…"
          : `Send to ${selectedIds.length} guardian${selectedIds.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
