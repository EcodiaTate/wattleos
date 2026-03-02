"use client";

import { useOptimistic, useTransition } from "react";
import type {
  EmergencyStudentAccountabilityWithStudent,
  EmergencyStaffAccountabilityWithUser,
  EmergencyEventZoneWithDetails,
  EmergencyZoneStatus,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Student accountability - optimistic toggle
// ---------------------------------------------------------------------------

export function useOptimisticStudents(
  students: EmergencyStudentAccountabilityWithStudent[],
) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    students,
    (
      state: EmergencyStudentAccountabilityWithStudent[],
      update: { studentId: string; accountedFor: boolean },
    ) =>
      state.map((s) =>
        s.student_id === update.studentId
          ? { ...s, accounted_for: update.accountedFor }
          : s,
      ),
  );

  return {
    optimisticStudents: optimistic,
    applyOptimistic,
    startTransition,
    isPending,
  };
}

// ---------------------------------------------------------------------------
// Staff accountability - optimistic toggle
// ---------------------------------------------------------------------------

export function useOptimisticStaff(
  staff: EmergencyStaffAccountabilityWithUser[],
) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    staff,
    (
      state: EmergencyStaffAccountabilityWithUser[],
      update: { userId: string; accountedFor: boolean },
    ) =>
      state.map((s) =>
        s.user_id === update.userId
          ? { ...s, accounted_for: update.accountedFor }
          : s,
      ),
  );

  return {
    optimisticStaff: optimistic,
    applyOptimistic,
    startTransition,
    isPending,
  };
}

// ---------------------------------------------------------------------------
// Zone status - optimistic update
// ---------------------------------------------------------------------------

export function useOptimisticZones(zones: EmergencyEventZoneWithDetails[]) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    zones,
    (
      state: EmergencyEventZoneWithDetails[],
      update: { zoneId: string; status: EmergencyZoneStatus },
    ) =>
      state.map((z) =>
        z.id === update.zoneId ? { ...z, status: update.status } : z,
      ),
  );

  return {
    optimisticZones: optimistic,
    applyOptimistic,
    startTransition,
    isPending,
  };
}
