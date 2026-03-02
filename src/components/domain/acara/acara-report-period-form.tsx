"use client";

// src/components/domain/acara/acara-report-period-form.tsx
//
// Create / edit an ACARA report period.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createAcaraReportPeriod } from "@/lib/actions/acara";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  mode: "create";
}

const CURRENT_YEAR = new Date().getFullYear();

export function AcaraReportPeriodForm({ mode }: Props) {
  const router = useRouter();
  const haptics = useHaptics();

  const [calendarYear, setCalendarYear] = useState(CURRENT_YEAR);
  const [collectionType, setCollectionType] = useState<
    "annual_school_collection" | "semester_1_snapshot" | "semester_2_snapshot"
  >("annual_school_collection");
  const [periodStart, setPeriodStart] = useState(`${CURRENT_YEAR}-01-28`);
  const [periodEnd, setPeriodEnd] = useState(`${CURRENT_YEAR}-12-05`);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    haptics.impact("medium");

    const result = await createAcaraReportPeriod({
      calendar_year: calendarYear,
      collection_type: collectionType,
      period_start: periodStart,
      period_end: periodEnd,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      return;
    }

    haptics.success();
    router.push(`/attendance/acara-reporting/${result.data!.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border p-5 space-y-5"
      style={{ background: "var(--card)" }}
    >
      {/* Calendar Year */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Calendar Year</label>
        <input
          type="number"
          min={2000}
          max={2100}
          value={calendarYear}
          onChange={(e) => setCalendarYear(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      {/* Collection Type */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Collection Type</label>
        <select
          value={collectionType}
          onChange={(e) =>
            setCollectionType(
              e.target.value as typeof collectionType,
            )
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="annual_school_collection">Annual School Collection (ASC)</option>
          <option value="semester_1_snapshot">Semester 1 Snapshot</option>
          <option value="semester_2_snapshot">Semester 2 Snapshot</option>
        </select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Period Start</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Period End</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Notes{" "}
          <span style={{ color: "var(--muted-foreground)" }}>(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          placeholder="Any context about this report period…"
        />
      </div>

      {error && (
        <p className="text-sm rounded-lg border px-3 py-2" style={{ color: "var(--destructive)", borderColor: "var(--destructive)", background: "var(--destructive-bg, hsl(0 60% 94%))" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {saving ? "Creating…" : mode === "create" ? "Create Period" : "Save"}
        </button>
      </div>
    </form>
  );
}
