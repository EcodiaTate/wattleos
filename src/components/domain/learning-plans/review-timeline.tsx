"use client";

import type { IlpReview } from "@/types/domain";
import {
  REVIEW_TYPE_CONFIG,
  PROGRESS_RATING_CONFIG,
} from "@/lib/constants/ilp";
import { ProgressBadge } from "./progress-badge";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ReviewTimelineProps {
  reviews: IlpReview[];
}

export function ReviewTimeline({ reviews }: ReviewTimelineProps) {
  if (reviews.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12"
          style={{ color: "var(--empty-state-icon)" }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          No reviews recorded yet.
        </p>
      </div>
    );
  }

  // Sort most recent first
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime(),
  );

  return (
    <div className="space-y-0">
      {sorted.map((review, idx) => {
        const typeCfg = REVIEW_TYPE_CONFIG[review.review_type];
        const isLast = idx === sorted.length - 1;

        return (
          <div key={review.id} className="relative flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {typeCfg.emoji}
              </div>
              {!isLast && (
                <div
                  className="w-0.5 flex-1"
                  style={{ background: "var(--border)" }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`min-w-0 flex-1 pb-6 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {typeCfg.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {formatDate(review.review_date)}
                  </p>
                </div>
                <ProgressBadge rating={review.overall_progress} />
              </div>

              {/* Attendees */}
              {review.attendees.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {review.attendees.map((attendee, aIdx) => (
                    <span
                      key={aIdx}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {attendee}
                    </span>
                  ))}
                  {review.parent_attended && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--ilp-active)",
                        color: "var(--ilp-active-fg)",
                      }}
                    >
                      Parent attended
                    </span>
                  )}
                </div>
              )}

              {/* Summary notes */}
              {review.summary_notes && (
                <div className="mt-2">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Summary
                  </p>
                  <p
                    className="mt-0.5 whitespace-pre-wrap text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {review.summary_notes}
                  </p>
                </div>
              )}

              {/* Goal updates */}
              {review.goal_updates.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Goal Updates
                  </p>
                  {review.goal_updates.map((gu, guIdx) => {
                    const progressCfg = PROGRESS_RATING_CONFIG[gu.progress_rating];
                    return (
                      <div
                        key={guIdx}
                        className="rounded-[var(--radius-md)] border border-border p-2"
                        style={{ background: "var(--background)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              background: progressCfg.cssVar,
                              color: progressCfg.cssVarFg,
                            }}
                          >
                            {progressCfg.label}
                          </span>
                        </div>
                        {gu.notes && (
                          <p
                            className="mt-1 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {gu.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Family feedback */}
              {review.family_feedback && (
                <div className="mt-2">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Family Feedback
                  </p>
                  <p
                    className="mt-0.5 whitespace-pre-wrap text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {review.family_feedback}
                  </p>
                </div>
              )}

              {/* Next steps */}
              {review.next_steps && (
                <div className="mt-2">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Next Steps
                  </p>
                  <p
                    className="mt-0.5 whitespace-pre-wrap text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {review.next_steps}
                  </p>
                </div>
              )}

              {/* New review due date */}
              {review.new_review_due_date && (
                <div className="mt-2 text-xs">
                  <span style={{ color: "var(--muted-foreground)" }}>
                    Next review scheduled:{" "}
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatDate(review.new_review_due_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
