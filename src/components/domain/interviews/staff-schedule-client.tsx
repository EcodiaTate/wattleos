// src/components/domain/interviews/staff-schedule-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { setSlotBlocked, cancelInterviewBooking } from "@/lib/actions/interviews";
import { OutcomeForm } from "./outcome-form";
import { InterviewBookingStatusBadge } from "./interview-status-badge";
import type { StaffInterviewSchedule, InterviewSlotWithBooking } from "@/types/domain";

interface StaffScheduleClientProps {
  schedule: StaffInterviewSchedule;
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
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface SlotRowProps {
  slot: InterviewSlotWithBooking;
  onRefresh: () => void;
}

function SlotRow({ slot, onRefresh }: SlotRowProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [showOutcome, setShowOutcome] = useState(false);

  function handleBlock() {
    startTransition(async () => {
      haptics.impact("medium");
      await setSlotBlocked({ slotId: slot.id }, !slot.is_blocked);
      onRefresh();
    });
  }

  function handleCancelBooking() {
    if (!slot.booking) return;
    startTransition(async () => {
      haptics.impact("medium");
      await cancelInterviewBooking({ bookingId: slot.booking!.id, reason: "Cancelled by staff" });
      onRefresh();
    });
  }

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{
        background: slot.is_blocked
          ? "var(--interview-slot-blocked-bg)"
          : slot.booking
            ? "var(--interview-slot-booked-bg)"
            : "var(--interview-slot-available-bg)",
        border: "1px solid var(--border)",
        opacity: slot.is_blocked ? 0.7 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
          </p>
          {slot.location && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              📍 {slot.location}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {slot.booking && (
            <InterviewBookingStatusBadge status={slot.booking.status} size="sm" />
          )}
          {!slot.booking && (
            <button
              onClick={handleBlock}
              disabled={isPending}
              className="text-xs px-2 py-1 rounded-lg touch-target active-push"
              style={{
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
              }}
            >
              {slot.is_blocked ? "Unblock" : "Block"}
            </button>
          )}
        </div>
      </div>

      {slot.booking && (
        <div
          className="rounded-lg p-3 space-y-1"
          style={{ background: "var(--background)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {slot.booking.student.first_name} {slot.booking.student.last_name}
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {slot.booking.guardian_name}
            {slot.booking.guardian_phone && ` · ${slot.booking.guardian_phone}`}
          </p>

          {slot.booking.outcome_notes ? (
            <div
              className="mt-2 rounded p-2 text-xs"
              style={{ background: "var(--interview-booking-completed-bg)", color: "var(--interview-booking-completed-fg)" }}
            >
              <p className="font-medium">Notes recorded</p>
              <p className="mt-0.5 line-clamp-2">{slot.booking.outcome_notes}</p>
            </div>
          ) : slot.booking.status === "confirmed" ? (
            showOutcome ? (
              <OutcomeForm
                bookingId={slot.booking.id}
                studentName={`${slot.booking.student.first_name} ${slot.booking.student.last_name}`}
                onSuccess={() => { setShowOutcome(false); onRefresh(); }}
                onCancel={() => setShowOutcome(false)}
              />
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { haptics.impact("light"); setShowOutcome(true); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium touch-target active-push"
                  style={{
                    background: "var(--interview-outcome-pending-bg)",
                    color: "var(--interview-outcome-pending-fg)",
                  }}
                >
                  Record outcome
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={isPending}
                  className="text-xs px-2.5 py-1.5 rounded-lg touch-target active-push"
                  style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                >
                  Cancel booking
                </button>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

export function StaffScheduleClient({ schedule }: StaffScheduleClientProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total bookings", value: schedule.total_bookings },
          { label: "Outcomes pending", value: schedule.outcomes_pending },
          {
            label: "Days",
            value: schedule.days.length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {stat.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Outcomes pending banner */}
      {schedule.outcomes_pending > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "var(--interview-outcome-pending-bg)",
            color: "var(--interview-outcome-pending-fg)",
          }}
        >
          <span className="text-lg">⏳</span>
          <p className="text-sm font-medium">
            {schedule.outcomes_pending} interview{schedule.outcomes_pending !== 1 ? "s" : ""} need outcome notes
          </p>
        </div>
      )}

      {/* Days */}
      {schedule.days.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3" style={{ color: "var(--empty-state-icon)" }}>📅</p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No slots generated yet for this session.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {schedule.days.map((day) => (
            <div key={day.date}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                {formatDate(day.date)}
              </h3>
              <div className="space-y-2">
                {day.slots.map((slot) => (
                  <SlotRow key={slot.id} slot={slot} onRefresh={refresh} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
