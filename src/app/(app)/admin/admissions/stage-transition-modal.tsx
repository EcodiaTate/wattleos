// src/app/(app)/admin/admissions/stage-transition-modal.tsx
//
// ============================================================
// WattleOS V2 - Stage Transition Modal (Module 13)
// ============================================================
// 'use client' - modal for moving a waitlist entry between
// pipeline stages. Shows valid target stages, lets the admin
// add notes, and calls the transitionStage() server action.
//
// WHY a modal: Stage transitions are consequential actions
// (logged in audit trail, may auto-trigger emails). A
// confirmation step with optional notes prevents accidental
// moves and ensures a paper trail for every pipeline change.
//
// WHY no makeOffer() here: The "offered" stage requires extra
// fields (program, start date, expiry). That gets a dedicated
// form in the entry detail page (Batch 2). The modal handles
// simple transitions only. If the target is "offered", we
// redirect to the detail page instead.
// ============================================================

"use client";

import type {
  WaitlistEntry,
  WaitlistStage,
} from "@/lib/actions/admissions/waitlist-pipeline";
import { transitionStage } from "@/lib/actions/admissions/waitlist-pipeline";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Stage labels for display ─────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  waitlisted: "Waitlisted",
  tour_scheduled: "Tour Scheduled",
  tour_completed: "Tour Completed",
  offered: "Offered",
  accepted: "Accepted",
  enrolled: "Enrolled",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

// Stages that need special handling (not simple transitions)
const SPECIAL_STAGES: WaitlistStage[] = ["offered"];

interface StageConfig {
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
}

interface StageTransitionModalProps {
  entry: WaitlistEntry;
  allowedTargets: WaitlistStage[];
  stageConfig: Record<string, StageConfig>;
  onClose: () => void;
  onTransitionComplete: (
    entryId: string,
    fromStage: WaitlistStage,
    toStage: WaitlistStage,
  ) => void;
}

export function StageTransitionModal({
  entry,
  allowedTargets,
  stageConfig,
  onClose,
  onTransitionComplete,
}: StageTransitionModalProps) {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<WaitlistStage | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const childName = `${entry.child_first_name} ${entry.child_last_name}`;

  // Filter out special stages that need their own forms
  const simpleTargets = allowedTargets.filter(
    (s) => !SPECIAL_STAGES.includes(s),
  );
  const specialTargets = allowedTargets.filter((s) =>
    SPECIAL_STAGES.includes(s),
  );

  async function handleSubmit() {
    if (!selectedStage) return;

    // If the target is a special stage, redirect to detail page
    if (SPECIAL_STAGES.includes(selectedStage)) {
      router.push(`/admin/admissions/${entry.id}?action=${selectedStage}`);
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await transitionStage({
      entry_id: entry.id,
      to_stage: selectedStage,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onTransitionComplete(entry.id, entry.stage, selectedStage);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Move Pipeline Entry
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Moving{" "}
            <span className="font-medium text-gray-700">{childName}</span> from{" "}
            <span className="font-medium text-gray-700">
              {STAGE_LABELS[entry.stage] ?? entry.stage}
            </span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Target stage selection */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Move to:</label>

          {/* Simple transitions */}
          <div className="grid grid-cols-2 gap-2">
            {simpleTargets.map((stage) => {
              const config = stageConfig[stage];
              const isSelected = selectedStage === stage;
              const isTerminal = ["enrolled", "declined", "withdrawn"].includes(
                stage,
              );

              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500"
                      : isTerminal
                        ? "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {STAGE_LABELS[stage] ?? stage}
                  {isTerminal && (
                    <span className="block text-[10px] font-normal text-gray-400">
                      Terminal
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Special transitions (e.g., Make Offer) */}
          {specialTargets.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {specialTargets.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => {
                    router.push(
                      `/admin/admissions/${entry.id}?action=${stage}`,
                    );
                    onClose();
                  }}
                  className="w-full rounded-lg border-2 border-dashed border-orange-200 bg-orange-50 px-3 py-2.5 text-left text-sm font-medium text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-100"
                >
                  {stage === "offered"
                    ? "Make Offer →"
                    : `${STAGE_LABELS[stage] ?? stage} →`}
                  <span className="block text-[10px] font-normal text-orange-500">
                    Opens detail form (requires additional fields)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {selectedStage && !SPECIAL_STAGES.includes(selectedStage) && (
          <div className="mb-4">
            <label
              htmlFor="transition-notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Notes{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="transition-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for this transition…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {selectedStage && !SPECIAL_STAGES.includes(selectedStage) && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting
                ? "Moving…"
                : `Move to ${STAGE_LABELS[selectedStage] ?? selectedStage}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
