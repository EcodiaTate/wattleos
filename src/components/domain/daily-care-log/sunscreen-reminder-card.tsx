"use client";

import type { SunscreenReminder } from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface SunscreenReminderCardProps {
  reminder: SunscreenReminder;
  onReapply: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SunscreenReminderCard({
  reminder,
  onReapply,
}: SunscreenReminderCardProps) {
  const haptics = useHaptics();

  const displayName =
    reminder.student.preferred_name || reminder.student.first_name;
  const initial = displayName.charAt(0).toUpperCase();
  const isUrgent = reminder.minutes_overdue > 30;

  function handleReapply() {
    haptics.impact("medium");
    onReapply();
  }

  return (
    <div
      className={`card-interactive rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)] ${
        isUrgent ? "animate-pulse" : ""
      }`}
      style={{ background: "var(--card)" }}
    >
      {/* Header row: avatar + child info */}
      <div className="flex items-start gap-3">
        {/* First-letter avatar */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: "var(--care-sunscreen)",
            color: "var(--care-sunscreen-fg)",
          }}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {displayName} {reminder.student.last_name}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Applied at {formatTime(reminder.entry.recorded_at)}
            {" \u2014 "}
            {reminder.minutes_overdue > 0
              ? `${reminder.minutes_overdue} min overdue`
              : "Due now"}
          </p>
        </div>
      </div>

      {/* Urgent indicator */}
      {isUrgent && (
        <p
          className="mt-2 text-xs font-semibold"
          style={{ color: "var(--care-sunscreen-fg)" }}
        >
          Reapplication urgently overdue
        </p>
      )}

      {/* Reapply button */}
      <button
        type="button"
        onClick={handleReapply}
        className="active-push touch-target mt-3 w-full rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-colors"
        style={{
          background: "var(--care-sunscreen)",
          color: "var(--care-sunscreen-fg)",
        }}
      >
        Reapply
      </button>
    </div>
  );
}
