"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ShiftCoverageRequestWithDetails,
  CoverageUrgency,
} from "@/types/domain";
import { CoverageUrgencyBadge } from "./coverage-urgency-badge";
import { ShiftRoleBadge } from "./shift-role-badge";
import type { ShiftRole } from "@/types/domain";
import { acceptCoverageRequest } from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function MyCoverageClient({
  requests,
}: {
  requests: ShiftCoverageRequestWithDetails[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  function handleAccept(id: string) {
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await acceptCoverageRequest({ coverageRequestId: id });
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.success();
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No available shifts right now. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((cr) => (
        <div
          key={cr.id}
          className="card-interactive rounded-xl border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {cr.original_shift.date}
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {cr.original_shift.start_time}–{cr.original_shift.end_time}
                </span>
                <CoverageUrgencyBadge urgency={cr.urgency as CoverageUrgency} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <ShiftRoleBadge
                  role={cr.original_shift.shift_role as ShiftRole}
                />
                {cr.original_shift.class_name && (
                  <span
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {cr.original_shift.class_name}
                  </span>
                )}
              </div>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Covering for {cr.original_user_name} - {cr.reason}
              </p>
            </div>
            <button
              onClick={() => handleAccept(cr.id)}
              disabled={isPending}
              className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Accepting…" : "Accept Shift"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
