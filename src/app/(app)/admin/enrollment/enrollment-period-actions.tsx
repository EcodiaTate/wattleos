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
        <span className="text-xs text-destructive" title={error}>
          ⚠
        </span>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="flex items-center gap-1 animate-fade-in">
          <span className="text-xs text-muted-foreground">
            {confirmAction === "delete"
              ? "Delete?"
              : `${confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}?`}
          </span>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "…" : "Yes"}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            disabled={isPending}
            className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-border"
          >
            No
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!confirmAction && (
        <>
          {(currentStatus === "draft" || currentStatus === "open") && (
            <Link
              href={`/admin/enrollment/${periodId}/edit`}
              className="rounded bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-border"
            >
              Edit
            </Link>
          )}

          {currentStatus === "draft" && (
            <button
              onClick={() => onActionClick("open")}
              disabled={isPending}
              className="rounded bg-success px-2.5 py-1 text-xs font-medium text-success-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "…" : "Open"}
            </button>
          )}

          {currentStatus === "open" && (
            <button
              onClick={() => onActionClick("close")}
              disabled={isPending}
              className="rounded bg-warning px-2.5 py-1 text-xs font-medium text-warning-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Close
            </button>
          )}

          {currentStatus === "closed" && (
            <button
              onClick={() => onActionClick("archive")}
              disabled={isPending}
              className="rounded bg-muted-foreground px-2.5 py-1 text-xs font-medium text-background transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Archive
            </button>
          )}

          {currentStatus === "draft" && applicationCount === 0 && (
            <button
              onClick={() => onActionClick("delete")}
              disabled={isPending}
              className="rounded bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              Delete
            </button>
          )}

          {applicationCount > 0 && (
            <Link
              href={`/admin/enrollment/applications?period=${periodId}`}
              className="rounded bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              View Apps
            </Link>
          )}
        </>
      )}
    </div>
  );
}