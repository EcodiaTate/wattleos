"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { submitDebrief } from "@/lib/actions/emergency-drills";
import type { DrillEffectivenessRating } from "@/types/domain";

const RATINGS: Array<{
  value: DrillEffectivenessRating;
  label: string;
  token: string;
}> = [
  { value: "poor", label: "Poor", token: "overdue" },
  { value: "fair", label: "Fair", token: "at-risk" },
  { value: "good", label: "Good", token: "compliant" },
  { value: "excellent", label: "Excellent", token: "compliant" },
];

interface DebriefFormProps {
  drillId: string;
}

export function DebriefForm({ drillId }: DebriefFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState<DrillEffectivenessRating | null>(null);
  const [issues, setIssues] = useState("");
  const [corrective, setCorrective] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [debriefNotes, setDebriefNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Please select an effectiveness rating");
      haptics.error();
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await submitDebrief(drillId, {
        effectiveness_rating: rating,
        issues_observed: issues || null,
        corrective_actions: corrective || null,
        follow_up_required: followUpRequired,
        follow_up_notes: followUpRequired ? followUpNotes || null : null,
        debrief_notes: debriefNotes || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Post-Drill Debrief
      </h3>

      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Effectiveness Rating */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Effectiveness Rating
        </label>
        <div className="flex gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                haptics.selection();
                setRating(r.value);
              }}
              className="active-push flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor:
                  rating === r.value
                    ? `var(--drill-${r.token})`
                    : "var(--border)",
                background:
                  rating === r.value
                    ? `var(--drill-${r.token})`
                    : "transparent",
                color:
                  rating === r.value
                    ? `var(--drill-${r.token}-fg)`
                    : "var(--foreground)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Observed */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Issues Observed
        </label>
        <textarea
          value={issues}
          onChange={(e) => setIssues(e.target.value)}
          placeholder="What problems were identified during the drill?"
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Corrective Actions */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Corrective Actions
        </label>
        <textarea
          value={corrective}
          onChange={(e) => setCorrective(e.target.value)}
          placeholder="What actions will be taken to address the issues?"
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Follow-up Required */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setFollowUpRequired(!followUpRequired);
          }}
          className="active-push flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm transition-colors"
          style={{
            background: followUpRequired
              ? "var(--drill-at-risk-bg)"
              : "var(--input)",
            color: followUpRequired
              ? "var(--drill-at-risk)"
              : "var(--foreground)",
          }}
        >
          <span>{followUpRequired ? "✓" : ""}</span>
          Follow-up action required
        </button>

        {followUpRequired && (
          <textarea
            value={followUpNotes}
            onChange={(e) => setFollowUpNotes(e.target.value)}
            placeholder="Describe the follow-up actions needed..."
            rows={2}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        )}
      </div>

      {/* Debrief Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Additional Notes
        </label>
        <textarea
          value={debriefNotes}
          onChange={(e) => setDebriefNotes(e.target.value)}
          placeholder="Any other observations or notes from the debrief..."
          rows={2}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Submitting..." : "Submit Debrief"}
      </button>
    </form>
  );
}
