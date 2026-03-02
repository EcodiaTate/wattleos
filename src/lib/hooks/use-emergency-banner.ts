"use client";

// src/lib/hooks/use-emergency-banner.ts
//
// ============================================================
// Lightweight hook for the app-wide emergency banner.
// Subscribes to emergency_events changes to detect activation
// and resolution, plus student accountability changes to keep
// the unaccounted count fresh. No permission check - all staff.
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getActiveEmergencyBanner } from "@/lib/actions/emergency-coordination";

export interface ActiveEmergencyBanner {
  id: string;
  event_type: string;
  severity: string;
  activated_at: string;
  status: string;
  students_unaccounted: number;
  students_total: number;
}

export function useEmergencyBanner(
  tenantId: string,
  initialData: ActiveEmergencyBanner | null,
) {
  const [activeEmergency, setActiveEmergency] =
    useState<ActiveEmergencyBanner | null>(initialData);
  const supabaseRef = useRef(createSupabaseBrowserClient());
  const lastRefetchRef = useRef(0);

  // Debounced refetch: max once per 3 seconds for accountability,
  // immediate for event state changes
  const refetch = useCallback(async (immediate: boolean) => {
    const now = Date.now();
    if (!immediate && now - lastRefetchRef.current < 3000) return;
    lastRefetchRef.current = now;

    const result = await getActiveEmergencyBanner();
    setActiveEmergency(result.data ?? null);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`emergency-banner:${tenantId}`)
      // Emergency event changes (activation, status change, resolution)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emergency_events",
        },
        () => {
          refetch(true);
        },
      )
      // Student accountability changes (update unaccounted count)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_student_accountability",
        },
        () => {
          refetch(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refetch]);

  return activeEmergency;
}
