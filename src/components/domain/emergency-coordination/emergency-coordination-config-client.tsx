"use client";

import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { EmergencyCoordinationConfigData } from "@/types/domain";
import { EmergencyActivationButton } from "./emergency-activation-button";
import { EmergencyStatusBadge } from "./emergency-status-badge";

const EVENT_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmergencyCoordinationConfigClient({
  data,
  canActivate,
}: {
  data: EmergencyCoordinationConfigData;
  canActivate: boolean;
}) {
  const haptics = useHaptics();

  return (
    <div className="space-y-6">
      {/* Activation */}
      {canActivate && (
        <EmergencyActivationButton hasActiveEvent={!!data.active_event} />
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/admin/emergency-coordination/zones"
          onClick={() => haptics.impact("light")}
          className="active-push card-interactive rounded-[var(--radius-lg)] border border-border p-4 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <span className="text-2xl block mb-1">📍</span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Zones & Assembly Points
          </span>
          <span className="text-xs block mt-1" style={{ color: "var(--muted-foreground)" }}>
            {data.zones.length} configured
          </span>
        </Link>

        <Link
          href="/admin/emergency-coordination/active"
          onClick={() => haptics.impact("light")}
          className="active-push card-interactive rounded-[var(--radius-lg)] border border-border p-4 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <span className="text-2xl block mb-1">🎯</span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Live Coordination
          </span>
          <span className="text-xs block mt-1" style={{ color: "var(--muted-foreground)" }}>
            {data.active_event ? "Event active" : "No active event"}
          </span>
        </Link>

        <Link
          href="/admin/emergency-coordination/history"
          onClick={() => haptics.impact("light")}
          className="active-push card-interactive rounded-[var(--radius-lg)] border border-border p-4 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Event History
          </span>
          <span className="text-xs block mt-1" style={{ color: "var(--muted-foreground)" }}>
            {data.recent_events.length} events
          </span>
        </Link>
      </div>

      {/* Recent events */}
      {data.recent_events.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
            Recent Events
          </h2>
          <div className="space-y-2">
            {data.recent_events.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                href={`/admin/emergency-coordination/${event.id}`}
                onClick={() => haptics.impact("light")}
                className="active-push card-interactive flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-3"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {formatDate(event.activated_at)}
                    {event.activated_by_user &&
                      ` · ${event.activated_by_user.first_name} ${event.activated_by_user.last_name}`}
                  </p>
                </div>
                <EmergencyStatusBadge status={event.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
