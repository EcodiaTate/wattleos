"use client";

import { useState, useCallback, useMemo } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useOptimisticStudents } from "@/lib/hooks/use-optimistic-accountability";
import {
  accountStudent,
  bulkAccountStudents,
} from "@/lib/actions/emergency-coordination";
import type { EmergencyStudentAccountabilityWithStudent } from "@/types/domain";
import type { RecentChange } from "@/lib/hooks/use-emergency-realtime";

export function StudentRollCall({
  students,
  eventId,
  canCoordinate,
  recentChanges,
}: {
  students: EmergencyStudentAccountabilityWithStudent[];
  eventId: string;
  canCoordinate: boolean;
  recentChanges?: Map<string, RecentChange>;
}) {
  const { optimisticStudents, applyOptimistic, startTransition } =
    useOptimisticStudents(students);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [showAccounted, setShowAccounted] = useState(false);
  const haptics = useHaptics();

  // Group students by class
  const classGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        classId: string | null;
        students: EmergencyStudentAccountabilityWithStudent[];
      }
    >();

    for (const s of optimisticStudents) {
      const key = s.class_id ?? "unassigned";
      if (!groups.has(key)) {
        groups.set(key, { classId: s.class_id, students: [] });
      }
      groups.get(key)!.students.push(s);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [optimisticStudents]);

  const [activeClassTab, setActiveClassTab] = useState("all");

  const handleToggle = useCallback(
    (studentId: string, currentlyAccounted: boolean) => {
      haptics.impact(currentlyAccounted ? "light" : "medium");
      startTransition(async () => {
        applyOptimistic({
          studentId,
          accountedFor: !currentlyAccounted,
        });
        await accountStudent(eventId, {
          student_id: studentId,
          accounted_for: !currentlyAccounted,
          method: "roll_call",
          zone_id: null,
          notes: null,
        });
      });
    },
    [eventId, haptics, startTransition, applyOptimistic],
  );

  const handleBulkAccount = useCallback(
    async (classId: string, studentIds: string[]) => {
      haptics.impact("heavy");
      setBulkLoading(classId);

      // Optimistically mark all
      for (const id of studentIds) {
        startTransition(async () => {
          applyOptimistic({ studentId: id, accountedFor: true });
        });
      }

      await bulkAccountStudents(eventId, {
        student_ids: studentIds,
        method: "roll_call",
        zone_id: null,
      });

      setBulkLoading(null);
      haptics.success();
    },
    [eventId, haptics, startTransition, applyOptimistic],
  );

  const currentStudents =
    activeClassTab === "all"
      ? optimisticStudents
      : (classGroups.find(([key]) => key === activeClassTab)?.[1]?.students ??
        []);

  const unaccounted = currentStudents.filter((s) => !s.accounted_for);
  const accounted = currentStudents.filter((s) => s.accounted_for);

  return (
    <div className="space-y-3">
      {/* Class group filter chips */}
      {classGroups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scroll-native pb-1">
          <button
            onClick={() => {
              haptics.selection();
              setActiveClassTab("all");
            }}
            className="active-push touch-target shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border"
            style={{
              borderColor:
                activeClassTab === "all" ? "var(--primary)" : "var(--border)",
              backgroundColor:
                activeClassTab === "all" ? "var(--primary)" : "var(--card)",
              color:
                activeClassTab === "all"
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
            }}
          >
            All ({optimisticStudents.length})
          </button>
          {classGroups.map(([key, group]) => (
            <button
              key={key}
              onClick={() => {
                haptics.selection();
                setActiveClassTab(key);
              }}
              className="active-push touch-target shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border"
              style={{
                borderColor:
                  activeClassTab === key ? "var(--primary)" : "var(--border)",
                backgroundColor:
                  activeClassTab === key ? "var(--primary)" : "var(--card)",
                color:
                  activeClassTab === key
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            >
              {key === "unassigned" ? "No Class" : "Class"}
              {` (${group.students.filter((s) => s.accounted_for).length}/${group.students.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Bulk account button (sticky at top of unaccounted section) */}
      {canCoordinate && unaccounted.length > 0 && (
        <button
          onClick={() =>
            handleBulkAccount(
              activeClassTab,
              unaccounted.map((s) => s.student_id),
            )
          }
          disabled={bulkLoading === activeClassTab}
          className="active-push touch-target w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-bold"
          style={{
            backgroundColor: "var(--emergency-all-clear)",
            color: "var(--emergency-all-clear-fg)",
            opacity: bulkLoading === activeClassTab ? 0.5 : 1,
          }}
        >
          {bulkLoading === activeClassTab
            ? "Accounting..."
            : `Account All Remaining (${unaccounted.length})`}
        </button>
      )}

      {/* UNACCOUNTED students - always visible, prominent */}
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
          const displayName = s.student.preferred_name || s.student.first_name;
          const initials =
            (displayName?.[0] ?? "") + (s.student.last_name?.[0] ?? "");
          const isFlashing = recentChanges?.has(s.id);

          return (
            <button
              key={s.id}
              onClick={() =>
                canCoordinate && handleToggle(s.student_id, s.accounted_for)
              }
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
                {initials}
              </div>
              {/* Name */}
              <span
                className="flex-1 text-base font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {displayName} {s.student.last_name}
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

        {/* ACCOUNTED students - collapsed by default */}
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
                const displayName =
                  s.student.preferred_name || s.student.first_name;
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
                      {displayName} {s.student.last_name}
                    </span>
                    {s.method && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {s.method.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
