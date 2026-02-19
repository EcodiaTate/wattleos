"use client";

import type { PortfolioTimelineItem } from "@/lib/actions/mastery";
import { MASTERY_STATUS_CONFIG } from "@/lib/utils/mastery-status";
import type { MasteryStatus } from "@/types/domain";

// ============================================================
// Props
// ============================================================
interface PortfolioTimelineProps {
  items: PortfolioTimelineItem[];
  studentName: string;
}

// ============================================================
// PortfolioTimeline
// ============================================================
export function PortfolioTimeline({
  items,
  studentName,
}: PortfolioTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg borderborder-border bg-background p-8 text-center">
        <svg
          className="mx-auto h-[var(--density-button-height)] w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
        <h3 className="mt-3 text-sm font-semibold text-foreground">
          No portfolio entries yet
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {studentName}&apos;s learning journey will appear here as observations
          are published and mastery milestones are reached.
        </p>
      </div>
    );
  }

  // Group items by date
  const groupedByDate = new Map<string, PortfolioTimelineItem[]>();
  for (const item of items) {
    const dateKey = new Date(item.date).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(item);
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedByDate.entries()).map(([dateLabel, dateItems]) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-muted-foreground">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Items for this date */}
          <div className="space-y-3">
            {dateItems.map((item, idx) => (
              <TimelineCard key={`${item.type}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TimelineCard - renders a single timeline entry
// ============================================================
function TimelineCard({ item }: { item: PortfolioTimelineItem }) {
  if (item.type === "observation") {
    return <ObservationCard item={item} />;
  }
  return <MasteryChangeCard item={item} />;
}

// ============================================================
// ObservationCard
// ============================================================
function ObservationCard({ item }: { item: PortfolioTimelineItem }) {
  const time = new Date(item.date).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] transition-shadow hover:shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Observation icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-3.5 w-3.5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-foreground">
              Observation
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              by {item.observation_author}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>

      {/* Content preview */}
      {item.observation_content && (
        <p className="mb-2 line-clamp-3 text-sm text-foreground">
          {item.observation_content}
        </p>
      )}

      {/* Outcomes tags */}
      {item.observation_outcomes && item.observation_outcomes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.observation_outcomes.map((outcome) => (
            <span
              key={outcome.id}
              className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700"
            >
              {outcome.title}
            </span>
          ))}
        </div>
      )}

      {/* Media indicator */}
      {item.observation_media_count != null &&
        item.observation_media_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5Z"
              />
            </svg>
            {item.observation_media_count} attachment
            {item.observation_media_count > 1 ? "s" : ""}
          </div>
        )}
    </div>
  );
}

// ============================================================
// MasteryChangeCard
// ============================================================
function MasteryChangeCard({ item }: { item: PortfolioTimelineItem }) {
  const time = new Date(item.date).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const newStatus = item.mastery_new_status as MasteryStatus;
  const prevStatus = item.mastery_previous_status as MasteryStatus | null;
  const newConfig = MASTERY_STATUS_CONFIG[newStatus];
  const prevConfig = prevStatus ? MASTERY_STATUS_CONFIG[prevStatus] : null;

  // Special styling for "mastered" milestone
  const isMilestone = newStatus === "mastered";

  return (
    <div
      className={`rounded-lg border p-[var(--density-card-padding)] transition-shadow hover:shadow-sm ${
        isMilestone
          ? "border-green-200 bg-green-50"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status icon */}
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              isMilestone ? "bg-green-200" : newConfig.bgColor
            }`}
          >
            {isMilestone ? (
              <svg
                className="h-3.5 w-3.5 text-green-700"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                />
              </svg>
            ) : (
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${newConfig.dotColor}`}
              />
            )}
          </div>

          <div>
            <span
              className={`text-xs font-semibold ${
                isMilestone ? "text-green-800" : "text-foreground"
              }`}
            >
              {isMilestone ? "Mastery Achieved!" : "Progress Update"}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              by {item.mastery_changed_by}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-foreground">
          {item.mastery_node_title}
        </span>
        <span className="text-xs text-muted-foreground">—</span>
        {prevConfig && (
          <>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${prevConfig.bgColor} ${prevConfig.color}`}
            >
              {prevConfig.label}
            </span>
            <svg
              className="h-3 w-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${newConfig.bgColor} ${newConfig.color}`}
        >
          {newConfig.label}
        </span>
      </div>
    </div>
  );
}
