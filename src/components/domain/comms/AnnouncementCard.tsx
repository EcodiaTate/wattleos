// src/components/domain/comms/AnnouncementCard.tsx
//
// WHY server component: Announcement cards are read-only display.
// No interactivity needed at the card level - clicking navigates
// to the detail page where actions live.

import type { AnnouncementWithDetails } from "@/lib/actions/comms/announcements";
import Link from "next/link";

interface AnnouncementCardProps {
  announcement: AnnouncementWithDetails;
}

// Maps priority to design-system CSS variable tokens
type PriorityStyle = { bg: string; text: string; dot: string; label: string };
const PRIORITY_STYLES: Record<string, PriorityStyle> = {
  urgent: {
    bg: "var(--destructive)",
    text: "var(--destructive-foreground)",
    dot: "var(--destructive)",
    label: "Urgent",
  },
  high: {
    bg: "var(--medical-severe)",
    text: "var(--medical-severe-fg)",
    dot: "var(--medical-severe)",
    label: "High",
  },
  normal: {
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
    dot: "var(--muted-foreground)",
    label: "Normal",
  },
  low: {
    bg: "var(--info)",
    text: "var(--info-foreground)",
    dot: "var(--info)",
    label: "Low",
  },
};

const SCOPE_LABELS: Record<string, string> = {
  school: "School-wide",
  class: "Class",
  program: "Program",
};

export function AnnouncementCard({
  announcement,
}: AnnouncementCardProps) {
  const priority =
    PRIORITY_STYLES[announcement.priority] ?? PRIORITY_STYLES.normal;
  const isDraft = !announcement.published_at;
  const isScheduled =
    !announcement.published_at && !!announcement.scheduled_for;
  const isExpired =
    announcement.expires_at && new Date(announcement.expires_at) < new Date();

  const publishedDate = announcement.published_at
    ? new Date(announcement.published_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const scheduledDate = announcement.scheduled_for
    ? new Date(announcement.scheduled_for).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Link
      href={`/comms/announcements/${announcement.id}`}
      className="card-interactive block rounded-[var(--radius)] border"
      style={{
        borderColor: announcement.priority === "urgent"
          ? "var(--destructive)"
          : "var(--border)",
        background: announcement.priority === "urgent"
          ? "hsl(from var(--destructive) h s l / 0.05)"
          : "var(--card)",
      }}
    >
      <div className="p-5">
        {/* ── Top row: badges ─────────────────────────── */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Priority badge */}
          <span
            className="status-badge"
            style={{
              "--badge-bg": priority.bg,
              "--badge-fg": priority.text,
            } as React.CSSProperties}
          >
            {priority.label}
          </span>

          {/* Scope badge */}
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
          >
            {SCOPE_LABELS[announcement.scope] ?? announcement.scope}
            {announcement.target_class && (
              <span className="ml-1 opacity-60">
                · {announcement.target_class.name}
              </span>
            )}
          </span>

          {/* Pinned */}
          {announcement.pin_to_top && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--primary-100)", color: "var(--primary-700)" }}
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.795-2.168C3.747 12.218 2 9.766 2 6.998 2 4.233 4.018 2 6.5 2c1.397 0 2.673.671 3.5 1.752C10.827 2.671 12.103 2 13.5 2 15.982 2 18 4.233 18 6.998c0 2.768-1.747 5.22-3.672 7.054a22.044 22.044 0 01-3.957 2.85l-.019.01-.005.003h-.002a.723.723 0 01-.692 0l-.003-.002z" />
              </svg>
              Pinned
            </span>
          )}

          {isDraft && !isScheduled && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--observation-draft)", color: "var(--observation-draft-fg)" }}
            >
              Draft
            </span>
          )}

          {isScheduled && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--enrollment-inquiry)", color: "var(--enrollment-inquiry-fg)" }}
            >
              Scheduled · {scheduledDate}
            </span>
          )}

          {isExpired && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              Expired
            </span>
          )}

          {announcement.requires_acknowledgement && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--success)", color: "var(--success-foreground)" }}
            >
              Requires Ack · {announcement.acknowledgement_count}
            </span>
          )}
        </div>

        {/* ── Title + Body Preview ────────────────────── */}
        <h3 className="text-base font-semibold text-foreground">
          {announcement.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {announcement.body}
        </p>

        {/* ── Footer: author + date ───────────────────── */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "var(--primary-100)", color: "var(--primary-700)" }}
            >
              {announcement.author.first_name?.[0]}
              {announcement.author.last_name?.[0]}
            </div>
            <span>
              {announcement.author.first_name} {announcement.author.last_name}
            </span>
          </div>

          {publishedDate && <time>{publishedDate}</time>}
        </div>

        {/* ── Attachments indicator ───────────────────── */}
        {announcement.attachment_urls.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
              />
            </svg>
            {announcement.attachment_urls.length} attachment
            {announcement.attachment_urls.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
