"use client";

import type { NewsletterStatus } from "@/types/domain";

interface NewsletterStatusPillProps {
  status: NewsletterStatus;
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<NewsletterStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  cancelled: "Cancelled",
};

const STATUS_TOKENS: Record<NewsletterStatus, { bg: string; fg: string }> = {
  draft: { bg: "var(--newsletter-draft)", fg: "var(--newsletter-draft-fg)" },
  scheduled: { bg: "var(--newsletter-scheduled)", fg: "var(--newsletter-scheduled-fg)" },
  sending: { bg: "var(--newsletter-sending)", fg: "var(--newsletter-sending-fg)" },
  sent: { bg: "var(--newsletter-sent)", fg: "var(--newsletter-sent-fg)" },
  cancelled: { bg: "var(--newsletter-cancelled)", fg: "var(--newsletter-cancelled-fg)" },
};

export function NewsletterStatusPill({ status, size = "sm" }: NewsletterStatusPillProps) {
  const tokens = STATUS_TOKENS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: tokens.bg, color: tokens.fg }}
    >
      {label}
    </span>
  );
}
