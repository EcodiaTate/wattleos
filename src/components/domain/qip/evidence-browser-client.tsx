"use client";

import { useState, useCallback } from "react";
import type { QipEvidence } from "@/types/domain";
import {
  NQS_QUALITY_AREAS,
  NQS_QA_EVIDENCE_HINTS,
} from "@/lib/constants/nqs-elements";
import { getEvidence } from "@/lib/actions/qip";
import { EvidenceItem } from "./evidence-item";
import { EvidenceLinker } from "./evidence-linker";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface EvidenceBrowserClientProps {
  initialEvidence: QipEvidence[];
  canManage: boolean;
}

export function EvidenceBrowserClient({
  initialEvidence,
  canManage,
}: EvidenceBrowserClientProps) {
  const [allEvidence, setAllEvidence] = useState(initialEvidence);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showLinker, setShowLinker] = useState(false);
  const haptics = useHaptics();

  const refresh = useCallback(async () => {
    const result = await getEvidence({});
    if (result.data) setAllEvidence(result.data);
  }, []);

  // Count evidence per element
  const evidenceByElement = new Map<string, QipEvidence[]>();
  for (const e of allEvidence) {
    if (e.nqs_element_id) {
      const existing = evidenceByElement.get(e.nqs_element_id) ?? [];
      existing.push(e);
      evidenceByElement.set(e.nqs_element_id, existing);
    }
  }

  const selectedEvidence = selectedElement
    ? evidenceByElement.get(selectedElement) ?? []
    : allEvidence;

  // Get suggested type for the selected element's QA
  const suggestedType = selectedElement
    ? (() => {
        const qaNum = parseInt(selectedElement.split(".")[0], 10);
        return NQS_QA_EVIDENCE_HINTS[qaNum]?.primaryTypes[0];
      })()
    : undefined;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Left panel: element tree */}
      <div className="w-full space-y-1 lg:w-72 lg:shrink-0">
        {/* All evidence option */}
        <button
          type="button"
          className="active-push w-full rounded-lg px-3 py-2 text-left text-sm"
          style={{
            backgroundColor:
              selectedElement === null ? "var(--primary)" : "var(--card)",
            color:
              selectedElement === null
                ? "var(--primary-foreground)"
                : "var(--foreground)",
          }}
          onClick={() => {
            haptics.selection();
            setSelectedElement(null);
            setShowLinker(false);
          }}
        >
          All Evidence ({allEvidence.length})
        </button>

        {/* Per-QA accordion */}
        {NQS_QUALITY_AREAS.map((qa) => (
          <div key={qa.id} className="space-y-0.5">
            <p
              className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              QA{qa.id}
            </p>
            {qa.standards.flatMap((s) =>
              s.elements.map((el) => {
                const count = evidenceByElement.get(el.id)?.length ?? 0;
                const isSelected = selectedElement === el.id;
                return (
                  <button
                    key={el.id}
                    type="button"
                    className="active-push flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--primary)"
                        : "transparent",
                      color: isSelected
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    }}
                    onClick={() => {
                      haptics.selection();
                      setSelectedElement(el.id);
                      setShowLinker(false);
                    }}
                  >
                    <span className="truncate">
                      {el.id} {el.name}
                    </span>
                    {count > 0 && (
                      <span
                        className="ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--primary-foreground)"
                            : "var(--muted)",
                          color: isSelected
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </div>
        ))}
      </div>

      {/* Right panel: evidence list */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {selectedElement
              ? `Evidence for ${selectedElement}`
              : "All Evidence"}
          </h2>
          {canManage && selectedElement && (
            <button
              type="button"
              onClick={() => {
                haptics.impact("light");
                setShowLinker(!showLinker);
              }}
              className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Link Evidence
            </button>
          )}
        </div>

        {/* Evidence linker */}
        {showLinker && selectedElement && canManage && (
          <EvidenceLinker
            nqsElementId={selectedElement}
            suggestedType={suggestedType}
            onAttached={() => {
              setShowLinker(false);
              refresh();
            }}
            onCancel={() => setShowLinker(false)}
          />
        )}

        {/* Evidence list */}
        {selectedEvidence.length === 0 ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            style={{ backgroundColor: "var(--card)" }}
          >
            <p
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No evidence linked
              {selectedElement ? ` to ${selectedElement}` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvidence.map((e) => (
              <EvidenceItem
                key={e.id}
                evidence={e}
                canManage={canManage}
                onRemoved={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
