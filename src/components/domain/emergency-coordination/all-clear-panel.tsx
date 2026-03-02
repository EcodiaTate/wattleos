"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  declareAllClear,
  resolveEvent,
  cancelEvent,
} from "@/lib/actions/emergency-coordination";
import type { EmergencyEventStatus } from "@/types/domain";

export function AllClearPanel({
  eventId,
  eventStatus,
  summary,
}: {
  eventId: string;
  eventStatus: EmergencyEventStatus;
  summary: {
    students_accounted: number;
    students_total: number;
    staff_accounted: number;
    staff_total: number;
    zones_clear: number;
    zones_total: number;
  };
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState<
    "all_clear" | "resolve" | "cancel" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const haptics = useHaptics();
  const router = useRouter();

  const unaccountedStudents =
    summary.students_total - summary.students_accounted;
  const unaccountedStaff = summary.staff_total - summary.staff_accounted;
  const hasUnaccounted = unaccountedStudents > 0 || unaccountedStaff > 0;

  const handleAction = useCallback(async () => {
    haptics.impact("heavy");
    setLoading(true);
    setError(null);

    let result;
    if (action === "all_clear") {
      result = await declareAllClear(eventId);
    } else if (action === "resolve") {
      result = await resolveEvent(eventId);
    } else if (action === "cancel") {
      result = await cancelEvent(eventId);
    }

    setLoading(false);

    if (result?.error) {
      setError(result.error.message);
      haptics.error();
      return;
    }

    haptics.success();
    setShowConfirm(false);
    setAction(null);

    if (action === "resolve" || action === "cancel") {
      router.push(`/admin/emergency-coordination/${eventId}`);
    }
    router.refresh();
  }, [action, eventId, haptics, router]);

  // Confirmation overlay
  if (showConfirm) {
    return (
      <div
        className="sticky bottom-0 z-10 -mx-2 sm:-mx-3 px-2 sm:px-3 py-3 space-y-2 border-t"
        style={{
          backgroundColor: "var(--background)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-sm font-semibold text-center"
          style={{ color: "var(--foreground)" }}
        >
          {action === "all_clear" && "Declare all clear?"}
          {action === "resolve" && "Resolve and close this event?"}
          {action === "cancel" && "Cancel this emergency (false alarm)?"}
        </p>
        {error && (
          <p
            className="text-xs text-center"
            style={{ color: "var(--destructive)" }}
          >
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowConfirm(false);
              setAction(null);
              haptics.impact("light");
            }}
            className="active-push touch-target flex-1 rounded-[var(--radius)] border border-border px-4 py-3 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
            disabled={loading}
          >
            Back
          </button>
          <button
            onClick={handleAction}
            disabled={loading}
            className="active-push touch-target flex-1 rounded-[var(--radius)] px-4 py-3 text-sm font-bold"
            style={{
              backgroundColor:
                action === "cancel"
                  ? "var(--emergency-cancelled)"
                  : action === "resolve"
                    ? "var(--emergency-resolved)"
                    : "var(--emergency-all-clear)",
              color:
                action === "cancel"
                  ? "var(--emergency-cancelled-fg)"
                  : action === "resolve"
                    ? "var(--emergency-resolved-fg)"
                    : "var(--emergency-all-clear-fg)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 z-10 -mx-2 sm:-mx-3 px-2 sm:px-3 py-3 border-t"
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      {/* Unaccounted warning */}
      {hasUnaccounted &&
        (eventStatus === "activated" || eventStatus === "responding") && (
          <p
            className="text-xs font-semibold mb-2 text-center"
            style={{ color: "var(--emergency-high)" }}
          >
            {unaccountedStudents > 0 &&
              `${unaccountedStudents} student${unaccountedStudents !== 1 ? "s" : ""}`}
            {unaccountedStudents > 0 && unaccountedStaff > 0 && " + "}
            {unaccountedStaff > 0 &&
              `${unaccountedStaff} staff`}{" "}
            STILL UNACCOUNTED
          </p>
        )}

      <div className="flex gap-2">
        {(eventStatus === "activated" || eventStatus === "responding") && (
          <>
            <button
              onClick={() => {
                haptics.impact("light");
                setAction("cancel");
                setShowConfirm(true);
              }}
              className="active-push touch-target rounded-[var(--radius)] border border-border px-3 py-2 text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                haptics.impact("medium");
                setAction("all_clear");
                setShowConfirm(true);
              }}
              className="active-push flex-1 rounded-[var(--radius)] px-4 text-base font-extrabold uppercase tracking-wider"
              style={{
                minHeight: "52px",
                backgroundColor: "var(--emergency-all-clear)",
                color: "var(--emergency-all-clear-fg)",
              }}
            >
              DECLARE ALL CLEAR
            </button>
          </>
        )}

        {eventStatus === "all_clear" && (
          <button
            onClick={() => {
              haptics.impact("medium");
              setAction("resolve");
              setShowConfirm(true);
            }}
            className="active-push flex-1 rounded-[var(--radius)] px-4 text-base font-extrabold uppercase tracking-wider"
            style={{
              minHeight: "52px",
              backgroundColor: "var(--emergency-resolved)",
              color: "var(--emergency-resolved-fg)",
            }}
          >
            RESOLVE & CLOSE
          </button>
        )}
      </div>
    </div>
  );
}
