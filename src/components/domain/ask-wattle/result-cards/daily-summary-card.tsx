"use client";

import type { DailySummaryData } from "@/types/ask-wattle";

interface Props {
  data: DailySummaryData["data"];
}

export function DailySummaryCard({ data }: Props) {
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        background: "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
        border: "1px solid var(--wattle-border)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--wattle-brown)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--wattle-dark)" }}
        >
          {data.date_display}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Attendance */}
        {data.attendance && (
          <div
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
            style={{
              background: "color-mix(in srgb, var(--card) 40%, transparent)",
            }}
          >
            <span
              className="text-[12px]"
              style={{ color: "var(--wattle-brown)" }}
            >
              Roll call
            </span>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background:
                    data.attendance.classes_complete ===
                    data.attendance.classes_total
                      ? "color-mix(in srgb, var(--attendance-present) 12%, transparent)"
                      : "color-mix(in srgb, var(--wattle-gold) 12%, transparent)",
                  color:
                    data.attendance.classes_complete ===
                    data.attendance.classes_total
                      ? "var(--attendance-present-fg)"
                      : "var(--attendance-late-fg)",
                }}
              >
                {data.attendance.classes_complete}/
                {data.attendance.classes_total} classes
              </span>
              {data.attendance.total_absent > 0 && (
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "var(--destructive)" }}
                >
                  {data.attendance.total_absent} absent
                </span>
              )}
              {data.attendance.total_unmarked > 0 && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {data.attendance.total_unmarked} unmarked
                </span>
              )}
            </div>
          </div>
        )}

        {/* Events */}
        {data.events && data.events.length > 0 && (
          <div
            className="rounded-lg px-2.5 py-1.5"
            style={{
              background: "color-mix(in srgb, var(--card) 40%, transparent)",
            }}
          >
            <span
              className="text-[12px]"
              style={{ color: "var(--wattle-brown)" }}
            >
              {data.events.length} event{data.events.length > 1 ? "s" : ""}{" "}
              today
            </span>
            <div className="mt-1 flex flex-col gap-0.5">
              {data.events.slice(0, 3).map((e, i) => (
                <span
                  key={i}
                  className="text-[11px]"
                  style={{ color: "var(--wattle-dark)" }}
                >
                  {new Date(e.starts_at).toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  - {e.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Announcements */}
        {data.recent_announcements !== undefined &&
          data.recent_announcements > 0 && (
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{
                background: "color-mix(in srgb, var(--card) 40%, transparent)",
              }}
            >
              <span
                className="text-[12px]"
                style={{ color: "var(--wattle-brown)" }}
              >
                Announcements this week
              </span>
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--wattle-brown)" }}
              >
                {data.recent_announcements}
              </span>
            </div>
          )}

        {/* Pending timesheets */}
        {data.pending_timesheets !== undefined &&
          data.pending_timesheets > 0 && (
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{
                background:
                  "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
              }}
            >
              <span
                className="text-[12px]"
                style={{ color: "var(--wattle-brown)" }}
              >
                Timesheets awaiting approval
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background:
                    "color-mix(in srgb, var(--wattle-gold) 12%, transparent)",
                  color: "var(--attendance-late-fg)",
                }}
              >
                {data.pending_timesheets}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}
