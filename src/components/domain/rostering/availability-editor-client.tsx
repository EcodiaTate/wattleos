"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffAvailability } from "@/types/domain";
import {
  setRecurringAvailability,
  setSpecificDateAvailability,
} from "@/lib/actions/rostering";
import { WEEKDAY_LABELS } from "@/lib/constants/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function AvailabilityEditorClient({
  availability,
}: {
  availability: StaffAvailability[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const recurring = availability.filter((a) => a.is_recurring);
  const specific = availability.filter((a) => !a.is_recurring);

  function handleRecurringToggle(
    dayOfWeek: number,
    currentlyAvailable: boolean,
  ) {
    startTransition(async () => {
      haptics.impact("light");
      const result = await setRecurringAvailability({
        dayOfWeek,
        isAvailable: !currentlyAvailable,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      router.refresh();
    });
  }

  function handleAddSpecific(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await setSpecificDateAvailability({
        specificDate: fd.get("date") as string,
        isAvailable: fd.get("available") === "true",
        availableFrom: (fd.get("from") as string) || undefined,
        availableUntil: (fd.get("until") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
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
    <div className="space-y-6">
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Recurring weekly availability */}
      <div
        className="rounded-xl border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Weekly Availability
        </h3>
        <p
          className="mb-3 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Tap a day to toggle your standard weekly availability.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const dayNum = i + 1;
            const match = recurring.find((a) => a.day_of_week === dayNum);
            const isAvail = match ? match.is_available : true; // default available
            return (
              <button
                key={dayNum}
                onClick={() => handleRecurringToggle(dayNum, isAvail)}
                disabled={isPending}
                className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: isAvail ? "var(--primary)" : "var(--muted)",
                  color: isAvail
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Specific date overrides */}
      <div
        className="rounded-xl border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Date Overrides
        </h3>
        <p
          className="mb-3 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Override your availability for a specific date (e.g. "unavailable next
          Tuesday").
        </p>

        {specific.length > 0 && (
          <div className="mb-3 space-y-1">
            {specific.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                <span style={{ color: "var(--foreground)" }}>
                  {a.specific_date} -{" "}
                  {a.is_available ? "Available" : "Unavailable"}
                  {a.available_from &&
                    ` (${a.available_from}–${a.available_until})`}
                </span>
                {a.notes && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {a.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleAddSpecific}
          className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          <input
            name="date"
            type="date"
            required
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
          <select
            name="available"
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          >
            <option value="false">Unavailable</option>
            <option value="true">Available</option>
          </select>
          <input
            name="from"
            type="time"
            placeholder="From"
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
          <input
            name="until"
            type="time"
            placeholder="Until"
            className="rounded-lg border border-border px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="active-push rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving…" : "Add Override"}
          </button>
        </form>
      </div>
    </div>
  );
}
