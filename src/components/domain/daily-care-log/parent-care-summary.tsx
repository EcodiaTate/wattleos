"use client";

import type { DailyCareLogWithEntries } from "@/types/domain";
import { CARE_ENTRY_TYPE_CONFIG } from "@/lib/constants/daily-care";

interface ParentCareSummaryProps {
  log: DailyCareLogWithEntries;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Compute total sleep duration in minutes by pairing sleep_start/sleep_end
 * entries chronologically.
 */
function computeTotalSleepMinutes(
  entries: DailyCareLogWithEntries["entries"],
): number {
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  let totalMinutes = 0;
  let lastSleepStart: string | null = null;

  for (const entry of sorted) {
    if (entry.entry_type === "sleep_start") {
      lastSleepStart = entry.recorded_at;
    } else if (entry.entry_type === "sleep_end" && lastSleepStart) {
      const diff =
        new Date(entry.recorded_at).getTime() -
        new Date(lastSleepStart).getTime();
      totalMinutes += Math.max(0, Math.floor(diff / 60000));
      lastSleepStart = null;
    }
  }

  return totalMinutes;
}

function formatSleepDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return "0 min";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

interface SummaryItem {
  emoji: string;
  label: string;
  value: string;
}

export function ParentCareSummary({ log }: ParentCareSummaryProps) {
  const entries = log.entries;

  const nappyCount = entries.filter(
    (e) => e.entry_type === "nappy_change",
  ).length;
  const mealCount = entries.filter((e) => e.entry_type === "meal").length;
  const bottleCount = entries.filter((e) => e.entry_type === "bottle").length;
  const sunscreenCount = entries.filter(
    (e) => e.entry_type === "sunscreen",
  ).length;
  const sleepMinutes = computeTotalSleepMinutes(entries);

  const summaryItems: SummaryItem[] = [
    {
      emoji: CARE_ENTRY_TYPE_CONFIG.nappy_change.emoji,
      label: "Nappy changes",
      value: String(nappyCount),
    },
    {
      emoji: CARE_ENTRY_TYPE_CONFIG.meal.emoji,
      label: "Meals",
      value: String(mealCount),
    },
    {
      emoji: CARE_ENTRY_TYPE_CONFIG.bottle.emoji,
      label: "Bottles",
      value: String(bottleCount),
    },
    {
      emoji: CARE_ENTRY_TYPE_CONFIG.sleep_start.emoji,
      label: "Sleep",
      value: formatSleepDuration(sleepMinutes),
    },
    {
      emoji: CARE_ENTRY_TYPE_CONFIG.sunscreen.emoji,
      label: "Sunscreen",
      value: `${sunscreenCount} time${sunscreenCount !== 1 ? "s" : ""}`,
    },
  ];

  const displayName =
    log.student.preferred_name || log.student.first_name;

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      {/* Date header */}
      <div className="mb-4">
        <p
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {displayName}&apos;s Day
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {formatDate(log.log_date)}
        </p>
      </div>

      {/* Summary counts grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-border px-3 py-2.5"
            style={{ background: "var(--background)" }}
          >
            <span className="text-lg">{item.emoji}</span>
            <div>
              <p
                className="text-sm font-semibold tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {item.value}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* General notes from educator */}
      {log.general_notes && (
        <div
          className="mt-4 rounded-[var(--radius-md)] border border-border px-3 py-2.5"
          style={{ background: "var(--background)" }}
        >
          <p
            className="mb-1 text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Notes from educator
          </p>
          <p className="text-sm" style={{ color: "var(--foreground)" }}>
            {log.general_notes}
          </p>
        </div>
      )}
    </div>
  );
}
