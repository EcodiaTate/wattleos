"use client";

import { useState, useEffect, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useEmergencyRealtime } from "@/lib/hooks/use-emergency-realtime";
import { addEventNote } from "@/lib/actions/emergency-coordination";
import type { EmergencyCoordinationLiveData } from "@/types/domain";
import { EmergencyStatusBadge } from "./emergency-status-badge";
import { SeverityBadge } from "./severity-badge";
import { HeadcountSummary } from "./headcount-summary";
import { ZoneGrid } from "./zone-grid";
import { StudentRollCall } from "./student-roll-call";
import { StaffAccountability } from "./staff-accountability";
import { EventTimeline } from "./event-timeline";
import { AllClearPanel } from "./all-clear-panel";

const EVENT_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "FIRE EVACUATION",
  lockdown: "LOCKDOWN",
  shelter_in_place: "SHELTER IN PLACE",
  medical_emergency: "MEDICAL EMERGENCY",
  other: "EMERGENCY",
};

type RollCallTab = "students" | "staff";

function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(since).getTime();

    function update() {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [since]);

  return (
    <span
      className="font-mono text-2xl font-bold tabular-nums"
      style={{ color: "var(--emergency-activated)" }}
    >
      {elapsed}
    </span>
  );
}

export function CoordinationDashboardClient({
  initialData,
  canActivate,
  canCoordinate,
  currentUserId,
}: {
  initialData: EmergencyCoordinationLiveData;
  canActivate: boolean;
  canCoordinate: boolean;
  currentUserId: string;
}) {
  const haptics = useHaptics();

  // Fire haptics on critical incoming changes from other devices
  const handleCriticalChange = useCallback(
    (type: string, action: string) => {
      if (action === "needs_assistance" || action === "blocked") {
        haptics.error();
      } else if (type === "student" && action === "unaccounted") {
        haptics.warning();
      } else if (
        (type === "student" || type === "staff") &&
        action === "accounted"
      ) {
        haptics.selection();
      }
    },
    [haptics],
  );

  const { data, recentChanges } = useEmergencyRealtime(
    initialData.event.id,
    initialData,
    handleCriticalChange,
  );

  const [rollCallTab, setRollCallTab] = useState<RollCallTab>("students");
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  if (!data) return null;

  const {
    event,
    zones,
    student_accountability,
    staff_accountability,
    timeline,
    summary,
  } = data;

  const handleSendNote = async () => {
    if (!noteText.trim()) return;
    haptics.impact("medium");
    setNoteSending(true);
    await addEventNote(event.id, { message: noteText.trim() });
    setNoteText("");
    setNoteSending(false);
  };

  const latestTimelineEntry =
    timeline.length > 0 ? timeline[timeline.length - 1] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* ============================================================
          HEADER ROW - compact single line
         ============================================================ */}
      <div className="flex flex-wrap items-center gap-2">
        <EmergencyStatusBadge status={event.status} size="lg" />
        <SeverityBadge severity={event.severity} />
        <span
          className="text-base sm:text-lg font-extrabold uppercase tracking-wide"
          style={{ color: "var(--foreground)" }}
        >
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
          {event.event_type_other ? `: ${event.event_type_other}` : ""}
        </span>
        <span className="ml-auto">
          <ElapsedTimer since={event.activated_at} />
        </span>
      </div>

      {/* ============================================================
          ASSEMBLY POINT STRIP - unmissable
         ============================================================ */}
      {(event.assembly_point || event.instructions) && (
        <div
          className="rounded-[var(--radius-lg)] px-4 py-3"
          style={{
            backgroundColor: "var(--emergency-activated-bg)",
            borderLeft: "4px solid var(--emergency-activated)",
          }}
        >
          {event.assembly_point && (
            <p
              className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide"
              style={{ color: "var(--emergency-activated)" }}
            >
              {event.assembly_point}
            </p>
          )}
          {event.instructions && (
            <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>
              {event.instructions}
            </p>
          )}
        </div>
      )}

      {/* ============================================================
          UNACCOUNTED SCOREBOARD - dominant numbers
         ============================================================ */}
      <HeadcountSummary summary={summary} />

      {/* ============================================================
          MAIN CONTENT - zones + roll call + timeline
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* LEFT: Zones + Roll Call */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Zone strip */}
          <ZoneGrid
            zones={zones}
            eventId={event.id}
            canCoordinate={canCoordinate}
            display="strip"
            recentChanges={recentChanges}
          />

          {/* Roll call toggle: Students / Staff */}
          <div
            className="flex border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {(["students", "staff"] as const).map((tab) => {
              const isActive = rollCallTab === tab;
              const count =
                tab === "students"
                  ? `${summary.students_accounted}/${summary.students_total}`
                  : `${summary.staff_accounted}/${summary.staff_total}`;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    haptics.selection();
                    setRollCallTab(tab);
                  }}
                  className="active-push flex-1 px-2 py-2 text-sm font-semibold text-center capitalize"
                  style={{
                    color: isActive
                      ? "var(--primary)"
                      : "var(--muted-foreground)",
                    borderBottom: isActive
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                  }}
                >
                  {tab} <span className="text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Roll call content */}
          <div className="flex-1 min-h-0">
            {rollCallTab === "students" ? (
              <StudentRollCall
                students={student_accountability}
                eventId={event.id}
                canCoordinate={canCoordinate}
                recentChanges={recentChanges}
              />
            ) : (
              <StaffAccountability
                staff={staff_accountability}
                eventId={event.id}
                currentUserId={currentUserId}
                canCoordinate={canCoordinate}
                recentChanges={recentChanges}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Timeline (desktop visible, mobile collapsed) */}
        <div className="flex flex-col min-w-0">
          {/* Mobile: collapsed live feed bar */}
          <button
            onClick={() => {
              haptics.selection();
              setShowTimeline(!showTimeline);
            }}
            className="active-push lg:hidden flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-left"
            style={{ backgroundColor: "var(--card)" }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: "var(--emergency-activated)" }}
            />
            <span
              className="flex-1 text-xs truncate"
              style={{ color: "var(--foreground)" }}
            >
              {latestTimelineEntry
                ? latestTimelineEntry.message
                : "No events yet"}
            </span>
            <span
              className="text-[10px] shrink-0"
              style={{ color: "var(--muted-foreground)" }}
            >
              {showTimeline ? "Hide" : "Live Feed"}
            </span>
          </button>

          {/* Timeline content (always visible on desktop, toggle on mobile) */}
          <div
            className={`flex flex-col gap-2 mt-2 ${showTimeline ? "" : "hidden lg:flex"}`}
          >
            <EventTimeline
              entries={timeline}
              compact
              recentChanges={recentChanges}
            />
            {canCoordinate && (
              <div className="flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendNote();
                    }
                  }}
                  className="flex-1 rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--foreground)",
                  }}
                  placeholder="Add a note..."
                  disabled={noteSending}
                />
                <button
                  onClick={handleSendNote}
                  disabled={noteSending || !noteText.trim()}
                  className="active-push touch-target rounded-[var(--radius)] px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                    opacity: noteSending || !noteText.trim() ? 0.5 : 1,
                  }}
                >
                  {noteSending ? "..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          COMMAND BAR - sticky at bottom, always visible
         ============================================================ */}
      {canActivate && (
        <AllClearPanel
          eventId={event.id}
          eventStatus={event.status}
          summary={summary}
        />
      )}
    </div>
  );
}
