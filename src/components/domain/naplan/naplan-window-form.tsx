"use client";

// src/components/domain/naplan/naplan-window-form.tsx
//
// Create or edit a NAPLAN test window.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useHaptics } from "@/lib/hooks/use-haptics";
import { createTestWindow, updateTestWindow } from "@/lib/actions/naplan";
import type { NaplanTestWindowWithCounts } from "@/types/domain";

interface NaplanWindowFormProps {
  window?: NaplanTestWindowWithCounts;
  defaultYear?: number;
}

export function NaplanWindowForm({ window, defaultYear }: NaplanWindowFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!window;

  const [year, setYear] = useState<number>(
    window?.collection_year ?? defaultYear ?? new Date().getFullYear(),
  );
  const [startDate, setStartDate] = useState(window?.test_start_date ?? "");
  const [endDate, setEndDate] = useState(window?.test_end_date ?? "");
  const [notes, setNotes] = useState(window?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let result;

      if (isEdit) {
        result = await updateTestWindow({
          id: window.id,
          collection_year: year,
          test_start_date: startDate || null,
          test_end_date: endDate || null,
          notes: notes || null,
        });
      } else {
        result = await createTestWindow({
          collection_year: year,
          test_start_date: startDate || null,
          test_end_date: endDate || null,
          notes: notes || null,
        });
      }

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (isEdit) {
        router.push(`/admin/naplan/${window.id}`);
      } else {
        if (result.data) router.push(`/admin/naplan/${(result.data as { id: string }).id}`);
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-xl border border-border p-6"
      style={{ background: "var(--card)" }}
    >
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "var(--destructive-bg, hsl(0 60% 96%))",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Collection year */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Collection Year <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="number"
          min={2020}
          max={2099}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          required
          disabled={isEdit && window?.status !== "draft"}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
        {isEdit && window?.status !== "draft" && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Year cannot be changed on non-draft windows
          </p>
        )}
      </div>

      {/* Test dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Test Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Test End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Test coordinator, venue notes, etc."
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="touch-target active-push rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-60"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save Changes"
              : "Create Window"}
        </button>
      </div>
    </form>
  );
}
