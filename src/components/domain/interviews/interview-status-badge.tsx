// src/components/domain/interviews/interview-status-badge.tsx
"use client";

import type { InterviewSessionStatus, InterviewBookingStatus } from "@/types/domain";

interface SessionStatusBadgeProps {
  status: InterviewSessionStatus;
  size?: "sm" | "md";
}

const SESSION_LABELS: Record<InterviewSessionStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  archived: "Archived",
};

export function InterviewSessionStatusBadge({
  status,
  size = "md",
}: SessionStatusBadgeProps) {
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        background: `var(--interview-${status}-bg)`,
        color: `var(--interview-${status}-fg)`,
      }}
    >
      {SESSION_LABELS[status]}
    </span>
  );
}

interface BookingStatusBadgeProps {
  status: InterviewBookingStatus;
  size?: "sm" | "md";
}

const BOOKING_LABELS: Record<InterviewBookingStatus, string> = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No Show",
  completed: "Completed",
};

export function InterviewBookingStatusBadge({
  status,
  size = "md",
}: BookingStatusBadgeProps) {
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        background: `var(--interview-booking-${status.replace("_", "-")}-bg)`,
        color: `var(--interview-booking-${status.replace("_", "-")}-fg)`,
      }}
    >
      {BOOKING_LABELS[status]}
    </span>
  );
}

interface SlotAvailabilityBadgeProps {
  isBlocked: boolean;
  isBooked: boolean;
  size?: "sm" | "md";
}

export function SlotAvailabilityBadge({
  isBlocked,
  isBooked,
  size = "sm",
}: SlotAvailabilityBadgeProps) {
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const state = isBlocked ? "blocked" : isBooked ? "booked" : "available";
  const labels = { available: "Available", booked: "Booked", blocked: "Blocked" };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        background: `var(--interview-slot-${state}-bg)`,
        color: `var(--interview-slot-${state}-fg)`,
      }}
    >
      {labels[state]}
    </span>
  );
}
