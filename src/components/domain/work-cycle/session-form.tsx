"use client";

// src/components/domain/work-cycle/session-form.tsx
//
// Form to create or edit a work cycle session.
// Uses uncontrolled inputs where possible to keep the bundle small.

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createWorkCycleSession,
  updateWorkCycleSession,
} from "@/lib/actions/work-cycle";
import { QUALITY_RATING_LABELS } from "@/lib/constants/work-cycle";
import type { WorkCycleSession } from "@/types/domain";

interface SessionFormProps {
  classes: { id: string; name: string }[];
  existing?: WorkCycleSession;
  defaultClassId?: string | null;
}

export function SessionForm({
  classes,
  existing,
  defaultClassId,
}: SessionFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityRating, setQualityRating] = useState<number | null>(
    existing?.quality_rating ?? null,
  );

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      class_id: data.get("class_id") as string,
      session_date: data.get("session_date") as string,
      planned_start_time: data.get("planned_start_time") as string,
      planned_end_time: data.get("planned_end_time") as string,
      actual_start_time: (data.get("actual_start_time") as string) || null,
      actual_end_time: (data.get("actual_end_time") as string) || null,
      quality_rating: qualityRating,
      completed_full_cycle: data.get("completed_full_cycle") === "true",
      general_notes: (data.get("general_notes") as string)?.trim() || null,
    };

    const result = existing
      ? await updateWorkCycleSession(existing.id, {
          actual_start_time: payload.actual_start_time,
          actual_end_time: payload.actual_end_time,
          quality_rating: payload.quality_rating,
          completed_full_cycle: payload.completed_full_cycle,
          general_notes: payload.general_notes,
        })
      : await createWorkCycleSession(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (existing) {
      router.push(`/pedagogy/work-cycles/${existing.id}`);
    } else {
      router.push(`/pedagogy/work-cycles/${result.data!.id}`);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--wc-severity-severe-bg)",
            background: "var(--wc-severity-severe-bg)",
            color: "var(--wc-severity-severe-fg)",
          }}
        >
          {error}
        </div>
      )}

      {/* Class + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="class_id"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Class <span className="text-destructive">*</span>
          </label>
          <select
            id="class_id"
            name="class_id"
            required
            defaultValue={existing?.class_id ?? defaultClassId ?? ""}
            disabled={!!existing}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          >
            <option value="">Select class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="session_date"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Date <span className="text-destructive">*</span>
          </label>
          <input
            id="session_date"
            name="session_date"
            type="date"
            required
            defaultValue={existing?.session_date ?? today}
            disabled={!!existing}
            max={today}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
        </div>
      </div>

      {/* Planned times */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">
          Planned Work Cycle Times
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="planned_start_time"
              className="block text-xs text-muted-foreground mb-1"
            >
              Start <span className="text-destructive">*</span>
            </label>
            <input
              id="planned_start_time"
              name="planned_start_time"
              type="time"
              required
              defaultValue={
                existing?.planned_start_time?.slice(0, 5) ?? "09:00"
              }
              disabled={!!existing}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="planned_end_time"
              className="block text-xs text-muted-foreground mb-1"
            >
              End <span className="text-destructive">*</span>
            </label>
            <input
              id="planned_end_time"
              name="planned_end_time"
              type="time"
              required
              defaultValue={existing?.planned_end_time?.slice(0, 5) ?? "12:00"}
              disabled={!!existing}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Actual times */}
      <div>
        <p className="text-sm font-medium text-foreground mb-1">
          Actual Times{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional - fill if cycle started/ended off schedule)
          </span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="actual_start_time"
              className="block text-xs text-muted-foreground mb-1"
            >
              Actual Start
            </label>
            <input
              id="actual_start_time"
              name="actual_start_time"
              type="time"
              defaultValue={existing?.actual_start_time?.slice(0, 5) ?? ""}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="actual_end_time"
              className="block text-xs text-muted-foreground mb-1"
            >
              Actual End
            </label>
            <input
              id="actual_end_time"
              name="actual_end_time"
              type="time"
              defaultValue={existing?.actual_end_time?.slice(0, 5) ?? ""}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Completed full cycle */}
      <div className="flex items-start gap-3">
        <input
          id="completed_full_cycle"
          name="completed_full_cycle"
          type="checkbox"
          value="true"
          defaultChecked={existing?.completed_full_cycle ?? false}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <div>
          <label
            htmlFor="completed_full_cycle"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            Full work cycle sustained
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Check if the class achieved an uninterrupted 3-hour work cycle
            overall.
          </p>
        </div>
      </div>

      {/* Quality rating */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">
          Overall Quality Rating{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {([1, 2, 3, 4, 5] as const).map((r) => {
            const info = QUALITY_RATING_LABELS[r];
            const isSelected = qualityRating === r;
            const colorVar =
              r <= 2
                ? "var(--wc-quality-low)"
                : r === 3
                  ? "var(--wc-quality-mid)"
                  : "var(--wc-quality-high)";
            return (
              <button
                key={r}
                type="button"
                onClick={() => setQualityRating(isSelected ? null : r)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={
                  isSelected
                    ? {
                        borderColor: colorVar,
                        background: colorVar,
                        color: "#fff",
                      }
                    : {
                        borderColor: "var(--border)",
                        color: "var(--muted-foreground)",
                      }
                }
                title={info?.description}
              >
                {r} - {info?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="general_notes"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Notes{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        </label>
        <textarea
          id="general_notes"
          name="general_notes"
          rows={3}
          defaultValue={existing?.general_notes ?? ""}
          placeholder="Any context about the session - themes, exceptional events, observations…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : existing ? "Save Changes" : "Record Session"}
        </button>
      </div>
    </form>
  );
}
