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
  submitted: { label: "Submitted", bg: "bg-blue-50", text: "text-blue-700" },
  under_review: {
    label: "Under Review",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
  },
  changes_requested: {
    label: "Changes Requested",
    bg: "bg-orange-50",
    text: "text-orange-700",
  },
  approved: { label: "Approved", bg: "bg-green-50", text: "text-green-700" },
  rejected: { label: "Not Accepted", bg: "bg-red-50", text: "text-red-700" },
  withdrawn: { label: "Withdrawn", bg: "bg-gray-50", text: "text-gray-500" },
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
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {application.child_first_name} {application.child_last_name}
          </h3>
          {application.submitted_at && (
            <p className="mt-0.5 text-xs text-gray-400">
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
          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-xs font-medium text-orange-800">
              Changes Requested:
            </p>
            <p className="mt-1 text-sm text-orange-700">
              {application.change_request_notes}
            </p>
          </div>
        )}

      {/* Rejection reason */}
      {application.status === "rejected" && application.rejection_reason && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium text-red-800">Reason:</p>
          <p className="mt-1 text-sm text-red-700">
            {application.rejection_reason}
          </p>
        </div>
      )}

      {/* Approved message */}
      {application.status === "approved" && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">
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
            className="text-xs font-medium text-gray-500 hover:text-red-600"
          >
            Withdraw Application
          </button>
        </div>
      )}

      {canWithdraw && showConfirm && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-3">
          <p className="flex-1 text-xs text-gray-600">
            Are you sure? This cannot be undone.
          </p>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {withdrawing ? "Withdrawing…" : "Confirm Withdraw"}
          </button>
        </div>
      )}
    </div>
  );
}
