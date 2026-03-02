"use client";

import type { EmergencyEventZoneWithDetails } from "@/types/domain";
import { ZoneStatusCard, ZoneChip } from "./zone-status-card";
import type { RecentChange } from "@/lib/hooks/use-emergency-realtime";

export function ZoneGrid({
  zones,
  eventId,
  canCoordinate,
  display = "grid",
  recentChanges,
}: {
  zones: EmergencyEventZoneWithDetails[];
  eventId: string;
  canCoordinate: boolean;
  display?: "grid" | "strip";
  recentChanges?: Map<string, RecentChange>;
}) {
  if (zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <span
          className="text-2xl mb-2"
          style={{ color: "var(--empty-state-icon)" }}
        >
          \uD83D\uDCCD
        </span>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No zones configured
        </p>
      </div>
    );
  }

  // Strip mode: compact horizontal scrollable row of zone chips
  if (display === "strip") {
    return (
      <div className="flex gap-2 overflow-x-auto scroll-native pb-1">
        {zones.map((zone) => (
          <ZoneChip
            key={zone.id}
            eventZone={zone}
            eventId={eventId}
            canCoordinate={canCoordinate}
            isFlashing={recentChanges?.has(zone.id)}
          />
        ))}
      </div>
    );
  }

  // Grid mode: full cards for config pages
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {zones.map((zone) => (
        <ZoneStatusCard
          key={zone.id}
          eventZone={zone}
          eventId={eventId}
          canCoordinate={canCoordinate}
        />
      ))}
    </div>
  );
}
