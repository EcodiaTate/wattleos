"use client";

// src/components/domain/work-cycle/interruption-form.tsx
//
// Inline form to add an interruption to an existing session.
// Used within the session detail page.

import { useState } from "react";
import { addInterruption } from "@/lib/actions/work-cycle";
import {
  INTERRUPTION_SOURCE_CONFIG,
  INTERRUPTION_SEVERITY_CONFIG,
} from "@/lib/constants/work-cycle";
import type { WorkCycleInterruptionSource, WorkCycleInterruptionSeverity } from "@/types/domain";

interface InterruptionFormProps {
  sessionId: string;
  onAdded: () => void;
  onCancel: () => void;
}

const SOURCES = Object.entries(INTERRUPTION_SOURCE_CONFIG) as [
  WorkCycleInterruptionSource,
  (typeof INTERRUPTION_SOURCE_CONFIG)[WorkCycleInterruptionSource],
][];

const SEVERITIES = Object.entries(INTERRUPTION_SEVERITY_CONFIG) as [
  WorkCycleInterruptionSeverity,
  (typeof INTERRUPTION_SEVERITY_CONFIG)[WorkCycleInterruptionSeverity],
][];

export function InterruptionForm({ sessionId, onAdded, onCancel }: InterruptionFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<WorkCycleInterruptionSource>("pa_announcement");
  const [severity, setSeverity] = useState<WorkCycleInterruptionSeverity>("minor");
  const [preventable, setPreventable] = useState(
    INTERRUPTION_SOURCE_CONFIG["pa_announcement"].defaultPreventable,
  );

  function handleSourceChange(s: WorkCycleInterruptionSource) {
    setSource(s);
    setPreventable(INTERRUPTION_SOURCE_CONFIG[s].defaultPreventable);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const result = await addInterruption({
      session_id: sessionId,
      occurred_at: data.get("occurred_at") as string,
      duration_minutes: parseInt(data.get("duration_minutes") as string, 10),
      source,
      severity,
      description: (data.get("description") as string)?.trim() || null,
      preventable,
    });

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-foreground">Log Interruption</h3>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Time + Duration */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Occurred at <span className="text-destructive">*</span>
          </label>
          <input
            name="occurred_at"
            type="time"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Duration (mins) <span className="text-destructive">*</span>
          </label>
          <input
            name="duration_minutes"
            type="number"
            required
            min={0}
            max={180}
            defaultValue={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Source */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Source <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSourceChange(key)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={
                source === key
                  ? { borderColor: cfg.fgVar, background: cfg.bgVar, color: cfg.fgVar }
                  : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
              }
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Severity <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          {SEVERITIES.map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeverity(key)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors flex-1"
              style={
                severity === key
                  ? { borderColor: cfg.fgVar, background: cfg.bgVar, color: cfg.fgVar }
                  : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
              }
              title={cfg.description}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preventable */}
      <div className="flex items-center gap-2.5">
        <input
          id="preventable"
          type="checkbox"
          checked={preventable}
          onChange={(e) => setPreventable(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="preventable" className="text-xs font-medium text-foreground cursor-pointer">
          This interruption was preventable
        </label>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Description{" "}
          <span className="font-normal">(optional)</span>
        </label>
        <textarea
          name="description"
          rows={2}
          placeholder="Brief note about what happened…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-background hover:bg-primary disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Add Interruption"}
        </button>
      </div>
    </form>
  );
}
