"use client";

import { useTransition } from "react";
import type { QipEvidence } from "@/types/domain";
import { removeEvidence } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface EvidenceItemProps {
  evidence: QipEvidence;
  canManage: boolean;
  onRemoved: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  incident: "Incident",
  policy: "Policy",
  photo: "Photo",
  document: "Document",
  other: "Other",
};

export function EvidenceItem({
  evidence,
  canManage,
  onRemoved,
}: EvidenceItemProps) {
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleRemove() {
    if (!confirm("Remove this evidence link?")) return;
    haptics.impact("medium");
    startTransition(async () => {
      const result = await removeEvidence(evidence.id);
      if (result.error) {
        haptics.error();
      } else {
        onRemoved();
      }
    });
  }

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border p-3"
      style={{
        backgroundColor: "var(--card)",
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {/* Type badge */}
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
        style={{
          backgroundColor: "var(--muted)",
          color: "var(--muted-foreground)",
        }}
      >
        {TYPE_LABELS[evidence.evidence_type] ?? evidence.evidence_type}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {evidence.title}
        </p>
        {evidence.notes && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {evidence.notes}
          </p>
        )}
        <p
          className="mt-1 text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          Added{" "}
          {new Date(evidence.created_at).toLocaleDateString("en-AU")}
        </p>
      </div>

      {/* Remove button */}
      {canManage && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          className="active-push shrink-0 rounded px-2 py-1 text-xs"
          style={{ color: "var(--destructive)" }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
