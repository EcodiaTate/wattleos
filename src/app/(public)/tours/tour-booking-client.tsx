"use client";

// src/app/(public)/tours/tour-booking-client.tsx
//
// ============================================================
// WattleOS V2 - Public Tour Booking Client (Module 13)
// ============================================================
// Self-service tour booking. Families click "Book This Tour"
// on a slot to expand an inline form. On submit, bookTourPublic
// creates/reuses their waitlist entry and reserves the spot.
//
// One slot can be expanded at a time. Booked slots transition
// to a per-slot success state without re-fetching.
// ============================================================

import { bookTourPublic } from "@/lib/actions/admissions/book-tour-public";
import type { AvailableTourSlot } from "@/lib/actions/admissions/tour-slots";
import type { CustomField } from "@/types/domain";
import { useState } from "react";

interface TourBookingClientProps {
  slots: AvailableTourSlot[];
  tenantId: string;
  tenantSlug: string;
  schoolName: string;
  customQuestions: CustomField[];
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function groupByDate(
  slots: AvailableTourSlot[],
): Map<string, AvailableTourSlot[]> {
  const grouped = new Map<string, AvailableTourSlot[]>();
  for (const slot of slots) {
    const existing = grouped.get(slot.date) ?? [];
    existing.push(slot);
    grouped.set(slot.date, existing);
  }
  return grouped;
}

// ── Slot card with inline booking form ───────────────────────

function TourSlotCard({
  slot,
  tenantId,
  customQuestions,
  isExpanded,
  onExpand,
}: {
  slot: AvailableTourSlot;
  tenantId: string;
  customQuestions: CustomField[];
  isExpanded: boolean;
  onExpand: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [notes, setNotes] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(customQuestions.map((q) => [q.id, ""])),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!childName.trim()) {
      setError("Child name is required.");
      return;
    }
    for (const q of customQuestions) {
      if (q.required && !customValues[q.id]?.trim()) {
        setError(`${q.label} is required.`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    const result = await bookTourPublic({
      tenant_id: tenantId,
      tour_slot_id: slot.id,
      parent_first_name: firstName,
      parent_last_name: lastName,
      parent_email: email,
      parent_phone: phone || null,
      child_name: childName,
      child_age: childAge || null,
      notes: notes || null,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setIsBooked(true);
  }

  // Success state
  if (isBooked) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15">
            <svg
              className="h-4 w-4 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-success">
              Tour booked - {formatTime(slot.start_time)}
            </p>
            <p className="text-xs text-success">
              We&apos;ll be in touch to confirm. Check your inbox for {email}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* Slot header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </p>
            {slot.location && (
              <p className="text-xs text-muted-foreground">{slot.location}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              slot.spots_remaining <= 2
                ? "bg-destructive/15 text-destructive"
                : "bg-success/15 text-success"
            }`}
          >
            {slot.spots_remaining}{" "}
            {slot.spots_remaining === 1 ? "spot" : "spots"} left
          </span>
        </div>

        <button
          onClick={onExpand}
          className="rounded-lg px-4 py-2 text-sm font-semibold pb-btn"
        >
          {isExpanded ? "Cancel" : "Book This Tour"}
        </button>
      </div>

      {/* Inline booking form */}
      {isExpanded && (
        <div className="border-t border-border bg-muted px-5 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Parent details */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="Optional"
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
            </div>

            {/* Child details */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Child&apos;s Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Child&apos;s Age
                </label>
                <input
                  type="text"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="e.g., 4 years old"
                  className="w-full rounded-md px-3 py-2 text-sm pb-input"
                />
              </div>
            </div>

            {/* Custom questions */}
            {customQuestions.map((q) => (
              <div key={q.id}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {q.label}
                  {q.required && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </label>
                {q.type === "textarea" ? (
                  <textarea
                    value={customValues[q.id] ?? ""}
                    onChange={(e) =>
                      setCustomValues((p) => ({ ...p, [q.id]: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-md px-3 py-2 text-sm pb-input"
                  />
                ) : q.type === "select" && q.options?.length ? (
                  <select
                    value={customValues[q.id] ?? ""}
                    onChange={(e) =>
                      setCustomValues((p) => ({ ...p, [q.id]: e.target.value }))
                    }
                    className="w-full rounded-md bg-card px-3 py-2 text-sm pb-input"
                  >
                    <option value="">Select…</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={q.type === "date" ? "date" : "text"}
                    value={customValues[q.id] ?? ""}
                    onChange={(e) =>
                      setCustomValues((p) => ({ ...p, [q.id]: e.target.value }))
                    }
                    className="w-full rounded-md px-3 py-2 text-sm pb-input"
                  />
                )}
              </div>
            ))}

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Questions or notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything you'd like us to know before the tour…"
                className="w-full rounded-md px-3 py-2 text-sm pb-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold pb-btn"
            >
              {isSubmitting ? "Reserving your spot…" : "Confirm Booking"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function TourBookingClient({
  slots,
  tenantId,
  tenantSlug,
  schoolName,
  customQuestions,
}: TourBookingClientProps) {
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const grouped = groupByDate(slots);
  const inquiryHref = `/inquiry?tenant=${tenantSlug}`;

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          No Upcoming Tours
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {schoolName} doesn&apos;t have any upcoming tour slots right now.
          Submit an enquiry and we&apos;ll let you know when tours are
          available.
        </p>
        <a
          href={inquiryHref}
          className="mt-4 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold pb-btn"
        >
          Submit an Enquiry
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([date, dateSlots]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {dateSlots.map((slot) => (
              <TourSlotCard
                key={slot.id}
                slot={slot}
                tenantId={tenantId}
                customQuestions={customQuestions}
                isExpanded={expandedSlotId === slot.id}
                onExpand={() =>
                  setExpandedSlotId((prev) =>
                    prev === slot.id ? null : slot.id,
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-muted-foreground">
        Prefer to enquire first?{" "}
        <a
          href={inquiryHref}
          className="font-medium text-muted-foreground underline hover:text-foreground"
        >
          Submit an enquiry
        </a>{" "}
        and we&apos;ll be in touch.
      </p>
    </div>
  );
}
