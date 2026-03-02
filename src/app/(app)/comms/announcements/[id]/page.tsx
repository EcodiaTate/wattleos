// src/app/(app)/comms/announcements/[id]/page.tsx
//
// WHY server component for the page: The detail page loads the
// announcement data and ack stats on the server. Interactive
// actions (publish, delete) are in a small client component.

import { AcknowledgementTracker } from "@/components/domain/comms/AcknowledgementTracker";
import { AnnouncementActions } from "@/components/domain/comms/AnnouncementActions";
import {
  getAcknowledgementStats,
  getAnnouncement,
} from "@/lib/actions/comms/announcements";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Announcement Detail - WattleOS" };

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-primary/15 text-primary",
  normal: "bg-muted text-muted-foreground",
  low: "bg-info/15 text-info",
};

export default async function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  const { id } = await params;

  const result = await getAnnouncement(id);
  if (result.error || !result.data) {
    notFound();
  }
  const announcement = result.data;

  // Load ack stats if applicable
  let ackStats: {
    total_acknowledged: number;
    acknowledgers: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      acknowledged_at: string;
    }>;
  } | null = null;
  if (announcement.requires_acknowledgement) {
    const ackResult = await getAcknowledgementStats(id);
    if (ackResult.data) {
      ackStats = ackResult.data;
    }
  }

  const isDraft = !announcement.published_at;
  const isScheduled =
    !announcement.published_at && !!announcement.scheduled_for;
  const isExpired =
    announcement.expires_at && new Date(announcement.expires_at) < new Date();

  const publishedDate = announcement.published_at
    ? new Date(announcement.published_at).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href={`/comms/announcements`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Back to Announcements
      </Link>

      {/* ── Announcement Content ──────────────────────── */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-6 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_STYLES[announcement.priority] ?? PRIORITY_STYLES.normal}`}
            >
              {announcement.priority.charAt(0).toUpperCase() +
                announcement.priority.slice(1)}{" "}
              Priority
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {announcement.scope === "school"
                ? "School-wide"
                : announcement.scope === "class"
                  ? `Class: ${announcement.target_class?.name ?? "Unknown"}`
                  : "Program"}
            </span>
            {isDraft && !isScheduled && (
              <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
                Draft
              </span>
            )}
            {isScheduled && (
              <span className="rounded-full bg-info/15 px-3 py-1 text-xs font-medium text-info">
                Scheduled
              </span>
            )}
            {isExpired && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Expired
              </span>
            )}
            {announcement.pin_to_top && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                Pinned
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground">
            {announcement.title}
          </h2>

          {/* Author + Date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
              {announcement.author.first_name?.[0]}
              {announcement.author.last_name?.[0]}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {announcement.author.first_name} {announcement.author.last_name}
              </p>
              {publishedDate && (
                <p className="text-xs text-muted-foreground">
                  Published {publishedDate}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="prose prose-sm max-w-none pt-2 text-foreground">
            {announcement.body.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {/* Attachments */}
          {announcement.attachment_urls.length > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-foreground">Attachments</h4>
              <div className="mt-2 space-y-2">
                {announcement.attachment_urls.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <svg
                      className="h-4 w-4 text-muted-foreground"
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
                    {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Scheduling info */}
          {isScheduled && announcement.scheduled_for && (
            <div className="rounded-lg bg-info/10 p-3 text-sm text-info">
              Scheduled to publish on{" "}
              {new Date(announcement.scheduled_for).toLocaleDateString(
                "en-AU",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                },
              )}
            </div>
          )}

          {announcement.expires_at && !isExpired && (
            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Expires on{" "}
              {new Date(announcement.expires_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        {/* ── Staff Actions ───────────────────────────── */}
        <div className="border-t border-border px-6 py-4">
          <AnnouncementActions
            announcementId={announcement.id}
            isDraft={isDraft}
          />
        </div>
      </div>

      {/* ── Acknowledgement Tracker ───────────────────── */}
      {announcement.requires_acknowledgement && ackStats && (
        <AcknowledgementTracker stats={ackStats} />
      )}
    </div>
  );
}
