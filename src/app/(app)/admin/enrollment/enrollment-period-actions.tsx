// src/app/(app)/admin/enrollment/enrollment-period-actions.tsx
//
// ============================================================
// WattleOS V2 - Enrollment Period Status Actions (Module 10)
// ============================================================
// 'use client' - interactive buttons with confirmation for
// lifecycle transitions: draft→open→closed→archived, plus
// delete for empty draft periods.
//
// WHY client component: Status transitions need user
// confirmation before firing server actions. The server
// parent re-renders via revalidatePath after success.
// ============================================================

"use client";

import {
  archiveEnrollmentPeriod,
  closeEnrollmentPeriod,
  deleteEnrollmentPeriod,
  openEnrollmentPeriod,
} from "@/lib/actions/enroll";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface EnrollmentPeriodActionsProps {
  periodId: string;
  currentStatus: string;
  applicationCount: number;
}

export function EnrollmentPeriodActions({
  periodId,
  currentStatus,
  applicationCount,
}: EnrollmentPeriodActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  async function handleAction(action: string) {
    setError(null);

    let result;
    switch (action) {
      case "open":
        result = await openEnrollmentPeriod(periodId);
        break;
      case "close":
        result = await closeEnrollmentPeriod(periodId);
        break;
      case "archive":
        result = await archiveEnrollmentPeriod(periodId);
        break;
      case "delete":
        result = await deleteEnrollmentPeriod(periodId);
        break;
      default:
        return;
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      router.refresh();
    }

    setConfirmAction(null);
  }

  function onActionClick(action: string) {
    // Destructive actions need confirmation
    if (action === "close" || action === "archive" || action === "delete") {
      setConfirmAction(action);
    } else {
      startTransition(() => handleAction(action));
    }
  }

  function onConfirm() {
    if (!confirmAction) return;
    startTransition(() => handleAction(confirmAction));
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-600" title={error}>
          ⚠
        </span>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {confirmAction === "delete"
              ? "Delete?"
              : `${confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}?`}
          </span>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "…" : "Yes"}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            disabled={isPending}
            className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
          >
            No
          </button>
        </div>
      )}

      {/* Action buttons (visible when not confirming) */}
      {!confirmAction && (
        <>
          {/* Edit - always available for draft/open */}
          {(currentStatus === "draft" || currentStatus === "open") && (
            <Link
              href={`/admin/enrollment/${periodId}/edit`}
              className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Edit
            </Link>
          )}

          {/* Open - only from draft */}
          {currentStatus === "draft" && (
            <button
              onClick={() => onActionClick("open")}
              disabled={isPending}
              className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? "…" : "Open"}
            </button>
          )}

          {/* Close - only from open */}
          {currentStatus === "open" && (
            <button
              onClick={() => onActionClick("close")}
              disabled={isPending}
              className="rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Close
            </button>
          )}

          {/* Archive - only from closed */}
          {currentStatus === "closed" && (
            <button
              onClick={() => onActionClick("archive")}
              disabled={isPending}
              className="rounded bg-gray-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
            >
              Archive
            </button>
          )}

          {/* Delete - only draft with no applications */}
          {currentStatus === "draft" && applicationCount === 0 && (
            <button
              onClick={() => onActionClick("delete")}
              disabled={isPending}
              className="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
            >
              Delete
            </button>
          )}

          {/* View applications link */}
          {applicationCount > 0 && (
            <Link
              href={`/admin/enrollment/applications?period=${periodId}`}
              className="rounded bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              View Apps
            </Link>
          )}
        </>
      )}
    </div>
  );
}
