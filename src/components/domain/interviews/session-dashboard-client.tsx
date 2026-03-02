// src/components/domain/interviews/session-dashboard-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { setInterviewSessionStatus, deleteInterviewSession } from "@/lib/actions/interviews";
import { InterviewSessionStatusBadge, InterviewBookingStatusBadge } from "./interview-status-badge";
import type { InterviewSessionDashboard, InterviewSessionStatus } from "@/types/domain";

interface SessionDashboardClientProps {
  dashboard: InterviewSessionDashboard;
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

export function SessionDashboardClient({ dashboard }: SessionDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { session, by_staff, bookings } = dashboard;

  function handleStatusChange(newStatus: "open" | "closed" | "archived") {
    startTransition(async () => {
      haptics.impact("heavy");
      await setInterviewSessionStatus(session.id, newStatus);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await deleteInterviewSession(session.id);
      if (!result.error) {
        router.push("/admin/interviews");
      }
    });
  }

  const fillRate =
    session.total_slots > 0
      ? Math.round((session.booked_slots / session.total_slots) * 100)
      : 0;

  const statusActions = (
    [
      { label: "Open for booking", status: "open" },
      { label: "Close booking", status: "closed" },
      { label: "Archive", status: "archived" },
    ] as Array<{ label: string; status: "open" | "closed" | "archived" }>
  ).filter((a) => a.status !== session.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <InterviewSessionStatusBadge status={session.status as InterviewSessionStatus} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {session.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {formatDate(session.session_start_date)} – {formatDate(session.session_end_date)}
            {" · "}{session.slot_duration_mins}-min slots
          </p>
          {session.description && (
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              {session.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-fit">
          {statusActions.slice(0, 1).map((action) => (
            <button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isPending}
              className="rounded-lg px-3 py-2 text-sm font-medium touch-target active-push whitespace-nowrap"
              style={{
                background:
                  action.status === "open"
                    ? "var(--interview-open-bg)"
                    : action.status === "closed"
                      ? "var(--interview-closed-bg)"
                      : "var(--interview-archived-bg)",
                color:
                  action.status === "open"
                    ? "var(--interview-open-fg)"
                    : action.status === "closed"
                      ? "var(--interview-closed-fg)"
                      : "var(--interview-archived-fg)",
              }}
            >
              {action.label}
            </button>
          ))}
          <Link
            href={`/admin/interviews/${session.id}/edit`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-center touch-target"
            style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Edit
          </Link>
          <Link
            href={`/admin/interviews/${session.id}/slots`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-center touch-target active-push"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Manage slots
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total slots", value: session.total_slots },
          { label: "Booked", value: session.booked_slots },
          { label: "Available", value: session.available_slots },
          { label: "Fill rate", value: `${fillRate}%` },
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

      {/* Fill rate bar */}
      {session.total_slots > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
            <span>Booking fill rate</span>
            <span>{session.booked_slots} / {session.total_slots}</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${fillRate}%`,
                background: fillRate >= 80 ? "var(--interview-open)" : fillRate >= 40 ? "var(--interview-outcome-pending)" : "var(--muted-foreground)",
              }}
            />
          </div>
        </div>
      )}

      {/* By-staff breakdown */}
      {by_staff.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            By staff member
          </h2>
          <div className="space-y-2">
            {by_staff.map((entry) => (
              <div
                key={entry.staff.id}
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {entry.staff.first_name} {entry.staff.last_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {entry.booked}/{entry.total_slots} booked
                    {entry.blocked > 0 && ` · ${entry.blocked} blocked`}
                  </p>
                </div>
                <Link
                  href={`/admin/interviews/${session.id}/slots?staff=${entry.staff.id}`}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium touch-target"
                  style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                >
                  View slots
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking list */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Bookings ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-3xl mb-2" style={{ color: "var(--empty-state-icon)" }}>🗓️</p>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {session.status === "open"
                ? "No bookings yet. Share the booking link with families."
                : "No bookings recorded."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl p-4 flex items-center justify-between gap-3"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {b.student.first_name} {b.student.last_name}
                    </p>
                    <InterviewBookingStatusBadge status={b.status} size="sm" />
                    {b.outcome_notes && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "var(--interview-booking-completed-bg)", color: "var(--interview-booking-completed-fg)" }}
                      >
                        Notes recorded
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {b.guardian_name}
                    {" · "}{formatDate(b.slot.slot_date)} {formatTime(b.slot.start_time)}
                    {" · "}{b.staff.first_name} {b.staff.last_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {session.status === "draft" && (
        <div
          className="rounded-xl p-4 mt-4"
          style={{ border: "1px solid var(--destructive)", background: "var(--destructive-bg, var(--muted))" }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>Danger zone</p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => { haptics.impact("light"); setShowDeleteConfirm(true); }}
              className="text-sm px-3 py-2 rounded-lg touch-target"
              style={{ color: "var(--destructive)", border: "1px solid var(--destructive)" }}
            >
              Delete session
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                This permanently deletes the session and all its slots. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-sm px-3 py-2 rounded-lg font-medium touch-target active-push"
                  style={{ background: "var(--destructive, #dc2626)", color: "#fff" }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-sm px-3 py-2 rounded-lg touch-target"
                  style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
