"use client";

// src/components/domain/ratios/ratio-dashboard-client.tsx
//
// Main dashboard client component - breach alert banner,
// stat summary, live educator breakdown, room cards,
// age-group breakdown + prediction panel, breach history chart.
// Uses Supabase Realtime for instant updates on sign-in/out
// events, with a 30s poll fallback when Realtime is unavailable.

import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentRatios, getRatioBreakdown } from "@/lib/actions/ratios";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { LiveRatioState } from "@/types/domain";
import type { BreachHistoryEntry, RatioBreakdown } from "@/lib/actions/ratios";
import { RoomRatioCard } from "./room-ratio-card";
import { BreachHistory } from "./breach-history";
import { LiveEducatorBreakdown } from "./live-educator-breakdown";
import { AgeGroupBreakdown } from "./age-group-breakdown";
import { BreachPrediction } from "./breach-prediction";
import { BreachHistoryChart } from "./breach-history-chart";

interface RatioDashboardClientProps {
  initialRatios: LiveRatioState[];
  initialBreaches: BreachHistoryEntry[];
  canSignIn: boolean;
  currentUserId: string;
  tenantId: string;
}

export function RatioDashboardClient({
  initialRatios,
  initialBreaches,
  canSignIn,
  currentUserId,
  tenantId,
}: RatioDashboardClientProps) {
  const [ratios, setRatios] = useState(initialRatios);
  const [isLive, setIsLive] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialRatios[0]?.class_id ?? null,
  );
  const [breakdown, setBreakdown] = useState<RatioBreakdown | null>(null);
  const supabaseRef = useRef(createSupabaseBrowserClient());

  const refresh = useCallback(async () => {
    const result = await getCurrentRatios();
    if (result.data) setRatios(result.data);
  }, []);

  const fetchBreakdown = useCallback(async (classId: string) => {
    const result = await getRatioBreakdown(classId);
    if (result.data) setBreakdown(result.data);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`ratio-realtime-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "floor_sign_ins",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          refresh();
          if (selectedClassId) fetchBreakdown(selectedClassId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ratio_logs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          refresh();
          if (selectedClassId) fetchBreakdown(selectedClassId);
        },
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    const poll = setInterval(() => {
      refresh();
      if (selectedClassId) fetchBreakdown(selectedClassId);
    }, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [tenantId, refresh, fetchBreakdown, selectedClassId]);

  // Fetch breakdown whenever selected class changes
  useEffect(() => {
    if (selectedClassId) fetchBreakdown(selectedClassId);
  }, [selectedClassId, fetchBreakdown]);

  const sortedRatios = [...ratios].sort((a, b) => {
    if (a.is_compliant !== b.is_compliant) return a.is_compliant ? 1 : -1;
    return a.class_name.localeCompare(b.class_name);
  });

  const totalRooms = ratios.length;
  const compliantRooms = ratios.filter((r) => r.is_compliant).length;
  const breachedRooms = totalRooms - compliantRooms;
  const totalChildren = ratios.reduce((s, r) => s + r.children_present, 0);
  const totalEducators = ratios.reduce((s, r) => s + r.educators_on_floor, 0);

  return (
    <div className="space-y-6">
      {/* Breach Alert Banner */}
      {breachedRooms > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--attendance-absent-fg, #991b1b)",
            backgroundColor: "var(--attendance-absent-bg, #fee2e2)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--attendance-absent-fg, #991b1b)" }}
          >
            {breachedRooms} room{breachedRooms !== 1 ? "s" : ""} out of ratio
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {ratios
              .filter((r) => !r.is_compliant)
              .map((r) => r.class_name)
              .join(", ")}{" "}
            - immediate action required
          </p>
        </div>
      )}

      {/* Stat Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rooms" value={totalRooms} />
        <StatCard
          label="Compliant"
          value={compliantRooms}
          colorVar="--attendance-present-fg"
        />
        <StatCard
          label="Breached"
          value={breachedRooms}
          colorVar={breachedRooms > 0 ? "--attendance-absent-fg" : undefined}
        />
        <StatCard
          label="On Floor"
          value={`${totalEducators} : ${totalChildren}`}
          subtitle="educators : children"
        />
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: isLive
              ? "var(--attendance-present)"
              : "var(--muted-foreground)",
          }}
        />
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {isLive ? "Live - updates automatically" : "Polling every 30s"}
        </span>
      </div>

      {/* Live Educator Breakdown */}
      <LiveEducatorBreakdown ratios={sortedRatios} />

      {/* Room Cards + Detail Panel */}
      {ratios.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: "var(--empty-state-icon)" }}>
            No active classes configured
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Room Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedRatios.map((ratio) => (
              <button
                key={ratio.class_id}
                type="button"
                className="text-left focus:outline-none"
                onClick={() => setSelectedClassId(ratio.class_id)}
              >
                <div
                  className={
                    selectedClassId === ratio.class_id
                      ? "rounded-xl ring-2 ring-inset"
                      : ""
                  }
                  style={
                    selectedClassId === ratio.class_id
                      ? { outline: "2px solid var(--ring, #2563eb)" }
                      : undefined
                  }
                >
                  <RoomRatioCard
                    ratio={ratio}
                    canSignIn={canSignIn}
                    currentUserId={currentUserId}
                    onRatioChange={refresh}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {breakdown ? (
              <>
                <BreachPrediction breakdown={breakdown} />
                <AgeGroupBreakdown breakdown={breakdown} />
              </>
            ) : (
              <div
                className="rounded-xl border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Select a room to see age-group breakdown and breach prediction
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breach History Chart */}
      <BreachHistoryChart breaches={initialBreaches} />

      {/* Breach History Table */}
      <BreachHistory breaches={initialBreaches} canAcknowledge={canSignIn} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Stat Card (private)
// ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtitle,
  colorVar,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  colorVar?: string;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: colorVar ? `var(${colorVar})` : "var(--foreground)" }}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
