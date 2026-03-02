"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeaveRequestWithUser } from "@/types/domain";
import { LeaveStatusBadge } from "./leave-status-badge";
import { reviewLeaveRequest } from "@/lib/actions/rostering";
import { LEAVE_TYPE_CONFIG } from "@/lib/constants/rostering";
import type { LeaveType } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function LeaveListClient({
  requests,
}: {
  requests: LeaveRequestWithUser[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("pending");

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function handleReview(id: string, action: "approve" | "reject") {
    startTransition(async () => {
      haptics.impact("medium");
      await reviewLeaveRequest({ leaveRequestId: id, action });
      haptics.success();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="active-push rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: filter === s ? "var(--primary)" : "transparent",
              color:
                filter === s
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
              border: filter === s ? "none" : "1px solid var(--border)",
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No leave requests matching this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((lr) => {
            const leaveConfig = LEAVE_TYPE_CONFIG[lr.leave_type as LeaveType];
            return (
              <div
                key={lr.id}
                className="rounded-xl border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {lr.user_name}
                      </span>
                      <LeaveStatusBadge status={lr.status} />
                    </div>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {leaveConfig?.emoji} {leaveConfig?.label ?? lr.leave_type}{" "}
                      - {lr.start_date} to {lr.end_date}
                      {lr.is_partial_day &&
                        ` (partial: ${lr.partial_start_time}–${lr.partial_end_time})`}
                    </p>
                    {lr.reason && (
                      <p
                        className="mt-1 text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Reason: {lr.reason}
                      </p>
                    )}
                  </div>
                  {lr.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(lr.id, "approve")}
                        disabled={isPending}
                        className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        style={{
                          backgroundColor: "var(--primary)",
                          color: "var(--primary-foreground)",
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(lr.id, "reject")}
                        disabled={isPending}
                        className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                        style={{ color: "var(--destructive)" }}
                      >
                        Reject
                      </button>
                    </div>
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
