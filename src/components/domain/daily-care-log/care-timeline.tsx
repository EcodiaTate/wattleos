"use client";

import type { DailyCareEntryWithRecorder } from "@/types/domain";
import { CareEntryTypeBadge } from "./care-entry-type-badge";
import {
  CARE_ENTRY_TYPE_CONFIG,
  NAPPY_TYPE_CONFIG,
  MEAL_TYPE_CONFIG,
  FOOD_CONSUMED_CONFIG,
  BOTTLE_TYPE_CONFIG,
  SLEEP_POSITION_CONFIG,
  SLEEP_MANNER_CONFIG,
  WELLBEING_MOOD_CONFIG,
} from "@/lib/constants/daily-care";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface CareTimelineProps {
  entries: DailyCareEntryWithRecorder[];
  onEdit?: (entry: DailyCareEntryWithRecorder) => void;
  onDelete?: (entryId: string) => void;
  readOnly?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatReapplyTime(iso: string | null): string {
  if (!iso) return "";
  return formatTime(iso);
}

/** Build a short detail summary line based on entry type. */
function getDetailSummary(entry: DailyCareEntryWithRecorder): string {
  switch (entry.entry_type) {
    case "nappy_change": {
      const type = entry.nappy_type
        ? NAPPY_TYPE_CONFIG[entry.nappy_type].label
        : "Nappy";
      const cream = entry.nappy_cream_applied ? " \u2014 cream applied" : "";
      return `${type}${cream}`;
    }
    case "meal": {
      const meal = entry.meal_type
        ? MEAL_TYPE_CONFIG[entry.meal_type].label
        : "Meal";
      const consumed = entry.food_consumed
        ? ` \u2014 ${FOOD_CONSUMED_CONFIG[entry.food_consumed].emoji} ${FOOD_CONSUMED_CONFIG[entry.food_consumed].label}`
        : "";
      return `${meal}${consumed}`;
    }
    case "bottle": {
      const bType = entry.bottle_type
        ? BOTTLE_TYPE_CONFIG[entry.bottle_type].label
        : "Bottle";
      const amount =
        entry.bottle_amount_ml != null ? ` \u2014 ${entry.bottle_amount_ml} ml` : "";
      return `${bType}${amount}`;
    }
    case "sleep_start": {
      const position = entry.sleep_position
        ? SLEEP_POSITION_CONFIG[entry.sleep_position].label
        : "";
      const manner = entry.sleep_manner
        ? SLEEP_MANNER_CONFIG[entry.sleep_manner].label
        : "";
      const parts = [position, manner].filter(Boolean);
      return parts.length > 0 ? parts.join(" \u2014 ") : "Sleep started";
    }
    case "sleep_end":
      return "Woke up";
    case "sunscreen": {
      const spf =
        entry.sunscreen_spf != null ? `SPF ${entry.sunscreen_spf}` : "Sunscreen";
      const reapply = entry.sunscreen_reapply_due
        ? ` \u2014 reapply by ${formatReapplyTime(entry.sunscreen_reapply_due)}`
        : "";
      return `${spf}${reapply}`;
    }
    case "wellbeing_note": {
      const mood = entry.wellbeing_mood
        ? `${WELLBEING_MOOD_CONFIG[entry.wellbeing_mood].emoji} ${WELLBEING_MOOD_CONFIG[entry.wellbeing_mood].label}`
        : "Wellbeing";
      const temp =
        entry.wellbeing_temperature != null
          ? ` \u2014 ${entry.wellbeing_temperature}\u00B0C`
          : "";
      return `${mood}${temp}`;
    }
    default:
      return "";
  }
}

function getRecorderName(
  entry: DailyCareEntryWithRecorder,
): string {
  if (!entry.recorder) return "Unknown";
  return `${entry.recorder.first_name} ${entry.recorder.last_name}`;
}

export function CareTimeline({
  entries,
  onEdit,
  onDelete,
  readOnly = false,
}: CareTimelineProps) {
  const haptics = useHaptics();

  // Sort entries chronologically (earliest first)
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--empty-state-icon)" }}
        >
          <circle cx={12} cy={12} r={10} />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p
          className="mt-3 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          No care entries recorded yet
        </p>
      </div>
    );
  }

  function handleEdit(entry: DailyCareEntryWithRecorder) {
    haptics.impact("light");
    onEdit?.(entry);
  }

  function handleDelete(entryId: string) {
    haptics.impact("medium");
    onDelete?.(entryId);
  }

  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div
        className="absolute left-[19px] top-2 bottom-2 w-px"
        style={{ background: "var(--border)" }}
      />

      <div className="flex flex-col gap-0">
        {sorted.map((entry, idx) => {
          const cfg = CARE_ENTRY_TYPE_CONFIG[entry.entry_type];
          const isLast = idx === sorted.length - 1;

          return (
            <div key={entry.id} className="group relative flex gap-3 pb-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
                  style={{
                    background: cfg.cssVar,
                    color: cfg.cssVarFg,
                  }}
                >
                  {cfg.emoji}
                </div>
                {/* Hide tail connector on last item */}
                {!isLast && <div className="w-px flex-1" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Time + badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {formatTime(entry.recorded_at)}
                      </span>
                      <CareEntryTypeBadge entryType={entry.entry_type} size="sm" />
                    </div>

                    {/* Detail summary */}
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {getDetailSummary(entry)}
                    </p>

                    {/* Notes */}
                    {entry.notes && (
                      <p
                        className="mt-1 text-xs italic"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {entry.notes}
                      </p>
                    )}

                    {/* Sleep checks (shown inline for parent/readOnly views) */}
                    {entry.sleep_checks && entry.sleep_checks.length > 0 && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {entry.sleep_checks.map((check) => (
                          <div
                            key={check.id}
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: "var(--care-sleep)" }}
                            />
                            <span className="tabular-nums">
                              {formatTime(check.checked_at)}
                            </span>
                            <span>
                              &mdash; {SLEEP_POSITION_CONFIG[check.position]?.label ?? check.position}
                              {check.breathing_normal ? ", breathing normal" : ", breathing concern"}
                              {check.notes ? ` \u2014 ${check.notes}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recorder */}
                    <p
                      className="mt-1 text-[11px]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {getRecorderName(entry)}
                    </p>
                  </div>

                  {/* Edit/Delete actions (hover only, not in readOnly mode) */}
                  {!readOnly && (onEdit || onDelete) && (
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="active-push touch-target rounded-[var(--radius-md)] p-1.5 transition-colors"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-label={`Edit ${cfg.label} entry`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="active-push touch-target rounded-[var(--radius-md)] p-1.5 transition-colors"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-label={`Delete ${cfg.label} entry`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
