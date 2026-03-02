"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShiftSwapRequestWithDetails } from "@/types/domain";
import { respondToSwap } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function MySwapsClient({
  requests,
}: {
  requests: ShiftSwapRequestWithDetails[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleRespond(id: string, accept: boolean) {
    startTransition(async () => {
      haptics.impact("medium");
      await respondToSwap({ swapRequestId: id, accept });
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
      {requests.map((swap) => {
        const statusLabel =
          swap.status === "pending_peer"
            ? "Awaiting your response"
            : swap.status === "pending_approval"
              ? "Awaiting manager approval"
              : swap.status;

        return (
          <div
            key={swap.id}
            className="rounded-xl border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium" style={{ color: "var(--foreground)" }}>
                  {swap.offered_by_name}
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Offering: {swap.offered_shift.date} {swap.offered_shift.start_time}–{swap.offered_shift.end_time}
                  {swap.offered_shift.class_name && ` (${swap.offered_shift.class_name})`}
                </p>
                {swap.requested_shift && (
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    For your: {swap.requested_shift.date} {swap.requested_shift.start_time}–{swap.requested_shift.end_time}
                  </p>
                )}
                {swap.reason && (
                  <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    Reason: {swap.reason}
                  </p>
                )}
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: swap.status === "pending_peer" ? "var(--destructive)" : "var(--muted-foreground)" }}
                >
                  {statusLabel}
                </p>
              </div>
              {swap.status === "pending_peer" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(swap.id, true)}
                    disabled={isPending}
                    className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(swap.id, false)}
                    disabled={isPending}
                    className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                    style={{ color: "var(--destructive)" }}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
