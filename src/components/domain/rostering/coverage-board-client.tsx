"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ShiftCoverageRequestWithDetails } from "@/types/domain";
import { CoverageUrgencyBadge } from "./coverage-urgency-badge";
import type { CoverageUrgency } from "@/types/domain";
import { resolveCoverageRequest } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function CoverageBoardClient({
  requests,
}: {
  requests: ShiftCoverageRequestWithDetails[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("open");

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  function handleResolve(id: string, status: "cancelled" | "unfilled") {
    startTransition(async () => {
      haptics.impact("medium");
      await resolveCoverageRequest({ coverageRequestId: id, status });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["open", "accepted", "cancelled", "all"].map((s) => (
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
          No coverage requests matching this filter.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((cr) => (
            <div
              key={cr.id}
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
                      Coverage needed for {cr.original_user_name}
                    </span>
                    <CoverageUrgencyBadge
                      urgency={cr.urgency as CoverageUrgency}
                    />
                  </div>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {cr.original_shift.date} {cr.original_shift.start_time}–
                    {cr.original_shift.end_time}
                    {cr.original_shift.class_name &&
                      ` - ${cr.original_shift.class_name}`}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Reason: {cr.reason}
                    {cr.reason_detail ? ` - ${cr.reason_detail}` : ""}
                  </p>
                  {cr.accepted_by_name && (
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      Accepted by {cr.accepted_by_name}
                    </p>
                  )}
                </div>
                {cr.status === "open" && (
                  <button
                    onClick={() => handleResolve(cr.id, "cancelled")}
                    disabled={isPending}
                    className="text-xs underline-offset-2 hover:underline"
                    style={{ color: "var(--destructive)" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
