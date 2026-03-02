// src/components/domain/interviews/booking-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createInterviewBooking } from "@/lib/actions/interviews";
import type { AvailableSlotForBooking, InterviewBooking } from "@/types/domain";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface BookingFormProps {
  sessionId: string;
  slots: AvailableSlotForBooking[];
  students: Student[];
  /** Pre-select a specific student */
  defaultStudentId?: string;
  onSuccess?: (booking: InterviewBooking) => void;
  onCancel?: () => void;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m}${suffix}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function BookingForm({
  sessionId,
  slots,
  students,
  defaultStudentId,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState(defaultStudentId ?? students[0]?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Group available slots by date for easier browsing
  const availableSlots = slots.filter((s) => s.is_available);
  const byDate = availableSlots.reduce<Record<string, AvailableSlotForBooking[]>>(
    (acc, slot) => {
      const d = slot.slot.slot_date;
      if (!acc[d]) acc[d] = [];
      acc[d].push(slot);
      return acc;
    },
    {},
  );
  const dates = Object.keys(byDate).sort();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotId) {
      setError("Please select a time slot");
      return;
    }
    setError(null);

    startTransition(async () => {
      haptics.impact("medium");
      const result = await createInterviewBooking({
        sessionId,
        slotId,
        studentId,
        guardianName,
        guardianEmail: guardianEmail || null,
        guardianPhone: guardianPhone || null,
      });

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Failed to create booking");
        haptics.error();
        return;
      }

      haptics.success();
      onSuccess?.(result.data);
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

      {students.length > 1 && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Child
          </label>
          <select
            value={studentId}
            onChange={(e) => { haptics.impact("light"); setStudentId(e.target.value); }}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Select a time <span className="text-red-500">*</span>
        </label>

        {dates.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No available slots at this time.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto scroll-native">
            {dates.map((date) => (
              <div key={date}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {formatDate(date)}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {byDate[date].map((s) => (
                    <button
                      key={s.slot.id}
                      type="button"
                      onClick={() => { haptics.impact("light"); setSlotId(s.slot.id); }}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-center touch-target active-push"
                      style={{
                        background:
                          slotId === s.slot.id
                            ? "var(--primary)"
                            : "var(--interview-slot-available-bg)",
                        color:
                          slotId === s.slot.id
                            ? "var(--primary-foreground)"
                            : "var(--interview-slot-available-fg)",
                        border:
                          slotId === s.slot.id
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                      }}
                    >
                      <div>{formatTime(s.slot.start_time)}</div>
                      <div className="text-xs opacity-75 truncate max-w-full">
                        {s.staff.first_name} {s.staff.last_name.charAt(0)}.
                      </div>
                      {s.slot.location && (
                        <div className="text-xs opacity-60 truncate">{s.slot.location}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Your contact details
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--foreground)" }}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            placeholder="Your full name"
            required
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Email
            </label>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--foreground)" }}>
              Phone
            </label>
            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="04xx xxx xxx"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--input)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !slotId}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium touch-target active-push"
          style={{
            background: isPending || !slotId ? "var(--muted)" : "var(--primary)",
            color: isPending || !slotId ? "var(--muted-foreground)" : "var(--primary-foreground)",
          }}
        >
          {isPending ? "Booking…" : "Confirm booking"}
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
