"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  updateParticipant,
  bulkAccountStudents,
} from "@/lib/actions/emergency-drills";
import type { DrillParticipantWithStudent } from "@/types/domain";

interface HeadcountCheckerProps {
  drillId: string;
  participants: DrillParticipantWithStudent[];
  editable: boolean;
}

export function HeadcountChecker({
  drillId,
  participants,
  editable,
}: HeadcountCheckerProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accountedCount = participants.filter((p) => p.accounted_for).length;
  const totalCount = participants.length;
  const allAccounted = accountedCount === totalCount;

  function handleToggle(participant: DrillParticipantWithStudent) {
    if (!editable) return;
    setError(null);

    startTransition(async () => {
      const result = await updateParticipant(drillId, {
        student_id: participant.student_id,
        accounted_for: !participant.accounted_for,
        assembly_time_seconds: null,
        response_notes: null,
        needed_assistance: participant.needed_assistance,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.selection();
      router.refresh();
    });
  }

  function handleAccountAll() {
    if (!editable) return;
    setError(null);

    const unaccountedIds = participants
      .filter((p) => !p.accounted_for)
      .map((p) => p.student_id);

    if (unaccountedIds.length === 0) return;

    startTransition(async () => {
      const result = await bulkAccountStudents(drillId, {
        student_ids: unaccountedIds,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.impact("heavy");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Headcount
          </h3>
          <p
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {accountedCount} of {totalCount} accounted for
          </p>
        </div>
        {editable && !allAccounted && (
          <button
            onClick={handleAccountAll}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "..." : "Account All"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${totalCount > 0 ? (accountedCount / totalCount) * 100 : 0}%`,
            background: allAccounted
              ? "var(--drill-completed)"
              : "var(--drill-in-progress)",
          }}
        />
      </div>

      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-2 text-xs"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Student list */}
      <div className="space-y-1">
        {participants.map((p) => {
          const displayName =
            p.student.preferred_name || p.student.first_name;

          return (
            <button
              key={p.id}
              onClick={() => handleToggle(p)}
              disabled={isPending || !editable}
              className="active-push flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-left transition-colors disabled:opacity-70"
              style={{
                background: p.accounted_for
                  ? "var(--drill-completed-bg)"
                  : "var(--card)",
              }}
            >
              {/* Checkbox */}
              <div
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border text-xs"
                style={{
                  borderColor: p.accounted_for
                    ? "var(--drill-completed)"
                    : "var(--border)",
                  background: p.accounted_for
                    ? "var(--drill-completed)"
                    : "transparent",
                  color: p.accounted_for
                    ? "var(--drill-completed-fg)"
                    : "transparent",
                }}
              >
                {p.accounted_for ? "✓" : ""}
              </div>

              {/* Student info */}
              <div className="flex-1 min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {displayName} {p.student.last_name}
                </p>
                {p.needed_assistance && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--drill-at-risk)" }}
                  >
                    Needed assistance
                  </span>
                )}
                {p.response_notes && (
                  <span
                    className="text-xs block truncate"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.response_notes}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
