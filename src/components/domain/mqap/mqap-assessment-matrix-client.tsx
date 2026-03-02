"use client";

import { useState, useTransition } from "react";
import type { MqapCriterionWithAssessment, MqapRating } from "@/types/domain";
import { upsertAssessment } from "@/lib/actions/mqap";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { MQAP_QUALITY_AREAS } from "@/lib/constants/mqap-criteria";
import { MqapRatingSelector } from "./mqap-rating-selector";

interface MqapAssessmentMatrixClientProps {
  criteriaWithAssessments: MqapCriterionWithAssessment[];
  canManage: boolean;
}

export function MqapAssessmentMatrixClient({
  criteriaWithAssessments,
  canManage,
}: MqapAssessmentMatrixClientProps) {
  const [items, setItems] = useState(criteriaWithAssessments);
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleRatingChange(criteriaId: string, rating: MqapRating | null) {
    haptics.impact("medium");

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.criterion.id === criteriaId
          ? {
              ...item,
              assessment: {
                ...(item.assessment ?? {
                  id: "",
                  tenant_id: "",
                  criteria_id: criteriaId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }),
                rating,
                assessed_at: new Date().toISOString(),
                assessed_by: null,
                strengths: item.assessment?.strengths ?? null,
              },
            }
          : item,
      ),
    );

    startTransition(async () => {
      const result = await upsertAssessment({
        criteria_id: criteriaId,
        rating,
        strengths: null,
      });
      if (result.error) {
        // Revert on error
        setItems(criteriaWithAssessments);
      }
    });
  }

  function handleStrengthsChange(criteriaId: string, strengths: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.criterion.id === criteriaId && item.assessment
          ? {
              ...item,
              assessment: { ...item.assessment, strengths },
            }
          : item,
      ),
    );
  }

  function handleStrengthsSave(criteriaId: string, strengths: string) {
    const item = items.find((i) => i.criterion.id === criteriaId);
    const rating = item?.assessment?.rating ?? null;

    startTransition(async () => {
      await upsertAssessment({
        criteria_id: criteriaId,
        rating,
        strengths: strengths || null,
      });
    });
  }

  // Group by QA
  const groupedByQA = MQAP_QUALITY_AREAS.map((qa) => ({
    qa,
    items: items.filter((i) => i.criterion.quality_area === qa.id),
  }));

  return (
    <div className="space-y-4">
      {groupedByQA.map(({ qa, items: qaItems }) => {
        const assessed = qaItems.filter((i) => i.assessment?.rating).length;
        const total = qaItems.length;
        const isExpanded = expandedQA === qa.id;

        return (
          <div
            key={qa.id}
            className="overflow-hidden rounded-xl border border-border"
            style={{ backgroundColor: "var(--card)" }}
          >
            {/* QA header - expandable */}
            <button
              type="button"
              className="active-push flex w-full items-center justify-between p-4 text-left"
              onClick={() => {
                haptics.impact("light");
                setExpandedQA(isExpanded ? null : qa.id);
              }}
            >
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  QA{qa.id}
                </span>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {qa.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-sm tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {assessed}/{total}
                </span>
                <span
                  className="text-lg"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {isExpanded ? "▾" : "▸"}
                </span>
              </div>
            </button>

            {/* Criteria list */}
            {isExpanded && (
              <div className="border-t border-border">
                {qaItems.map((item) => (
                  <div
                    key={item.criterion.id}
                    className="border-b border-border p-4 last:border-b-0"
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p
                          className="text-xs font-bold"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {item.criterion.code}
                          {item.criterion.nqs_element_alignment && (
                            <span className="ml-2 font-normal">
                              → NQS {item.criterion.nqs_element_alignment}
                            </span>
                          )}
                        </p>
                        <p
                          className="mt-1 text-sm leading-relaxed"
                          style={{ color: "var(--foreground)" }}
                        >
                          {item.criterion.criterion_text}
                        </p>
                        {item.criterion.guidance && (
                          <p
                            className="mt-1 text-xs italic"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {item.criterion.guidance}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rating + NQS alignment */}
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {canManage ? (
                        <MqapRatingSelector
                          value={item.assessment?.rating ?? null}
                          onChange={(r) =>
                            handleRatingChange(item.criterion.id, r)
                          }
                          disabled={isPending}
                        />
                      ) : (
                        <RatingBadge rating={item.assessment?.rating ?? null} />
                      )}

                      {item.nqs_assessment && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          NQS:{" "}
                          <RatingBadge
                            rating={item.nqs_assessment.rating as MqapRating}
                          />
                        </span>
                      )}
                    </div>

                    {/* Strengths text */}
                    {canManage && (
                      <textarea
                        className="mt-3 w-full resize-none rounded-lg border border-border p-2 text-sm"
                        style={{
                          backgroundColor: "var(--input)",
                          color: "var(--foreground)",
                        }}
                        placeholder="Strengths and evidence..."
                        rows={2}
                        value={item.assessment?.strengths ?? ""}
                        onChange={(e) =>
                          handleStrengthsChange(
                            item.criterion.id,
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          handleStrengthsSave(item.criterion.id, e.target.value)
                        }
                      />
                    )}

                    {/* Goal count */}
                    {item.goals.length > 0 && (
                      <p
                        className="mt-2 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.goals.length} improvement goal
                        {item.goals.length !== 1 ? "s" : ""}
                      </p>
                    )}
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

function RatingBadge({ rating }: { rating: MqapRating | null }) {
  if (!rating) {
    return (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: "var(--qip-unassessed-bg)",
          color: "var(--qip-unassessed-fg)",
        }}
      >
        Unassessed
      </span>
    );
  }

  const labels: Record<MqapRating, string> = {
    working_towards: "Working Towards",
    meeting: "Meeting",
    exceeding: "Exceeding",
  };

  const colorMap: Record<MqapRating, { bg: string; fg: string }> = {
    working_towards: {
      bg: "var(--qip-working-towards-bg)",
      fg: "var(--qip-working-towards-fg)",
    },
    meeting: {
      bg: "var(--qip-meeting-bg)",
      fg: "var(--qip-meeting-fg)",
    },
    exceeding: {
      bg: "var(--qip-exceeding-bg)",
      fg: "var(--qip-exceeding-fg)",
    },
  };

  const colors = colorMap[rating];

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {labels[rating]}
    </span>
  );
}
