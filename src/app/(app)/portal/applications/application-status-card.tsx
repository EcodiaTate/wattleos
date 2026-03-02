// src/app/(app)/portal/applications/application-status-card.tsx
//
// ============================================================
// WattleOS V2 - Application Status Card (Parent Portal)
// ============================================================
// 'use client' - displays application status with visual badges,
// change request notes, rejection reasons, and a withdraw button.
//
// WHY client: The withdraw action needs interactivity (confirm
// dialog + server action call + optimistic UI).
// ============================================================

"use client";

import { withdrawApplication } from "@/lib/actions/enroll";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApplicationSummary {
  id: string;
  status: string;
  child_first_name: string;
  child_last_name: string;
  submitted_at: string | null;
  change_request_notes: string | null;
  rejection_reason: string | null;
}

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  submitted: { label: "Submitted", bg: "bg-info/10", text: "text-info" },
  under_review: {
    label: "Under Review",
    bg: "bg-warning/10",
    text: "text-warning",
  },
  changes_requested: {
    label: "Changes Requested",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  approved: { label: "Approved", bg: "bg-success/10", text: "text-success" },
  rejected: { label: "Not Accepted", bg: "bg-destructive/10", text: "text-destructive" },
  withdrawn: { label: "Withdrawn", bg: "bg-muted", text: "text-muted-foreground" },
};

export function ApplicationStatusCard({
  application,
}: {
  application: ApplicationSummary;
}) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const style = STATUS_STYLES[application.status] ?? STATUS_STYLES.submitted;
  const canWithdraw = [
    "submitted",
    "under_review",
    "changes_requested",
  ].includes(application.status);

  async function handleWithdraw() {
    setWithdrawing(true);
    const result = await withdrawApplication(application.id);
    setWithdrawing(false);
    setShowConfirm(false);

    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {application.child_first_name} {application.child_last_name}
          </h3>
          {application.submitted_at && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Submitted{" "}
              {new Date(application.submitted_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
      </div>

      {/* Change request notes */}
      {application.status === "changes_requested" &&
        application.change_request_notes && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-xs font-medium text-primary">
              Changes Requested:
            </p>
            <p className="mt-1 text-sm text-primary">
              {application.change_request_notes}
            </p>
          </div>
        )}

      {/* Rejection reason */}
      {application.status === "rejected" && application.rejection_reason && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-xs font-medium text-destructive">Reason:</p>
          <p className="mt-1 text-sm text-destructive">
            {application.rejection_reason}
          </p>
        </div>
      )}

      {/* Approved message */}
      {application.status === "approved" && (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <p className="text-sm text-success">
            🎉 Enrollment approved! Check your email for an invitation to set up
            your parent portal access.
          </p>
        </div>
      )}

      {/* Withdraw */}
      {canWithdraw && !showConfirm && (
        <div className="mt-3">
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Withdraw Application
          </button>
        </div>
      )}

      {canWithdraw && showConfirm && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-3">
          <p className="flex-1 text-xs text-muted-foreground">
            Are you sure? This cannot be undone.
          </p>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="rounded bg-destructive px-3 py-1 text-xs font-medium text-background hover:bg-destructive disabled:opacity-50"
          >
            {withdrawing ? "Withdrawing…" : "Confirm Withdraw"}
          </button>
        </div>
      )}
    </div>
  );
}
