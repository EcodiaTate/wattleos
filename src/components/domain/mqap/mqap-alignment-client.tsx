"use client";

import { useState } from "react";
import type { AlignmentItem } from "@/lib/actions/mqap";
import type { MqapRating } from "@/types/domain";
import { MQAP_QUALITY_AREAS } from "@/lib/constants/mqap-criteria";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface MqapAlignmentClientProps {
  items: AlignmentItem[];
}

export function MqapAlignmentClient({ items }: MqapAlignmentClientProps) {
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const haptics = useHaptics();

  const groupedByQA = MQAP_QUALITY_AREAS.map((qa) => ({
    qa,
    items: items.filter((i) => i.mqap_criterion.quality_area === qa.id),
  }));

  return (
    <div className="space-y-4">
      <p
        className="text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        This view shows how your MQ:AP assessments align with NQS QIP
        assessments. Where one piece of evidence satisfies both frameworks, the
        alignment is shown.
      </p>

      {groupedByQA.map(({ qa, items: qaItems }) => {
        const isExpanded = expandedQA === qa.id;

        return (
          <div
            key={qa.id}
            className="overflow-hidden rounded-xl border border-border"
            style={{ backgroundColor: "var(--card)" }}
          >
            <button
              type="button"
              className="active-push flex w-full items-center justify-between p-4 text-left"
              onClick={() => {
                haptics.impact("light");
                setExpandedQA(isExpanded ? null : qa.id);
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                QA{qa.id}: {qa.name}
              </span>
              <span
                className="text-lg"
                style={{ color: "var(--muted-foreground)" }}
              >
                {isExpanded ? "▾" : "▸"}
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-border">
                {/* Header row */}
                <div
                  className="grid grid-cols-[1fr_120px_120px] gap-2 border-b border-border px-4 py-2"
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Criterion
                  </span>
                  <span
                    className="text-center text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    MQ:AP
                  </span>
                  <span
                    className="text-center text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    NQS
                  </span>
                </div>

                {qaItems.map((item) => (
                  <div
                    key={item.mqap_criterion.id}
                    className="grid grid-cols-[1fr_120px_120px] items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.mqap_criterion.code}
                        {item.nqs_element_id && (
                          <span className="ml-1 font-normal">
                            → {item.nqs_element_id}
                          </span>
                        )}
                      </p>
                      <p
                        className="mt-0.5 text-xs leading-relaxed"
                        style={{ color: "var(--foreground)" }}
                      >
                        {item.mqap_criterion.criterion_text.substring(0, 100)}
                        {item.mqap_criterion.criterion_text.length > 100
                          ? "..."
                          : ""}
                      </p>
                    </div>

                    <div className="text-center">
                      <RatingPill
                        rating={
                          (item.mqap_assessment?.rating as MqapRating) ?? null
                        }
                      />
                    </div>

                    <div className="text-center">
                      {item.nqs_element_id ? (
                        <RatingPill
                          rating={
                            (item.nqs_assessment?.rating as MqapRating) ?? null
                          }
                        />
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          -
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RatingPill({ rating }: { rating: MqapRating | null }) {
  if (!rating) {
    return (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-xs"
        style={{
          backgroundColor: "var(--qip-unassessed-bg)",
          color: "var(--qip-unassessed-fg)",
        }}
      >
        -
      </span>
    );
  }

  const map: Record<MqapRating, { label: string; bg: string; fg: string }> = {
    working_towards: {
      label: "WT",
      bg: "var(--qip-working-towards-bg)",
      fg: "var(--qip-working-towards-fg)",
    },
    meeting: {
      label: "M",
      bg: "var(--qip-meeting-bg)",
      fg: "var(--qip-meeting-fg)",
    },
    exceeding: {
      label: "E",
      bg: "var(--qip-exceeding-bg)",
      fg: "var(--qip-exceeding-fg)",
    },
  };

  const { label, bg, fg } = map[rating];

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}
