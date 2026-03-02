// src/components/domain/interviews/sessions-list-client.tsx
"use client";

import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { InterviewSessionStatusBadge } from "./interview-status-badge";
import type { InterviewSessionWithCounts, InterviewSessionStatus } from "@/types/domain";

interface SessionsListClientProps {
  sessions: InterviewSessionWithCounts[];
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SessionsListClient({ sessions }: SessionsListClientProps) {
  const haptics = useHaptics();

  if (sessions.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <p className="text-5xl mb-4" style={{ color: "var(--empty-state-icon)" }}>🗓️</p>
        <p className="text-base font-medium mb-1" style={{ color: "var(--foreground)" }}>
          No interview sessions yet
        </p>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Create a session to start scheduling parent-teacher interviews.
        </p>
        <Link
          href="/admin/interviews/new"
          className="inline-flex mt-4 rounded-lg px-4 py-2.5 text-sm font-medium touch-target active-push"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          Create session
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const fillRate =
          session.total_slots > 0
            ? Math.round((session.booked_slots / session.total_slots) * 100)
            : 0;

        return (
          <Link
            key={session.id}
            href={`/admin/interviews/${session.id}`}
            onClick={() => haptics.impact("light")}
            className="block rounded-2xl p-5 card-interactive"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <InterviewSessionStatusBadge
                    status={session.status as InterviewSessionStatus}
                    size="sm"
                  />
                  {session.status === "open" && session.available_slots > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "var(--interview-slot-available-bg)",
                        color: "var(--interview-slot-available-fg)",
                      }}
                    >
                      {session.available_slots} slots open
                    </span>
                  )}
                </div>
                <h3 className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
                  {session.title}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {formatDate(session.session_start_date)} – {formatDate(session.session_end_date)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                  {session.booked_slots}/{session.total_slots}
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  booked
                </p>
              </div>
            </div>

            {/* Fill rate bar */}
            {session.total_slots > 0 && (
              <div className="mt-3">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${fillRate}%`,
                      background:
                        fillRate >= 80
                          ? "var(--interview-open)"
                          : fillRate >= 40
                            ? "var(--interview-outcome-pending)"
                            : "var(--muted-foreground)",
                    }}
                  />
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
