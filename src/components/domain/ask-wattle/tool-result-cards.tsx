"use client";

import type { ChatToolResult } from "@/lib/hooks/use-ask-wattle";
import { AbsentStudentsCard } from "./result-cards/absent-students-card";
import { AttendanceConfirmationCard } from "./result-cards/attendance-confirmation-card";
import { AttendanceSummaryCard } from "./result-cards/attendance-summary-card";
import { BulkAttendanceCard } from "./result-cards/bulk-attendance-card";
import { CheckinConfirmationCard } from "./result-cards/checkin-confirmation-card";
import { CheckoutConfirmationCard } from "./result-cards/checkout-confirmation-card";
import { ClassListCard } from "./result-cards/class-list-card";
import { CustodyAlertCard } from "./result-cards/custody-alert-card";
import { DailySummaryCard } from "./result-cards/daily-summary-card";
import { DisambiguationCard } from "./result-cards/disambiguation-card";
import { GenericListCard } from "./result-cards/generic-list-card";
import { MedicalInfoCard } from "./result-cards/medical-info-card";
import { StudentInfoCard } from "./result-cards/student-info-card";
import { TimeEntryCard } from "./result-cards/time-entry-card";

interface ToolResultCardProps {
  result: ChatToolResult;
  onRevert: (toolCallId: string) => void;
  /** For disambiguation: sends a follow-up message when user picks an option */
  onSendMessage?: (message: string) => void;
}

/**
 * Dispatcher component - renders the right visual card
 * based on the structured result type.
 *
 * Cards that don't have a dedicated component yet fall through
 * to null (the text content from GPT handles it).
 */
export function ToolResultCard({
  result,
  onRevert,
  onSendMessage,
}: ToolResultCardProps) {
  const { structured, revert, revertState } = result;

  switch (structured.type) {
    case "attendance_confirmation":
      return (
        <AttendanceConfirmationCard
          data={structured.data}
          revert={revert}
          revertState={revertState}
          onRevert={() => onRevert(result.tool_call_id)}
        />
      );

    case "attendance_summary":
      return <AttendanceSummaryCard data={structured.data} />;

    case "student_info":
      return <StudentInfoCard data={structured.data} />;

    case "class_list":
      return <ClassListCard data={structured.data} />;

    case "disambiguation":
      return (
        <DisambiguationCard
          data={structured.data}
          onSelect={(name) => onSendMessage?.(name)}
        />
      );

    case "absent_students":
      return <AbsentStudentsCard data={structured.data} />;

    case "medical_info":
      return <MedicalInfoCard data={structured.data} />;

    case "custody_alert":
      return <CustodyAlertCard data={structured.data} />;

    case "daily_summary":
      return <DailySummaryCard data={structured.data} />;

    // The remaining types use GenericListCard for now.
    // They still get visual rendering - just using the generic layout.

    case "student_list":
      return (
        <GenericListCard
          title={structured.data.class_name}
          subtitle={`${structured.data.students.length} students`}
          items={structured.data.students.map((s) => ({
            label: s.display_name,
            badge: {
              text: s.enrollment_status,
              bg: "color-mix(in srgb, var(--attendance-present) 12%, transparent)",
              color: "var(--attendance-present-fg)",
            },
          }))}
        />
      );

    case "attendance_history":
      return (
        <GenericListCard
          title={`Attendance - ${structured.data.student_name}`}
          subtitle={`${structured.data.summary.total_days} days`}
          items={structured.data.entries.slice(0, 10).map((e) => ({
            label: e.date_display,
            sublabel: e.notes ?? undefined,
            badge: {
              text:
                e.status === "half_day"
                  ? "Half Day"
                  : e.status.charAt(0).toUpperCase() + e.status.slice(1),
              bg:
                e.status === "present"
                  ? "color-mix(in srgb, var(--attendance-present) 12%, transparent)"
                  : e.status === "absent"
                    ? "color-mix(in srgb, var(--attendance-absent) 12%, transparent)"
                    : e.status === "late"
                      ? "color-mix(in srgb, var(--attendance-late) 12%, transparent)"
                      : "color-mix(in srgb, var(--attendance-excused) 12%, transparent)",
              color:
                e.status === "present"
                  ? "var(--attendance-present-fg)"
                  : e.status === "absent"
                    ? "var(--attendance-absent-fg)"
                    : e.status === "late"
                      ? "var(--attendance-late-fg)"
                      : "var(--attendance-excused-fg)",
            },
          }))}
        />
      );

    case "observation_list":
      return (
        <GenericListCard
          title={`Observations - ${structured.data.student_name}`}
          subtitle={`${structured.data.total_count} total`}
          items={structured.data.observations.map((o) => ({
            label: o.content_preview || "(No content)",
            sublabel: `${new Date(o.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} by ${o.author_name}`,
            badge: {
              text: o.status.charAt(0).toUpperCase() + o.status.slice(1),
              bg:
                o.status === "published"
                  ? "color-mix(in srgb, var(--attendance-present) 12%, transparent)"
                  : "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
              color:
                o.status === "published"
                  ? "var(--attendance-present-fg)"
                  : "var(--muted-foreground)",
            },
          }))}
        />
      );

    case "mastery_summary": {
      const s = structured.data.summary;
      const total = structured.data.total_outcomes;
      return (
        <GenericListCard
          title={`Mastery - ${structured.data.student_name}`}
          subtitle={`${total} outcomes`}
          items={[
            {
              label: "Mastered",
              badge: {
                text: `${s.mastered}`,
                bg: "color-mix(in srgb, var(--mastery-mastered) 12%, transparent)",
                color: "var(--mastery-mastered-fg)",
              },
            },
            {
              label: "Practicing",
              badge: {
                text: `${s.practicing}`,
                bg: "color-mix(in srgb, var(--mastery-practicing) 12%, transparent)",
                color: "var(--mastery-practicing-fg)",
              },
            },
            {
              label: "Presented",
              badge: {
                text: `${s.presented}`,
                bg: "color-mix(in srgb, var(--mastery-presented) 12%, transparent)",
                color: "var(--mastery-presented-fg)",
              },
            },
            {
              label: "Not Started",
              badge: {
                text: `${s.not_started}`,
                bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                color: "var(--muted-foreground)",
              },
            },
          ]}
        />
      );
    }

    case "emergency_contacts":
      return (
        <GenericListCard
          title={`Emergency Contacts - ${structured.data.student_name}`}
          subtitle={`${structured.data.contacts.length} contacts`}
          items={structured.data.contacts.map((c) => ({
            label: `${c.name} (${c.relationship})`,
            sublabel:
              c.phone_primary +
              (c.phone_secondary ? `, alt: ${c.phone_secondary}` : ""),
            badge: {
              text: `#${c.priority_order}`,
              bg: "color-mix(in srgb, var(--wattle-gold) 10%, transparent)",
              color: "var(--wattle-brown)",
            },
          }))}
        />
      );

    case "announcement_list":
      return (
        <GenericListCard
          title="Recent Announcements"
          subtitle={`${structured.data.announcements.length}`}
          items={structured.data.announcements.map((a) => ({
            label: a.title,
            sublabel: `${new Date(a.published_at ?? "").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} by ${a.author_name}`,
            badge:
              a.priority === "urgent" || a.priority === "high"
                ? {
                    text: a.priority.toUpperCase(),
                    bg: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                    color: "var(--destructive)",
                  }
                : undefined,
          }))}
        />
      );

    case "event_list":
      return (
        <GenericListCard
          title="Upcoming Events"
          subtitle={`${structured.data.events.length}`}
          items={structured.data.events.map((e) => ({
            label: e.title,
            sublabel: `${new Date(e.starts_at).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}${e.location ? ` @ ${e.location}` : ""}`,
          }))}
        />
      );

    case "program_session_status":
      return (
        <GenericListCard
          title={structured.data.program_name}
          subtitle={structured.data.session_time}
          items={[
            {
              label: "Booked",
              badge: {
                text: `${structured.data.booked}`,
                bg: "color-mix(in srgb, var(--info) 12%, transparent)",
                color: "var(--info)",
              },
            },
            {
              label: "Checked In",
              badge: {
                text: `${structured.data.checked_in}`,
                bg: "color-mix(in srgb, var(--attendance-present) 12%, transparent)",
                color: "var(--attendance-present-fg)",
              },
            },
            {
              label: "Checked Out",
              badge: {
                text: `${structured.data.checked_out}`,
                bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                color: "var(--muted-foreground)",
              },
            },
            ...(structured.data.no_shows > 0
              ? [
                  {
                    label: "No Shows",
                    badge: {
                      text: `${structured.data.no_shows}`,
                      bg: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                      color: "var(--destructive)",
                    },
                  },
                ]
              : []),
          ]}
        />
      );

    case "timesheet_status": {
      const ts = structured.data;
      return (
        <GenericListCard
          title={ts.period_name}
          subtitle={
            ts.status === "no_timesheet"
              ? "Not started"
              : ts.status.charAt(0).toUpperCase() + ts.status.slice(1)
          }
          items={[
            {
              label: "Total Hours",
              badge: {
                text: `${ts.total_hours}h`,
                bg: "color-mix(in srgb, var(--wattle-gold) 10%, transparent)",
                color: "var(--wattle-brown)",
              },
            },
            {
              label: "Regular",
              badge: {
                text: `${ts.regular_hours}h`,
                bg: "color-mix(in srgb, var(--attendance-present) 12%, transparent)",
                color: "var(--attendance-present-fg)",
              },
            },
            ...(ts.overtime_hours > 0
              ? [
                  {
                    label: "Overtime",
                    badge: {
                      text: `${ts.overtime_hours}h`,
                      bg: "color-mix(in srgb, var(--attendance-late) 12%, transparent)",
                      color: "var(--attendance-late-fg)",
                    },
                  },
                ]
              : []),
            ...(ts.leave_hours > 0
              ? [
                  {
                    label: "Leave",
                    badge: {
                      text: `${ts.leave_hours}h`,
                      bg: "color-mix(in srgb, var(--info) 12%, transparent)",
                      color: "var(--info)",
                    },
                  },
                ]
              : []),
            {
              label: "Entries",
              badge: {
                text: `${ts.entries_count}`,
                bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                color: "var(--muted-foreground)",
              },
            },
          ]}
        />
      );
    }

    // Write tool confirmations
    case "bulk_attendance_confirmation":
      return (
        <BulkAttendanceCard
          data={structured.data}
          revert={revert}
          revertState={revertState}
          onRevert={() => onRevert(result.tool_call_id)}
        />
      );

    case "checkin_confirmation":
      return (
        <CheckinConfirmationCard
          data={structured.data}
          revert={revert}
          revertState={revertState}
          onRevert={() => onRevert(result.tool_call_id)}
        />
      );

    case "checkout_confirmation":
      return (
        <CheckoutConfirmationCard
          data={structured.data}
          revert={revert}
          revertState={revertState}
          onRevert={() => onRevert(result.tool_call_id)}
        />
      );

    case "time_entry_confirmation":
      return (
        <TimeEntryCard
          data={structured.data}
          revert={revert}
          revertState={revertState}
          onRevert={() => onRevert(result.tool_call_id)}
        />
      );

    default:
      return null;
  }
}
