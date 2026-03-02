"use client";

import { useState, useTransition } from "react";
import type { QipElementAssessment, QipRating } from "@/types/domain";
import type { NqsElement } from "@/lib/constants/nqs-elements";
import { RatingSelector } from "./rating-selector";
import { upsertAssessment } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ElementAssessmentEditorProps {
  element: NqsElement;
  assessment: QipElementAssessment | null;
  onSaved: (assessment: QipElementAssessment) => void;
  onCancel: () => void;
}

export function ElementAssessmentEditor({
  element,
  assessment,
  onSaved,
  onCancel,
}: ElementAssessmentEditorProps) {
  const [rating, setRating] = useState<QipRating | null>(
    assessment?.rating ?? null,
  );
  const [strengths, setStrengths] = useState(assessment?.strengths ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await upsertAssessment({
        nqs_element_id: element.id,
        rating,
        strengths: strengths.trim() || null,
      });

      if (result.error) {
        haptics.error();
        setError(result.error.message);
      } else if (result.data) {
        haptics.success();
        onSaved(result.data);
      }
    });
  }

  return (
    <div
      className="space-y-4 rounded-lg border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      {/* Element info */}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Element {element.id}
        </p>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {element.name}
        </p>
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {element.description}
        </p>
      </div>

      {/* Rating */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Rating
        </label>
        <RatingSelector
          value={rating}
          onChange={setRating}
          disabled={isPending}
        />
      </div>

      {/* Strengths */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Strengths & Evidence Notes
        </label>
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          rows={4}
          disabled={isPending}
          placeholder="Describe what the service does well against this element..."
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--muted)",
            color: "var(--foreground)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Saving..." : "Save Assessment"}
        </button>
      </div>
    </div>
  );
}
