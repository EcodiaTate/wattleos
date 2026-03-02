"use client";

import { useState, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useOptimisticStaff } from "@/lib/hooks/use-optimistic-accountability";
import { accountStaff } from "@/lib/actions/emergency-coordination";
import type { EmergencyStaffAccountabilityWithUser } from "@/types/domain";
import type { RecentChange } from "@/lib/hooks/use-emergency-realtime";

const STATUS_LABELS: Record<string, string> = {
  responding: "Responding",
  at_assembly: "At Assembly",
  assisting: "Assisting",
  off_site: "Off Site",
};

export function StaffAccountability({
  staff,
  eventId,
  currentUserId,
  canCoordinate,
  recentChanges,
}: {
  staff: EmergencyStaffAccountabilityWithUser[];
  eventId: string;
  currentUserId: string;
  canCoordinate: boolean;
  recentChanges?: Map<string, RecentChange>;
}) {
  const { optimisticStaff, applyOptimistic, startTransition } =
    useOptimisticStaff(staff);
  const [showAccounted, setShowAccounted] = useState(false);
  const haptics = useHaptics();

  const handleCheckIn = useCallback(
    (userId: string) => {
      haptics.impact("medium");
      startTransition(async () => {
        applyOptimistic({ userId, accountedFor: true });
        await accountStaff(eventId, {
          user_id: userId,
          status: "at_assembly",
          zone_id: null,
          notes: null,
        });
      });
    },
    [eventId, haptics, startTransition, applyOptimistic],
  );

  const accounted = optimisticStaff.filter((s) => s.accounted_for);
  const unaccounted = optimisticStaff.filter((s) => !s.accounted_for);

  // Self check-in at the top
  const self = optimisticStaff.find((s) => s.user_id === currentUserId);
  const showSelfCheckIn = self && !self.accounted_for;

  return (
    <div className="space-y-3">
      {/* Self check-in - pulsing, large */}
      {showSelfCheckIn && canCoordinate && (
        <button
          onClick={() => handleCheckIn(currentUserId)}
          className="active-push touch-target w-full rounded-[var(--radius-lg)] px-4 py-4 text-center text-lg font-extrabold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            animation: "emergency-count-pulse 2s ease-in-out infinite",
          }}
        >
          CHECK IN (You)
        </button>
      )}

      {/* UNACCOUNTED staff - prominent */}
      <div className="scroll-native max-h-[50vh] overflow-y-auto space-y-1.5">
        {unaccounted.length > 0 && (
          <p
            className="text-xs font-bold uppercase tracking-wider px-1"
            style={{ color: "var(--emergency-unaccounted)" }}
          >
            Unaccounted ({unaccounted.length})
          </p>
        )}

        {unaccounted.map((s) => {
          const isFlashing = recentChanges?.has(s.id);

          return (
            <button
              key={s.id}
              onClick={() => canCoordinate && handleCheckIn(s.user_id)}
              disabled={!canCoordinate}
              className={`active-push touch-target flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-left border-2 ${isFlashing ? "emergency-flash-alert" : ""}`}
              style={{
                borderColor: "var(--emergency-activated)",
                backgroundColor: "var(--emergency-activated-bg)",
              }}
            >
              {/* Initials avatar */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--foreground)",
                }}
              >
                {(s.user.first_name?.[0] ?? "") + (s.user.last_name?.[0] ?? "")}
              </div>
              {/* Name */}
              <span
                className="flex-1 text-base font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {s.user.first_name} {s.user.last_name}
              </span>
              {/* Tap affordance */}
              {canCoordinate && (
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: "var(--emergency-activated)" }}
                >
                  TAP \u2713
                </span>
              )}
            </button>
          );
        })}

        {/* ACCOUNTED staff - collapsed by default */}
        {accounted.length > 0 && (
          <>
            <button
              onClick={() => {
                haptics.selection();
                setShowAccounted(!showAccounted);
              }}
              className="active-push w-full flex items-center gap-2 px-1 py-2 text-left"
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--emergency-all-clear)" }}
              >
                Accounted ({accounted.length})
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {showAccounted ? "\u25B2" : "\u25BC"}
              </span>
            </button>

            {showAccounted &&
              accounted.map((s) => {
                const isFlashing = recentChanges?.has(s.id);

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-1.5 ${isFlashing ? "emergency-flash" : ""}`}
                    style={{ opacity: 0.7 }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--emergency-all-clear)" }}
                    >
                      \u2713
                    </span>
                    <span
                      className="flex-1 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {s.user.first_name} {s.user.last_name}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {s.role_during_event
                        ? s.role_during_event.replace(/_/g, " ")
                        : (STATUS_LABELS[s.status] ?? s.status)}
                    </span>
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
