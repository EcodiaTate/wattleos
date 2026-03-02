// src/components/domain/absence-followup/alert-card.tsx

"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AlertStatusBadge } from "./alert-status-badge";
import { dismissAlert, sendGuardianNotification } from "@/lib/actions/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceFollowupAlertWithStudent } from "@/types/domain";

interface AlertCardProps {
  alert: AbsenceFollowupAlertWithStudent;
  canManage: boolean;
  onUpdate?: () => void;
}

export function AlertCard({ alert, canManage, onUpdate }: AlertCardProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const studentName = alert.student
    ? `${alert.student.preferred_name ?? alert.student.first_name} ${alert.student.last_name}`
    : "Unknown student";

  const primaryGuardians = alert.guardians.filter((g) => g.is_primary);
  const notifiableGuardians = alert.guardians.filter((g) => g.user_id);

  function handleQuickNotify() {
    if (notifiableGuardians.length === 0) return;
    haptics.medium();
    startTransition(async () => {
      await sendGuardianNotification({
        alert_id: alert.id,
        guardian_ids: notifiableGuardians.map((g) => g.id),
        channel: "push",
      });
      onUpdate?.();
    });
  }

  function handleDismiss() {
    haptics.medium();
    startTransition(async () => {
      await dismissAlert({ alert_id: alert.id });
      onUpdate?.();
    });
  }

  return (
    <div
      className="card-interactive rounded-xl border border-border bg-card p-4 space-y-3"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: `var(--absence-followup-${alert.status})`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {alert.student?.photo_url ? (
            <img
              src={alert.student.photo_url}
              alt={studentName}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {alert.student?.first_name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{studentName}</p>
            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
              {primaryGuardians.length > 0
                ? primaryGuardians
                    .map((g) => `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim())
                    .join(", ")
                : "No guardian listed"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AlertStatusBadge status={alert.status} size="sm" />
          {alert.notification_count > 0 && (
            <span
              className="text-xs rounded-full px-2 py-0.5 font-medium"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {alert.notification_count} notif.
            </span>
          )}
        </div>
      </div>

      {canManage && (alert.status === "pending" || alert.status === "notified") && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Link
            href={`/attendance/absence-followup/${alert.id}`}
            className="touch-target active-push flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-center hover:bg-muted transition-colors"
            onClick={() => haptics.light()}
          >
            View & Explain
          </Link>

          {notifiableGuardians.length > 0 && alert.status === "pending" && (
            <button
              onClick={handleQuickNotify}
              disabled={isPending}
              className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--absence-followup-notified-bg)",
                color: "var(--absence-followup-notified-fg)",
                border: "1px solid var(--absence-followup-notified)",
              }}
            >
              Notify
            </button>
          )}

          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {!canManage && (
        <div className="pt-1 border-t border-border">
          <Link
            href={`/attendance/absence-followup/${alert.id}`}
            className="text-xs hover:underline"
            style={{ color: "var(--muted-foreground)" }}
            onClick={() => haptics.light()}
          >
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}
