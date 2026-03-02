"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useOptimisticZones } from "@/lib/hooks/use-optimistic-accountability";
import { reportZoneStatus } from "@/lib/actions/emergency-coordination";
import { ZoneStatusBadge } from "./zone-status-badge";
import type {
  EmergencyEventZoneWithDetails,
  EmergencyZoneStatus,
} from "@/types/domain";
import type { RecentChange } from "@/lib/hooks/use-emergency-realtime";

const WARDEN_ACTIONS: { status: EmergencyZoneStatus; label: string }[] = [
  { status: "evacuating", label: "Evacuating" },
  { status: "clear", label: "Clear" },
  { status: "needs_assistance", label: "Need Help" },
  { status: "blocked", label: "Blocked" },
];

// Status cycle for single-tap in compact mode
const STATUS_CYCLE: EmergencyZoneStatus[] = [
  "pending",
  "evacuating",
  "clear",
];

function getNextStatus(current: EmergencyZoneStatus): EmergencyZoneStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  if (idx === -1 || idx === STATUS_CYCLE.length - 1) return "clear";
  return STATUS_CYCLE[idx + 1];
}

const ZONE_STATUS_COLORS: Record<
  EmergencyZoneStatus,
  { bg: string; border: string; dot: string }
> = {
  pending: {
    bg: "var(--card)",
    border: "var(--zone-pending)",
    dot: "var(--zone-pending)",
  },
  evacuating: {
    bg: "var(--card)",
    border: "var(--zone-evacuating)",
    dot: "var(--zone-evacuating)",
  },
  clear: {
    bg: "var(--emergency-all-clear-bg)",
    border: "var(--zone-clear)",
    dot: "var(--zone-clear)",
  },
  needs_assistance: {
    bg: "var(--emergency-activated-bg)",
    border: "var(--zone-needs-assistance)",
    dot: "var(--zone-needs-assistance)",
  },
  blocked: {
    bg: "var(--emergency-activated-bg)",
    border: "var(--zone-blocked, var(--emergency-activated))",
    dot: "var(--zone-blocked, var(--emergency-activated))",
  },
};

// ---------------------------------------------------------------------------
// Compact zone chip for live emergency
// ---------------------------------------------------------------------------

export function ZoneChip({
  eventZone,
  eventId,
  canCoordinate,
  isFlashing,
  onStatusChange,
}: {
  eventZone: EmergencyEventZoneWithDetails;
  eventId: string;
  canCoordinate: boolean;
  isFlashing?: boolean;
  onStatusChange?: (zoneId: string, status: EmergencyZoneStatus) => void;
}) {
  const haptics = useHaptics();
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const needsAttention =
    eventZone.status === "needs_assistance" ||
    eventZone.status === "blocked";

  const colors = ZONE_STATUS_COLORS[eventZone.status] ?? ZONE_STATUS_COLORS.pending;

  const handleReport = useCallback(
    async (newStatus: EmergencyZoneStatus) => {
      haptics.impact(
        newStatus === "clear"
          ? "medium"
          : newStatus === "needs_assistance"
            ? "heavy"
            : "light",
      );
      onStatusChange?.(eventZone.id, newStatus);

      await reportZoneStatus(eventId, {
        event_zone_id: eventZone.id,
        status: newStatus,
        notes: null,
        headcount_reported: null,
      });

      setShowMenu(false);
    },
    [eventId, eventZone.id, haptics, onStatusChange],
  );

  const handleTouchStart = () => {
    if (!canCoordinate) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      haptics.impact("heavy");
      setShowMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Short tap: cycle status
    if (!didLongPress.current && canCoordinate && eventZone.status !== "clear") {
      const next = getNextStatus(eventZone.status);
      handleReport(next);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  return (
    <div className="relative shrink-0">
      <button
        onPointerDown={handleTouchStart}
        onPointerUp={handleTouchEnd}
        onPointerCancel={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        className={`active-push touch-target inline-flex items-center gap-2 rounded-full px-4 py-2 border-2 select-none ${needsAttention ? "animate-pulse" : ""} ${isFlashing ? "emergency-flash" : ""}`}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: colors.dot }}
        />
        <span
          className="text-sm font-semibold truncate max-w-[120px]"
          style={{ color: "var(--foreground)" }}
        >
          {eventZone.zone.name}
        </span>
        {needsAttention && (
          <span
            className="text-xs font-bold"
            style={{ color: colors.border }}
          >
            !
          </span>
        )}
      </button>

      {/* Long-press menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-[var(--radius-lg)] border border-border p-1 shadow-lg min-w-[160px]"
            style={{ backgroundColor: "var(--card)" }}
          >
            {WARDEN_ACTIONS.filter(
              (a) => a.status !== eventZone.status,
            ).map((action) => (
              <button
                key={action.status}
                onClick={() => handleReport(action.status)}
                className="active-push touch-target flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-left"
                style={{ color: "var(--foreground)" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      ZONE_STATUS_COLORS[action.status]?.dot ??
                      "var(--muted)",
                  }}
                />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full zone card for config / post-event pages (kept for backward compat)
// ---------------------------------------------------------------------------

export function ZoneStatusCard({
  eventZone,
  eventId,
  canCoordinate,
  compact,
  isFlashing,
  onStatusChange,
}: {
  eventZone: EmergencyEventZoneWithDetails;
  eventId: string;
  canCoordinate: boolean;
  compact?: boolean;
  isFlashing?: boolean;
  onStatusChange?: (zoneId: string, status: EmergencyZoneStatus) => void;
}) {
  // Compact mode delegates to ZoneChip
  if (compact) {
    return (
      <ZoneChip
        eventZone={eventZone}
        eventId={eventId}
        canCoordinate={canCoordinate}
        isFlashing={isFlashing}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <ZoneStatusCardFull
      eventZone={eventZone}
      eventId={eventId}
      canCoordinate={canCoordinate}
    />
  );
}

function ZoneStatusCardFull({
  eventZone,
  eventId,
  canCoordinate,
}: {
  eventZone: EmergencyEventZoneWithDetails;
  eventId: string;
  canCoordinate: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const haptics = useHaptics();

  const handleReport = useCallback(
    async (newStatus: EmergencyZoneStatus) => {
      haptics.impact(
        newStatus === "clear"
          ? "medium"
          : newStatus === "needs_assistance"
            ? "heavy"
            : "light",
      );
      setLoading(true);

      await reportZoneStatus(eventId, {
        event_zone_id: eventZone.id,
        status: newStatus,
        notes: null,
        headcount_reported: null,
      });

      setLoading(false);
    },
    [eventId, eventZone.id, haptics],
  );

  const needsAttention =
    eventZone.status === "needs_assistance" ||
    eventZone.status === "blocked";

  return (
    <div
      className={`card-interactive rounded-[var(--radius-lg)] border p-3 space-y-2 ${
        needsAttention ? "animate-pulse" : ""
      }`}
      style={{
        borderColor: needsAttention
          ? "var(--zone-needs-assistance)"
          : eventZone.status === "clear"
            ? "var(--zone-clear)"
            : "var(--border)",
        backgroundColor: "var(--card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h4
            className="font-semibold text-sm truncate"
            style={{ color: "var(--foreground)" }}
          >
            {eventZone.zone.name}
          </h4>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {eventZone.zone.zone_type === "assembly_point"
              ? "Assembly Point"
              : eventZone.zone.zone_type === "indoor"
                ? "Indoor"
                : "Outdoor"}
            {eventZone.zone.capacity &&
              ` \u00B7 Cap: ${eventZone.zone.capacity}`}
          </p>
        </div>
        <ZoneStatusBadge status={eventZone.status} />
      </div>

      {/* Warden */}
      {eventZone.warden && (
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Warden: {eventZone.warden.first_name}{" "}
          {eventZone.warden.last_name}
        </p>
      )}

      {/* Headcount */}
      {eventZone.headcount_reported !== null && (
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Headcount: {eventZone.headcount_reported}
        </p>
      )}

      {/* Notes */}
      {eventZone.notes && (
        <p
          className="text-xs italic"
          style={{ color: "var(--muted-foreground)" }}
        >
          {eventZone.notes}
        </p>
      )}

      {/* Warden action buttons */}
      {canCoordinate && eventZone.status !== "clear" && (
        <div className="flex gap-1.5 pt-1">
          {WARDEN_ACTIONS.filter(
            (a) => a.status !== eventZone.status,
          ).map((action) => (
            <button
              key={action.status}
              onClick={() => handleReport(action.status)}
              disabled={loading}
              className="active-push touch-target flex-1 rounded-[var(--radius)] px-2 py-1.5 text-xs font-medium border border-border"
              style={{
                color: "var(--foreground)",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
