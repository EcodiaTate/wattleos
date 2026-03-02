// src/components/domain/interviews/session-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createInterviewSession,
  updateInterviewSession,
} from "@/lib/actions/interviews";
import type { InterviewSession } from "@/types/domain";

interface SessionFormProps {
  session?: InterviewSession;
  onSuccess?: (session: InterviewSession) => void;
  onCancel?: () => void;
}

export function SessionForm({ session, onSuccess, onCancel }: SessionFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [startDate, setStartDate] = useState(session?.session_start_date ?? "");
  const [endDate, setEndDate] = useState(session?.session_end_date ?? "");
  const [bookingOpenAt, setBookingOpenAt] = useState(
    session?.booking_open_at ? session.booking_open_at.slice(0, 16) : "",
  );
  const [bookingCloseAt, setBookingCloseAt] = useState(
    session?.booking_close_at ? session.booking_close_at.slice(0, 16) : "",
  );
  const [slotDuration, setSlotDuration] = useState(
    String(session?.slot_duration_mins ?? 15),
  );
  const [allowCancellation, setAllowCancellation] = useState(
    session?.allow_cancellation ?? true,
  );
  const [cutoffHours, setCutoffHours] = useState(
    String(session?.cancellation_cutoff_hours ?? 24),
  );
  const [notes, setNotes] = useState(session?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      haptics.impact("medium");
      const input = {
        title,
        description: description || undefined,
        sessionStartDate: startDate,
        sessionEndDate: endDate,
        bookingOpenAt: bookingOpenAt ? `${bookingOpenAt}:00.000Z` : null,
        bookingCloseAt: bookingCloseAt ? `${bookingCloseAt}:00.000Z` : null,
        slotDurationMins: Number(slotDuration),
        allowCancellation,
        cancellationCutoffHours: Number(cutoffHours),
        notes: notes || undefined,
      };

      const result = session
        ? await updateInterviewSession(session.id, input)
        : await createInterviewSession(input);

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Failed to save session");
        haptics.error();
        return;
      }

      haptics.success();
      onSuccess?.(result.data);
      if (!onSuccess) router.push("/admin/interviews");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "var(--medical-mild-bg)", color: "var(--medical-mild-fg)" }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Session title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Term 1 2026 Parent-Teacher Interviews"
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
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional details visible to parents when booking"
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Start date <span className="text-red-500">*</span>
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
          <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            End date <span className="text-red-500">*</span>
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
          <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Booking opens
          </label>
          <input
            type="datetime-local"
            value={bookingOpenAt}
            onChange={(e) => setBookingOpenAt(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Leave blank to open immediately when status is set to Open
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Booking closes
          </label>
          <input
            type="datetime-local"
            value={bookingCloseAt}
            onChange={(e) => setBookingCloseAt(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Leave blank to close manually
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Slot duration (minutes)
        </label>
        <select
          value={slotDuration}
          onChange={(e) => setSlotDuration(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {[5, 10, 15, 20, 30, 45, 60].map((m) => (
            <option key={m} value={m}>{m} min</option>
          ))}
        </select>
      </div>

      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Allow cancellations
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Parents can cancel their bookings up to the cutoff time
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              haptics.impact("light");
              setAllowCancellation(!allowCancellation);
            }}
            className="relative inline-flex h-6 w-11 rounded-full transition-colors touch-target"
            style={{
              background: allowCancellation ? "var(--primary)" : "var(--border)",
            }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
              style={{
                transform: `translateX(${allowCancellation ? "20px" : "2px"})`,
                marginTop: "2px",
              }}
            />
          </button>
        </div>

        {allowCancellation && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Cancellation cutoff (hours before interview)
            </label>
            <input
              type="number"
              value={cutoffHours}
              onChange={(e) => setCutoffHours(e.target.value)}
              min={0}
              max={168}
              className="w-32 rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Notes (staff only)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{
            background: "var(--input)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium touch-target active-push"
          style={{
            background: isPending ? "var(--muted)" : "var(--primary)",
            color: isPending ? "var(--muted-foreground)" : "var(--primary-foreground)",
          }}
        >
          {isPending
            ? session ? "Saving…" : "Creating…"
            : session ? "Save changes" : "Create session"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={() => { haptics.impact("light"); onCancel(); }}
            className="rounded-lg px-4 py-2.5 text-sm font-medium touch-target"
            style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
