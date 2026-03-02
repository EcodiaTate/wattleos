"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShiftSwapRequestWithDetails } from "@/types/domain";
import { reviewSwapRequest } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function SwapListClient({
  requests,
}: {
  requests: ShiftSwapRequestWithDetails[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleReview(id: string, action: "approve" | "reject") {
    startTransition(async () => {
      haptics.impact("medium");
      await reviewSwapRequest({ swapRequestId: id, action });
      haptics.success();
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        No pending swap requests.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((swap) => (
        <div
          key={swap.id}
          className="rounded-xl border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                {swap.offered_by_name} wants to swap
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Offered: {swap.offered_shift.date} {swap.offered_shift.start_time}–{swap.offered_shift.end_time}
                {swap.offered_shift.class_name && ` (${swap.offered_shift.class_name})`}
              </p>
              {swap.requested_shift && (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Requested: {swap.requested_shift.date} {swap.requested_shift.start_time}–{swap.requested_shift.end_time}
                  {swap.requested_shift.class_name && ` (${swap.requested_shift.class_name})`}
                </p>
              )}
              {swap.requested_from_name && (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  With: {swap.requested_from_name}
                </p>
              )}
              {swap.reason && (
                <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Reason: {swap.reason}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleReview(swap.id, "approve")}
                disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Approve
              </button>
              <button
                onClick={() => handleReview(swap.id, "reject")}
                disabled={isPending}
                className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                style={{ color: "var(--destructive)" }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
