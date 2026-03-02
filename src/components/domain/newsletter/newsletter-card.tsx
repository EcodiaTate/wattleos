"use client";

import Link from "next/link";
import type { NewsletterWithDetails } from "@/types/domain";
import { NewsletterStatusPill } from "./newsletter-status-pill";

interface NewsletterCardProps {
  newsletter: NewsletterWithDetails;
  /** If true, links to the parent view instead of staff editor */
  parentView?: boolean;
}

const AUDIENCE_LABELS: Record<string, string> = {
  all_parents: "All Parents",
  all_staff: "All Staff",
  all_users: "Everyone",
  class: "Class",
  program: "Program",
};

export function NewsletterCard({
  newsletter,
  parentView,
}: NewsletterCardProps) {
  const href = parentView
    ? `/parent/newsletters/${newsletter.id}`
    : `/comms/newsletters/${newsletter.id}`;

  const audienceLabel =
    AUDIENCE_LABELS[newsletter.audience] ?? newsletter.audience;
  const openRate = newsletter.open_rate;

  const dateStr = newsletter.sent_at
    ? new Date(newsletter.sent_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : newsletter.scheduled_for
      ? `Scheduled: ${new Date(newsletter.scheduled_for).toLocaleDateString(
          "en-AU",
          {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}`
      : `Draft - ${new Date(newsletter.updated_at).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })}`;

  return (
    <Link
      href={href}
      className="card-interactive block rounded-lg border border-border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {newsletter.title}
          </h3>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {newsletter.subject_line}
          </p>
        </div>
        <NewsletterStatusPill status={newsletter.status} />
      </div>

      <div
        className="mt-3 flex items-center gap-4 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>{dateStr}</span>
        <span
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {audienceLabel}
          {newsletter.target_class ? ` - ${newsletter.target_class.name}` : ""}
        </span>
        {newsletter.status === "sent" && (
          <>
            <span>{newsletter.recipient_count} recipients</span>
            <span>{Math.round(openRate * 100)}% opened</span>
          </>
        )}
      </div>

      {newsletter.author && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          By {newsletter.author.first_name} {newsletter.author.last_name}
        </p>
      )}
    </Link>
  );
}
