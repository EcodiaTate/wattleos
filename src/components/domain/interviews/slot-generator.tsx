// src/components/domain/interviews/slot-generator.tsx
"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { generateInterviewSlots } from "@/lib/actions/interviews";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface SlotGeneratorProps {
  sessionId: string;
  staff: StaffOption[];
  onSuccess?: (result: { created: number; skipped: number }) => void;
}

export function SlotGenerator({
  sessionId,
  staff,
  onSuccess,
}: SlotGeneratorProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [staffUserId, setStaffUserId] = useState(staff[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [location, setLocation] = useState("");

  function buildDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        // skip weekends
        dates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const dates = buildDateRange(startDate, endDate);
    if (dates.length === 0) {
      setError("No weekdays in the selected date range");
      return;
    }

    startTransition(async () => {
      haptics.impact("medium");
      const result = await generateInterviewSlots({
        sessionId,
        staffUserId,
        dates,
        startTime,
        endTime,
        location: location || undefined,
      });

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Failed to generate slots");
        haptics.error();
        return;
      }

      haptics.success();
      const msg = `Created ${result.data.created} slot${result.data.created !== 1 ? "s" : ""}${result.data.skipped > 0 ? ` (${result.data.skipped} skipped - already existed)` : ""}`;
      setSuccess(msg);
      onSuccess?.(result.data);
    });
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--medical-mild-bg)",
            color: "var(--medical-mild-fg)",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--interview-booking-confirmed-bg)",
            color: "var(--interview-booking-confirmed-fg)",
          }}
        >
          {success}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Staff member
        </label>
        <select
          value={staffUserId}
          onChange={(e) => setStaffUserId(e.target.value)}
          required
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            From date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            To date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Start time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            End time
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Location (optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Room 3, Library, Zoom link"
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        Weekends are automatically skipped. Duplicate slots are ignored.
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium touch-target active-push"
        style={{
          background: isPending ? "var(--muted)" : "var(--primary)",
          color: isPending
            ? "var(--muted-foreground)"
            : "var(--primary-foreground)",
        }}
      >
        {isPending ? "Generating…" : "Generate slots"}
      </button>
    </form>
  );
}
