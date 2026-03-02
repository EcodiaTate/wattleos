// src/components/domain/absence-followup/alert-detail-client.tsx

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertStatusBadge } from "./alert-status-badge";
import { ExplanationForm } from "./explanation-form";
import { NotificationSendForm } from "./notification-send-form";
import { dismissAlert } from "@/lib/actions/absence-followup";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceFollowupAlertDetail } from "@/types/domain";

interface AlertDetailClientProps {
  alert: AbsenceFollowupAlertDetail;
  canManage: boolean;
}

type Panel = "explain" | "notify" | "dismiss" | null;

export function AlertDetailClient({ alert: initialAlert, canManage }: AlertDetailClientProps) {
  const haptics = useHaptics();
  const [alert, setAlert] = useState(initialAlert);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [isPending, startTransition] = useTransition();
  const [dismissReason, setDismissReason] = useState("");

  const studentName = alert.student
    ? `${alert.student.preferred_name ?? alert.student.first_name} ${alert.student.last_name}`
    : "Unknown student";

  const isActionable = alert.status === "pending" || alert.status === "notified";

  function handleDismiss() {
    haptics.medium();
    startTransition(async () => {
      const result = await dismissAlert({ alert_id: alert.id, reason: dismissReason || undefined });
      if (!result.error && result.data) {
        setAlert((prev) => ({ ...prev, ...result.data!, notifications: prev.notifications }));
        setActivePanel(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Student header */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        {alert.student?.photo_url ? (
          <img
            src={alert.student.photo_url}
            alt={studentName}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-xl font-bold"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {alert.student?.first_name?.[0] ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{studentName}</h2>
            <AlertStatusBadge status={alert.status} />
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Absent {alert.alert_date}
          </p>
          {alert.explanation && (
            <div
              className="mt-2 rounded-lg p-3 text-sm"
              style={{
                background: "var(--absence-followup-explained-bg)",
                color: "var(--absence-followup-explained-fg)",
                border: "1px solid var(--absence-followup-explained)",
              }}
            >
              <span className="font-medium">Explanation: </span>
              {alert.explanation}
            </div>
          )}
        </div>
      </div>

      {/* Guardians */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Guardians / Contacts</h3>
        {alert.guardians.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No guardians linked to this student.
          </p>
        ) : (
          <div className="space-y-2">
            {alert.guardians.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">
                    {g.first_name} {g.last_name}
                  </span>
                  {g.is_primary && (
                    <span
                      className="ml-2 text-xs rounded-full px-1.5 py-0.5"
                      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                  {g.phone && <span>{g.phone}</span>}
                  {g.user_id && (
                    <span
                      className="text-xs rounded-full px-1.5 py-0.5"
                      style={{
                        background: "var(--absence-followup-explained-bg)",
                        color: "var(--absence-followup-explained-fg)",
                      }}
                    >
                      App ✓
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {canManage && isActionable && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { haptics.light(); setActivePanel(activePanel === "explain" ? null : "explain"); }}
            className="touch-target active-push rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Record Explanation
          </button>
          <button
            onClick={() => { haptics.light(); setActivePanel(activePanel === "notify" ? null : "notify"); }}
            className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--absence-followup-notified-bg)",
              color: "var(--absence-followup-notified-fg)",
              border: "1px solid var(--absence-followup-notified)",
            }}
          >
            Send Notification
          </button>
          <button
            onClick={() => { haptics.light(); setActivePanel(activePanel === "dismiss" ? null : "dismiss"); }}
            className="touch-target active-push rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inline panels */}
      {activePanel === "explain" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Record Explanation</h3>
          <ExplanationForm
            alertId={alert.id}
            hasAttendanceRecord={!!alert.attendance_record_id}
            onSuccess={() => {
              setAlert((prev) => ({ ...prev, status: "explained" }));
              setActivePanel(null);
            }}
          />
        </div>
      )}

      {activePanel === "notify" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Send Notification</h3>
          <NotificationSendForm
            alert={alert}
            onSuccess={() => {
              setAlert((prev) => ({
                ...prev,
                status: prev.status === "pending" ? "notified" : prev.status,
              }));
              setActivePanel(null);
            }}
          />
        </div>
      )}

      {activePanel === "dismiss" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Dismiss Alert</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Reason (optional)</label>
            <textarea
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="e.g. Student transferred, data entry error…"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none resize-none"
            />
          </div>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="touch-target active-push w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isPending ? "Dismissing…" : "Confirm Dismiss"}
          </button>
        </div>
      )}

      {/* Notification history */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Notification History</h3>
        {alert.notifications.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No notifications sent yet.
          </p>
        ) : (
          <div className="space-y-2">
            {alert.notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {n.guardian.first_name} {n.guardian.last_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {n.channel.toUpperCase()} · {n.sent_at ? new Date(n.sent_at).toLocaleString("en-AU") : "Pending"}
                  </p>
                </div>
                <span
                  className="text-xs rounded-full px-2 py-0.5 font-medium shrink-0"
                  style={{
                    background: n.status === "sent" || n.status === "delivered"
                      ? "var(--absence-followup-explained-bg)"
                      : "var(--absence-followup-escalated-bg)",
                    color: n.status === "sent" || n.status === "delivered"
                      ? "var(--absence-followup-explained-fg)"
                      : "var(--absence-followup-escalated-fg)",
                  }}
                >
                  {n.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Link
          href="/attendance/absence-followup"
          className="text-sm hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Back to Follow-up Dashboard
        </Link>
      </div>
    </div>
  );
}
