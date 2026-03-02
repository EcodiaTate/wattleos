"use client";

import { useMemo } from "react";
import type { ActiveSleeper } from "@/types/domain";
import {
  SLEEP_CHECK_INTERVAL_INFANT_MINUTES,
  SLEEP_CHECK_INTERVAL_TODDLER_MINUTES,
} from "@/lib/constants/daily-care";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ActiveSleeperCardProps {
  sleeper: ActiveSleeper;
  onCheck: () => void;
}

/** Returns age in months from a date-of-birth string (YYYY-MM-DD). */
function ageInMonths(dob: string | null): number {
  if (!dob) return 24; // default to toddler if unknown
  const birth = new Date(dob + "T00:00:00");
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

export function ActiveSleeperCard({
  sleeper,
  onCheck,
}: ActiveSleeperCardProps) {
  const haptics = useHaptics();

  const displayName =
    sleeper.student.preferred_name || sleeper.student.first_name;
  const initial = displayName.charAt(0).toUpperCase();

  const durationMinutes = useMemo(
    () => minutesSince(sleeper.sleep_start),
    [sleeper.sleep_start],
  );

  const checkIntervalMinutes = useMemo(
    () =>
      ageInMonths(sleeper.student.dob) < 12
        ? SLEEP_CHECK_INTERVAL_INFANT_MINUTES
        : SLEEP_CHECK_INTERVAL_TODDLER_MINUTES,
    [sleeper.student.dob],
  );

  const lastCheckMinutesAgo = useMemo(
    () => (sleeper.last_check_at ? minutesSince(sleeper.last_check_at) : null),
    [sleeper.last_check_at],
  );

  const nextCheckDueIn = useMemo(() => {
    if (lastCheckMinutesAgo === null) {
      // No checks yet - due from sleep_start + interval
      const sinceStart = minutesSince(sleeper.sleep_start);
      return Math.max(0, checkIntervalMinutes - sinceStart);
    }
    return Math.max(0, checkIntervalMinutes - lastCheckMinutesAgo);
  }, [lastCheckMinutesAgo, checkIntervalMinutes, sleeper.sleep_start]);

  const isOverdue = nextCheckDueIn === 0;

  function handleCheck() {
    haptics.impact("medium");
    onCheck();
  }

  return (
    <div
      className="card-interactive rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      {/* Header row: avatar + child info */}
      <div className="flex items-start gap-3">
        {/* First-letter avatar */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: "var(--care-sleep)",
            color: "var(--care-sleep-fg)",
          }}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {displayName} {sleeper.student.last_name}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Sleeping since {formatTime(sleeper.sleep_start)} &middot;{" "}
            {formatDuration(durationMinutes)}
          </p>
        </div>
      </div>

      {/* Check info */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span style={{ color: "var(--muted-foreground)" }}>
          {lastCheckMinutesAgo !== null
            ? `Last check: ${lastCheckMinutesAgo} min ago`
            : "No checks yet"}
        </span>
        <span
          style={{
            color: isOverdue
              ? "var(--care-sleep-fg)"
              : "var(--muted-foreground)",
            fontWeight: isOverdue ? 600 : 400,
          }}
        >
          {isOverdue ? "Check overdue" : `Next check in ${nextCheckDueIn} min`}
        </span>
      </div>

      {/* Check interval note */}
      <p
        className="mt-1 text-[11px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        Every {checkIntervalMinutes} min
        {ageInMonths(sleeper.student.dob) < 12 ? " (infant)" : " (toddler)"}
      </p>

      {/* Check button */}
      <button
        type="button"
        onClick={handleCheck}
        className={`active-push touch-target mt-3 w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-colors ${
          isOverdue ? "animate-pulse" : ""
        }`}
        style={{
          background: "var(--care-sleep)",
          color: "var(--care-sleep-fg)",
        }}
      >
        Check
      </button>
    </div>
  );
}
