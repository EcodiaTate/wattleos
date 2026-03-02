"use client";

import { useState, useCallback } from "react";
import type {
  QipElementAssessment,
  QipEvidence,
  QipGoal,
} from "@/types/domain";
import { NQS_QUALITY_AREAS } from "@/lib/constants/nqs-elements";
import { RatingBadge } from "./rating-selector";
import { ElementAssessmentEditor } from "./element-assessment-editor";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface NqsAssessmentMatrixClientProps {
  initialAssessments: QipElementAssessment[];
  goals: QipGoal[];
  evidence: QipEvidence[];
  canManage: boolean;
}

export function NqsAssessmentMatrixClient({
  initialAssessments,
  goals,
  evidence,
  canManage,
}: NqsAssessmentMatrixClientProps) {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [openQA, setOpenQA] = useState<number | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const haptics = useHaptics();

  // Build lookup maps
  const assessmentMap = new Map(assessments.map((a) => [a.nqs_element_id, a]));

  const goalCountMap = new Map<string, number>();
  for (const g of goals) {
    goalCountMap.set(
      g.nqs_element_id,
      (goalCountMap.get(g.nqs_element_id) ?? 0) + 1,
    );
  }

  const evidenceCountMap = new Map<string, number>();
  for (const e of evidence) {
    if (e.nqs_element_id) {
      evidenceCountMap.set(
        e.nqs_element_id,
        (evidenceCountMap.get(e.nqs_element_id) ?? 0) + 1,
      );
    }
  }

  const handleToggleQA = useCallback(
    (qaId: number) => {
      haptics.impact("light");
      setOpenQA((prev) => (prev === qaId ? null : qaId));
      setEditingElement(null);
    },
    [haptics],
  );

  const handleSaved = useCallback((updated: QipElementAssessment) => {
    setAssessments((prev) => {
      const existing = prev.findIndex(
        (a) => a.nqs_element_id === updated.nqs_element_id,
      );
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setEditingElement(null);
  }, []);

  return (
    <div className="space-y-3">
      {NQS_QUALITY_AREAS.map((qa) => {
        const isOpen = openQA === qa.id;
        const qaElements = qa.standards.flatMap((s) => s.elements);
        const assessedCount = qaElements.filter((el) =>
          assessmentMap.has(el.id),
        ).length;

        return (
          <div
            key={qa.id}
            className="overflow-hidden rounded-xl border border-border"
            style={{ backgroundColor: "var(--card)" }}
          >
            {/* QA Header - accordion trigger */}
            <button
              type="button"
              className="active-push flex w-full items-center gap-3 p-4 text-left"
              onClick={() => handleToggleQA(qa.id)}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {qa.id}
              </span>
              <div className="flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  QA{qa.id}: {qa.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {/* Mini progress bar */}
                  <div
                    className="h-1.5 w-20 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--muted)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${qaElements.length > 0 ? (assessedCount / qaElements.length) * 100 : 0}%`,
                        backgroundColor: "var(--qip-meeting)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {assessedCount}/{qaElements.length}
                  </span>
                </div>
              </div>
              <span
                className="text-lg transition-transform"
                style={{
                  color: "var(--muted-foreground)",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                ›
              </span>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-border">
                {qa.standards.map((standard) => (
                  <div key={standard.id}>
                    {/* Standard subheader */}
                    <div
                      className="px-4 py-2"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Standard {standard.id}: {standard.name}
                      </p>
                    </div>

                    {/* Elements */}
                    {standard.elements.map((element) => {
                      const assessment = assessmentMap.get(element.id);
                      const goalCount = goalCountMap.get(element.id) ?? 0;
                      const evidenceCount =
                        evidenceCountMap.get(element.id) ?? 0;
                      const isEditing = editingElement === element.id;

                      return (
                        <div
                          key={element.id}
                          className="border-t border-border"
                        >
                          {/* Element row */}
                          <div
                            className={`flex items-center gap-3 px-4 py-3 ${canManage ? "cursor-pointer active-push" : ""}`}
                            onClick={
                              canManage
                                ? () => {
                                    haptics.impact("light");
                                    setEditingElement(
                                      isEditing ? null : element.id,
                                    );
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="shrink-0 text-xs font-mono tabular-nums"
                              style={{
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {element.id}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-medium"
                                style={{ color: "var(--foreground)" }}
                              >
                                {element.name}
                              </p>
                              {assessment?.strengths && (
                                <p
                                  className="mt-0.5 line-clamp-1 text-xs"
                                  style={{
                                    color: "var(--muted-foreground)",
                                  }}
                                >
                                  {assessment.strengths}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {goalCount > 0 && (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: "var(--muted)",
                                    color: "var(--muted-foreground)",
                                  }}
                                >
                                  {goalCount}G
                                </span>
                              )}
                              {evidenceCount > 0 && (
                                <span
                                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: "var(--muted)",
                                    color: "var(--muted-foreground)",
                                  }}
                                >
                                  {evidenceCount}E
                                </span>
                              )}
                              <RatingBadge
                                rating={assessment?.rating ?? null}
                                compact
                              />
                            </div>
                          </div>

                          {/* Inline editor */}
                          {isEditing && canManage && (
                            <div className="px-4 pb-4">
                              <ElementAssessmentEditor
                                element={element}
                                assessment={assessment ?? null}
                                onSaved={handleSaved}
                                onCancel={() => setEditingElement(null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
