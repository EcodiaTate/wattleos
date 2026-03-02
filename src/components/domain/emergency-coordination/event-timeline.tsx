"use client";

import { useEffect, useRef } from "react";
import type { EmergencyEventLogEntryWithUser } from "@/types/domain";
import type { RecentChange } from "@/lib/hooks/use-emergency-realtime";

const ACTION_ICONS: Record<string, string> = {
  event_activated: "\uD83D\uDEA8",
  event_status_changed: "\uD83D\uDD04",
  zone_cleared: "\u2705",
  zone_needs_assistance: "\uD83C\uDD98",
  student_accounted: "\uD83D\uDC67",
  staff_accounted: "\uD83D\uDC64",
  all_clear_declared: "\uD83D\uDD14",
  event_resolved: "\uD83D\uDCCB",
  event_cancelled: "\u274C",
  announcement_sent: "\uD83D\uDCE2",
  note_added: "\uD83D\uDCDD",
  warden_assigned: "\uD83D\uDEE1\uFE0F",
  bulk_students_accounted: "\uD83D\uDC67",
};

const CRITICAL_ACTIONS = new Set([
  "zone_needs_assistance",
  "zone_blocked",
  "all_clear_declared",
  "event_activated",
]);

// Dot color by action category
function getDotColor(action: string): string {
  if (action === "zone_cleared" || action === "all_clear_declared") {
    return "var(--emergency-all-clear)";
  }
  if (action === "zone_needs_assistance" || action === "event_cancelled") {
    return "var(--emergency-activated)";
  }
  if (action === "student_accounted" || action === "staff_accounted" || action === "bulk_students_accounted") {
    return "var(--emergency-all-clear)";
  }
  if (action === "event_activated") {
    return "var(--emergency-critical)";
  }
  return "var(--muted-foreground)";
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function EventTimeline({
  entries,
  compact,
  recentChanges,
}: {
  entries: EmergencyEventLogEntryWithUser[];
  compact?: boolean;
  recentChanges?: Map<string, RecentChange>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4">
        <span
          className="text-lg mb-1"
          style={{ color: "var(--empty-state-icon)" }}
        >
          {compact ? "\u2022" : "\uD83D\uDCCB"}
        </span>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          No events yet
        </p>
      </div>
    );
  }

  // Compact mode: single-line entries with colored dots
  if (compact) {
    return (
      <div className="scroll-native max-h-[300px] lg:max-h-[50vh] overflow-y-auto space-y-0.5 pr-1">
        {entries.map((entry) => {
          const isCritical = CRITICAL_ACTIONS.has(entry.action);
          const isFlashing = recentChanges?.has(entry.id);
          const userName = entry.user
            ? `${entry.user.first_name?.[0] ?? ""}. ${entry.user.last_name ?? ""}`
            : "";

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-xs ${isFlashing ? "animate-slide-in-right emergency-flash" : ""}`}
              style={{
                borderLeft: isCritical
                  ? `2px solid ${getDotColor(entry.action)}`
                  : undefined,
                paddingLeft: isCritical ? "6px" : undefined,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: getDotColor(entry.action) }}
              />
              <span
                className="font-mono tabular-nums shrink-0"
                style={{ color: "var(--muted-foreground)" }}
              >
                {formatTime(entry.created_at)}
              </span>
              <span
                className="truncate"
                style={{ color: "var(--foreground)" }}
              >
                {entry.message}
              </span>
              {userName && (
                <span
                  className="shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {userName}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    );
  }

  // Full mode: emoji icons, multi-line entries (for post-event view)
  return (
    <div className="scroll-native max-h-[400px] overflow-y-auto space-y-1 pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start gap-2 rounded-[var(--radius)] px-2 py-1.5"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <span className="text-sm shrink-0 mt-0.5">
            {ACTION_ICONS[entry.action] ?? "\u2022"}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-sm leading-snug"
              style={{ color: "var(--foreground)" }}
            >
              {entry.message}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              {formatTime(entry.created_at)}
              {entry.user &&
                ` \u00B7 ${entry.user.first_name} ${entry.user.last_name}`}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
