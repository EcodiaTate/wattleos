"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaveRequest, LeaveType } from "@/types/domain";
import { LeaveStatusBadge } from "./leave-status-badge";
import { createLeaveRequest, withdrawLeaveRequest } from "@/lib/actions/rostering";
import { LEAVE_TYPE_CONFIG, LEAVE_TYPES } from "@/lib/constants/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function MyLeaveClient({
  requests,
}: {
  requests: LeaveRequest[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleWithdraw(id: string) {
    startTransition(async () => {
      haptics.impact("medium");
      await withdrawLeaveRequest(id);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createLeaveRequest({
        leaveType: fd.get("leaveType") as LeaveType,
        startDate: fd.get("startDate") as string,
        endDate: fd.get("endDate") as string,
        isPartialDay: fd.get("isPartialDay") === "on",
        partialStartTime: (fd.get("partialStartTime") as string) || undefined,
        partialEndTime: (fd.get("partialEndTime") as string) || undefined,
        reason: (fd.get("reason") as string) || undefined,
      });
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        {showForm ? "Cancel" : "+ New Leave Request"}
      </button>

      {error && <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>}

      {showForm && (
        <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>Leave Type</label>
                <select name="leaveType" required className="w-full rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>{LEAVE_TYPE_CONFIG[lt].emoji} {LEAVE_TYPE_CONFIG[lt].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>Reason</label>
                <input name="reason" type="text" className="w-full rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>Start Date</label>
                <input name="startDate" type="date" required className="w-full rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--foreground)" }}>End Date</label>
                <input name="endDate" type="date" required className="w-full rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input name="isPartialDay" type="checkbox" id="isPartialDay" />
              <label htmlFor="isPartialDay" className="text-sm" style={{ color: "var(--foreground)" }}>Partial day?</label>
            </div>
            <button type="submit" disabled={isPending} className="active-push touch-target rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
              {isPending ? "Submitting…" : "Submit Leave Request"}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {requests.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No leave requests yet.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((lr) => {
            const config = LEAVE_TYPE_CONFIG[lr.leave_type];
            return (
              <div key={lr.id} className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: "var(--foreground)" }}>
                        {config.emoji} {config.label}
                      </span>
                      <LeaveStatusBadge status={lr.status} />
                    </div>
                    <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {lr.start_date} to {lr.end_date}
                      {lr.is_partial_day && ` (partial)`}
                    </p>
                    {lr.reason && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{lr.reason}</p>}
                    {lr.reviewer_notes && (
                      <p className="mt-1 text-sm italic" style={{ color: "var(--muted-foreground)" }}>
                        Reviewer: {lr.reviewer_notes}
                      </p>
                    )}
                  </div>
                  {lr.status === "pending" && (
                    <button
                      onClick={() => handleWithdraw(lr.id)}
                      disabled={isPending}
                      className="text-xs underline-offset-2 hover:underline"
                      style={{ color: "var(--destructive)" }}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
