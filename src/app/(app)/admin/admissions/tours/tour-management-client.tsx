// src/app/(app)/admin/admissions/tours/tour-management-client.tsx
//
// ============================================================
// WattleOS V2 - Tour Management Client (Module 13)
// ============================================================
// 'use client' - handles tour slot CRUD, booking display,
// and attendance recording.
//
// WHY a single client component: Tour management is a
// contained workflow - create slots, view bookings, mark
// attendance. Keeping it in one component avoids prop-drilling
// and makes the create/expand/collapse interactions smooth.
//
// Layout: Two sections  -
//   1. Create Slot form (collapsible)
//   2. Slot cards grid (each expandable to show bookings)
// ============================================================

"use client";

import type { TourSlotWithDetails } from "@/lib/actions/admissions/tour-slots";
import {
  createTourSlot,
  deleteTourSlot,
  recordTourAttendance,
} from "@/lib/actions/admissions/tour-slots";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
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

// ── Props ────────────────────────────────────────────────────

interface TourManagementClientProps {
  initialSlots: TourSlotWithDetails[];
}

export function TourManagementClient({
  initialSlots,
}: TourManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── State ──────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");
  const [newMaxFamilies, setNewMaxFamilies] = useState(5);
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // ── Partition: upcoming vs past ────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const upcoming = initialSlots
    .filter((s) => s.date >= today && s.is_active)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.start_time.localeCompare(b.start_time),
    );
  const past = initialSlots
    .filter((s) => s.date < today || !s.is_active)
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Create slot handler ────────────────────────────────────
  async function handleCreateSlot() {
    if (!newDate || !newStartTime || !newEndTime) return;

    setIsSubmitting(true);
    setError(null);

    const result = await createTourSlot({
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      max_families: newMaxFamilies,
      location: newLocation.trim() || null,
      notes: newNotes.trim() || null,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Reset form
    setNewDate("");
    setNewStartTime("10:00");
    setNewEndTime("11:00");
    setNewMaxFamilies(5);
    setNewLocation("");
    setNewNotes("");
    setShowCreateForm(false);

    startTransition(() => {
      router.refresh();
    });
  }

  // ── Delete slot handler ────────────────────────────────────
  async function handleDeleteSlot(slotId: string) {
    if (
      !confirm("Delete this tour slot? Existing bookings will be orphaned.")
    ) {
      return;
    }

    setIsSubmitting(true);
    const result = await deleteTourSlot(slotId);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  // ── Record attendance handler ──────────────────────────────
  async function handleRecordAttendance(entryId: string, attended: boolean) {
    setIsSubmitting(true);
    const result = await recordTourAttendance(entryId, attended);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create slot toggle */}
      <div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
        >
          {showCreateForm ? "Cancel" : "+ New Tour Slot"}
        </button>
      </div>

      {/* Create slot form */}
      {showCreateForm && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-4 text-sm font-semibold text-amber-800">
            Create Tour Slot
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Date *
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={today}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Start Time *
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                End Time *
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Max Families
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={newMaxFamilies}
                onChange={(e) =>
                  setNewMaxFamilies(parseInt(e.target.value, 10) || 5)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Location{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g., Main reception"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Notes{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Internal notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCreateSlot}
              disabled={
                isSubmitting || !newDate || !newStartTime || !newEndTime
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create Slot"}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming slots */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Upcoming Tours ({upcoming.length})
        </h2>

        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
            No upcoming tour slots. Create one above.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((slot) => (
              <TourSlotCard
                key={slot.id}
                slot={slot}
                isExpanded={expandedSlotId === slot.id}
                onToggle={() =>
                  setExpandedSlotId(expandedSlotId === slot.id ? null : slot.id)
                }
                onDelete={() => handleDeleteSlot(slot.id)}
                onRecordAttendance={handleRecordAttendance}
                isSubmitting={isSubmitting}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past slots */}
      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Past Tours ({past.length})
          </h2>
          <div className="space-y-3 opacity-75">
            {past.map((slot) => (
              <TourSlotCard
                key={slot.id}
                slot={slot}
                isExpanded={expandedSlotId === slot.id}
                onToggle={() =>
                  setExpandedSlotId(expandedSlotId === slot.id ? null : slot.id)
                }
                onDelete={() => handleDeleteSlot(slot.id)}
                onRecordAttendance={handleRecordAttendance}
                isSubmitting={isSubmitting}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tour Slot Card ───────────────────────────────────────────

interface TourSlotCardProps {
  slot: TourSlotWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRecordAttendance: (entryId: string, attended: boolean) => void;
  isSubmitting: boolean;
  isPending: boolean;
}

function TourSlotCard({
  slot,
  isExpanded,
  onToggle,
  onDelete,
  onRecordAttendance,
  isSubmitting,
  isPending,
}: TourSlotCardProps) {
  const spotsRemaining = slot.max_families - slot.booked_count;
  const isFull = spotsRemaining <= 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          {/* Date block */}
          <div className="flex flex-col items-center rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs font-medium uppercase text-gray-500">
              {new Date(slot.date + "T00:00:00").toLocaleDateString("en-AU", {
                weekday: "short",
              })}
            </span>
            <span className="text-lg font-bold text-gray-900">
              {new Date(slot.date + "T00:00:00").getDate()}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(slot.date + "T00:00:00").toLocaleDateString("en-AU", {
                month: "short",
              })}
            </span>
          </div>

          {/* Details */}
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </p>
            {slot.location && (
              <p className="text-xs text-gray-500">{slot.location}</p>
            )}
            {slot.guide && (
              <p className="text-xs text-gray-500">
                Guide: {slot.guide.first_name} {slot.guide.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Right side - counts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                isFull
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {slot.booked_count}/{slot.max_families} booked
            </span>
            {slot.attended_count > 0 && (
              <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {slot.attended_count} attended
              </span>
            )}
          </div>

          {/* Chevron */}
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      {/* Expanded - bookings list */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          {slot.bookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No bookings yet for this slot.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Child</th>
                  <th className="pb-2 pr-4">Parent</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 text-center">Attended</th>
                </tr>
              </thead>
              <tbody>
                {slot.bookings.map((booking) => (
                  <tr
                    key={booking.entry_id}
                    className="border-b border-gray-50"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      <a
                        href={`/admin/admissions/${booking.entry_id}`}
                        className="text-amber-700 hover:underline"
                      >
                        {booking.child_name}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {booking.parent_name}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {booking.parent_email}
                    </td>
                    <td className="py-2 text-center">
                      {booking.tour_attended === null ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              onRecordAttendance(booking.entry_id, true)
                            }
                            disabled={isSubmitting || isPending}
                            className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                            title="Mark as attended"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() =>
                              onRecordAttendance(booking.entry_id, false)
                            }
                            disabled={isSubmitting || isPending}
                            className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                            title="Mark as no-show"
                          >
                            ✗
                          </button>
                        </div>
                      ) : booking.tour_attended ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-red-500">✗ No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Slot actions */}
          <div className="mt-3 flex justify-end gap-2">
            {slot.notes && (
              <p className="mr-auto text-xs text-gray-400 italic">
                {slot.notes}
              </p>
            )}
            <button
              onClick={onDelete}
              disabled={isSubmitting}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete Slot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
