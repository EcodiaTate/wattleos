"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { upsertRiskAssessment, approveRiskAssessment } from "@/lib/actions/excursions";
import type { ExcursionRiskAssessment, ExcursionHazard } from "@/types/domain";

interface RiskAssessmentFormProps {
  excursionId: string;
  existing?: ExcursionRiskAssessment | null;
  canManage: boolean;
}

const RISK_LEVELS = ["low", "medium", "high"] as const;

const RISK_COLORS: Record<string, { bg: string; fg: string }> = {
  low: { bg: "color-mix(in srgb, var(--success) 15%, transparent)", fg: "var(--success)" },
  medium: { bg: "color-mix(in srgb, var(--warning) 15%, transparent)", fg: "var(--warning)" },
  high: { bg: "color-mix(in srgb, var(--destructive) 15%, transparent)", fg: "var(--destructive)" },
};

const EMPTY_HAZARD: ExcursionHazard = {
  hazard: "",
  likelihood: "low",
  consequence: "low",
  controls: "",
  residual_rating: "low",
};

export function RiskAssessmentForm({
  excursionId,
  existing,
  canManage,
}: RiskAssessmentFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [hazards, setHazards] = useState<ExcursionHazard[]>(
    existing?.hazards?.length ? existing.hazards : [{ ...EMPTY_HAZARD }],
  );
  const [overallRating, setOverallRating] = useState<"low" | "medium" | "high">(
    existing?.overall_risk_rating ?? "low",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  function updateHazard(index: number, field: keyof ExcursionHazard, value: string) {
    setHazards((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    );
  }

  function addHazard() {
    haptics.light();
    setHazards((prev) => [...prev, { ...EMPTY_HAZARD }]);
  }

  function removeHazard(index: number) {
    haptics.light();
    setHazards((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await upsertRiskAssessment({
        excursion_id: excursionId,
        hazards,
        overall_risk_rating: overallRating,
        notes: notes || undefined,
      });

      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        haptics.error();
        return;
      }

      haptics.success();
      router.refresh();
    });
  }

  function handleApprove() {
    if (!existing?.id) return;
    startTransition(async () => {
      const result = await approveRiskAssessment(existing.id);
      if (result.error) {
        setError(result.error.message ?? "Failed to approve");
        haptics.error();
        return;
      }
      haptics.heavy();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* Hazards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Identified Hazards
          </h3>
          {canManage && (
            <button
              type="button"
              onClick={addHazard}
              className="active-push text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              + Add Hazard
            </button>
          )}
        </div>

        {hazards.map((hazard, idx) => (
          <div
            key={idx}
            className="rounded-[var(--radius-md)] border border-border p-4 space-y-3"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Hazard {idx + 1}
              </span>
              {canManage && hazards.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHazard(idx)}
                  className="text-xs"
                  style={{ color: "var(--destructive)" }}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Hazard Description *
              </label>
              <input
                type="text"
                value={hazard.hazard}
                onChange={(e) => updateHazard(idx, "hazard", e.target.value)}
                placeholder="e.g. Traffic at road crossing"
                required
                disabled={!canManage}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                style={{ background: "var(--input)", color: "var(--foreground)" }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Likelihood
                </label>
                <select
                  value={hazard.likelihood}
                  onChange={(e) => updateHazard(idx, "likelihood", e.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[var(--radius-md)] border border-border px-2 py-2 text-xs"
                  style={{ background: "var(--input)", color: "var(--foreground)" }}
                >
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Consequence
                </label>
                <select
                  value={hazard.consequence}
                  onChange={(e) => updateHazard(idx, "consequence", e.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[var(--radius-md)] border border-border px-2 py-2 text-xs"
                  style={{ background: "var(--input)", color: "var(--foreground)" }}
                >
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Residual
                </label>
                <select
                  value={hazard.residual_rating}
                  onChange={(e) => updateHazard(idx, "residual_rating", e.target.value)}
                  disabled={!canManage}
                  className="w-full rounded-[var(--radius-md)] border border-border px-2 py-2 text-xs"
                  style={{ background: "var(--input)", color: "var(--foreground)" }}
                >
                  {RISK_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                Control Measures *
              </label>
              <textarea
                value={hazard.controls}
                onChange={(e) => updateHazard(idx, "controls", e.target.value)}
                placeholder="How will this hazard be managed?"
                required
                disabled={!canManage}
                rows={2}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                style={{ background: "var(--input)", color: "var(--foreground)" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Overall risk rating */}
      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Overall Risk Rating *
        </label>
        <div className="flex gap-2">
          {RISK_LEVELS.map((level) => {
            const selected = overallRating === level;
            const colors = RISK_COLORS[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setOverallRating(level);
                }}
                disabled={!canManage}
                className="active-push rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: selected ? colors.bg : "var(--muted)",
                  color: selected ? colors.fg : "var(--muted-foreground)",
                  borderWidth: "1px",
                  borderColor: selected ? colors.fg : "var(--border)",
                }}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Additional Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional risk management notes..."
          disabled={!canManage}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Approval status */}
      {existing?.approved_at && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--success)",
            background: "color-mix(in srgb, var(--success) 8%, transparent)",
            color: "var(--success)",
          }}
        >
          Approved on{" "}
          {new Date(existing.approved_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving..." : existing ? "Update Assessment" : "Save Assessment"}
          </button>

          {existing && !existing.approved_at && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--success)",
                color: "#fff",
              }}
            >
              {isPending ? "Approving..." : "Approve & Send for Consents"}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
