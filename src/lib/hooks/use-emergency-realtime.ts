"use client";

// src/lib/hooks/use-emergency-realtime.ts
//
// ============================================================
// Real-time subscriptions for live emergency coordination.
// Subscribes to 5 postgres_changes on a single Supabase channel:
//   - emergency_events (status changes)
//   - emergency_event_zones (zone status)
//   - emergency_student_accountability (headcount)
//   - emergency_staff_accountability (staff check-in)
//   - emergency_event_log (timeline entries)
//
// Also tracks recently changed entity IDs so components can
// apply flash animations when data changes from another device.
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  EmergencyCoordinationLiveData,
  EmergencyEventLogEntryWithUser,
  EmergencyEventStatus,
  EmergencyZoneStatus,
} from "@/types/domain";
import { getActiveEvent } from "@/lib/actions/emergency-coordination";

export interface RecentChange {
  type: "student" | "staff" | "zone" | "timeline";
  action: string;
  timestamp: number;
}

export function useEmergencyRealtime(
  eventId: string | null,
  initialData: EmergencyCoordinationLiveData | null,
  onCriticalChange?: (type: string, action: string) => void,
) {
  const [data, setData] = useState(initialData);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const recentChangesRef = useRef(new Map<string, RecentChange>());
  const [changeVersion, setChangeVersion] = useState(0);
  const onCriticalChangeRef = useRef(onCriticalChange);
  onCriticalChangeRef.current = onCriticalChange;

  function trackChange(id: string, type: RecentChange["type"], action: string) {
    recentChangesRef.current.set(id, { type, action, timestamp: Date.now() });
    setChangeVersion((v) => v + 1);
    onCriticalChangeRef.current?.(type, action);
  }

  // Expire old entries every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [key, entry] of recentChangesRef.current) {
        if (now - entry.timestamp > 2000) {
          recentChangesRef.current.delete(key);
          changed = true;
        }
      }
      if (changed) setChangeVersion((v) => v + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Full refetch for complex state merges
  const refetch = useCallback(async () => {
    const result = await getActiveEvent();
    if (result.data) {
      setData(result.data);
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`emergency:${eventId}`)
      // Event status changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as EmergencyEventStatus;
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              event: {
                ...prev.event,
                ...payload.new,
                // Preserve joined data that postgres_changes doesn't include
                activated_by_user: prev.event.activated_by_user,
              },
            } as EmergencyCoordinationLiveData;
          });
          trackChange(eventId, "zone", `status_${newStatus}`);
          // If status changed to resolved/cancelled, the event is over
          if (newStatus === "resolved" || newStatus === "cancelled") {
            refetch();
          }
        },
      )
      // Zone status updates
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_event_zones",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const zoneStatus = payload.new.status as EmergencyZoneStatus;
          setData((prev) => {
            if (!prev) return prev;
            const updatedZones = prev.zones.map((z) =>
              z.id === payload.new.id
                ? {
                    ...z,
                    status: zoneStatus,
                    reported_at: payload.new.reported_at,
                    notes: payload.new.notes,
                    headcount_reported: payload.new.headcount_reported,
                    warden_id: payload.new.warden_id,
                  }
                : z,
            );
            return {
              ...prev,
              zones: updatedZones,
              summary: {
                ...prev.summary,
                zones_clear: updatedZones.filter(
                  (z) => z.status === "clear",
                ).length,
                zones_needing_assistance: updatedZones.filter(
                  (z) => z.status === "needs_assistance",
                ).length,
              },
            };
          });
          trackChange(payload.new.id as string, "zone", zoneStatus);
        },
      )
      // Student accountability
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_student_accountability",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const accounted = payload.new.accounted_for as boolean;
          setData((prev) => {
            if (!prev) return prev;
            const updatedStudents = prev.student_accountability.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    accounted_for: accounted,
                    accounted_by: payload.new.accounted_by,
                    accounted_at: payload.new.accounted_at,
                    method: payload.new.method,
                    notes: payload.new.notes,
                  }
                : s,
            );
            return {
              ...prev,
              student_accountability: updatedStudents,
              summary: {
                ...prev.summary,
                students_accounted: updatedStudents.filter(
                  (s) => s.accounted_for,
                ).length,
              },
            };
          });
          trackChange(
            payload.new.id as string,
            "student",
            accounted ? "accounted" : "unaccounted",
          );
        },
      )
      // Staff accountability
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_staff_accountability",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const accounted = payload.new.accounted_for as boolean;
          setData((prev) => {
            if (!prev) return prev;
            const updatedStaff = prev.staff_accountability.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    accounted_for: accounted,
                    accounted_at: payload.new.accounted_at,
                    role_during_event: payload.new.role_during_event,
                    status: payload.new.status,
                    notes: payload.new.notes,
                  }
                : s,
            );
            return {
              ...prev,
              staff_accountability: updatedStaff,
              summary: {
                ...prev.summary,
                staff_accounted: updatedStaff.filter(
                  (s) => s.accounted_for,
                ).length,
              },
            };
          });
          trackChange(
            payload.new.id as string,
            "staff",
            accounted ? "accounted" : "unaccounted",
          );
        },
      )
      // Timeline entries (append-only)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_event_log",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          // Fetch user details for the new entry
          const newEntry = payload.new as EmergencyEventLogEntryWithUser;
          if (newEntry.user_id) {
            const { data: userData } = await supabase
              .from("users")
              .select("id, first_name, last_name")
              .eq("id", newEntry.user_id)
              .single();
            newEntry.user = userData ?? null;
          } else {
            newEntry.user = null;
          }

          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              timeline: [...prev.timeline, newEntry],
            };
          });
          trackChange(newEntry.id, "timeline", newEntry.action);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, refetch]);

  return {
    data,
    refetch,
    recentChanges: recentChangesRef.current,
    changeVersion,
  };
}
