// src/components/domain/comms/parent-announcement-feed.tsx
//
// ============================================================
// WattleOS V2 - Parent Announcement Feed (Client Component)
// ============================================================
// Read-only announcement display for parents. Marks
// announcements as acknowledged when they come into view.
//
// WHY AnnouncementWithDetails: The parent feed needs
// is_acknowledged to track read state. The lighter
// AnnouncementWithAuthor type doesn't carry that field.
// getAnnouncementsForParent() returns AnnouncementWithDetails.
// ============================================================

"use client";

import { acknowledgeAnnouncement } from "@/lib/actions/comms/announcements";
import type {
  AnnouncementWithDetails,
  AnnouncementPriority,
} from "@/lib/actions/comms/announcements";
import type { Class } from "@/types/domain";
import { useEffect, useState } from "react";

// ============================================================
// Priority Display Config
// ============================================================
// WHY local: Avoids coupling to a shared constants file that
// may define a subset of priorities. All 4 levels are covered.
// ============================================================

const PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  low: {
    label: "Low",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "ℹ️",
  },
  normal: {
    label: "Normal",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: "📢",
  },
  high: {
    label: "High",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "⚠️",
  },
  urgent: {
    label: "Urgent",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "🚨",
  },
};

// ============================================================
// Component
// ============================================================

interface ParentAnnouncementFeedProps {
  initialAnnouncements: AnnouncementWithDetails[];
}

export function ParentAnnouncementFeed({
  initialAnnouncements,
}: ParentAnnouncementFeedProps) {
  const [announcements] = useState(initialAnnouncements);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(
    new Set(),
  );

  // Auto-acknowledge unacknowledged announcements on mount
  useEffect(() => {
    const unacknowledged = announcements.filter(
      (a) =>
        a.requires_acknowledgement &&
        !a.is_acknowledged &&
        !acknowledgedIds.has(a.id),
    );
    for (const announcement of unacknowledged) {
      acknowledgeAnnouncement(announcement.id);
      setAcknowledgedIds((prev) => new Set([...prev, announcement.id]));
    }
  }, [announcements, acknowledgedIds]);

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No announcements from your school yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const config = PRIORITY_CONFIG[announcement.priority];
        const isUnacknowledged =
          announcement.requires_acknowledgement &&
          !announcement.is_acknowledged &&
          !acknowledgedIds.has(announcement.id);

        return (
          <div
            key={announcement.id}
            className={`rounded-lg border bg-background shadow-sm ${
              announcement.pin_to_top
                ? "border-amber-300 ring-1 ring-amber-100"
                : isUnacknowledged
                  ? "border-amber-200 bg-amber-50/30"
                  : "border-border"
            }`}
          >
            <div className="p-[var(--density-card-padding)]">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {announcement.pin_to_top && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    📌 Pinned
                  </span>
                )}
                {(announcement.priority === "urgent" ||
                  announcement.priority === "high") && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgColor} ${config.color}`}
                  >
                    {config.icon} {config.label}
                  </span>
                )}
                {announcement.scope === "class" &&
                  announcement.target_class && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      📚 {announcement.target_class.name}
                    </span>
                  )}
                {isUnacknowledged && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                )}
              </div>

              {/* Title + body */}
              <h3 className="mt-2 text-base font-semibold text-foreground">
                {announcement.title}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                {announcement.body}
              </p>

              {/* Attachments */}
              {announcement.attachment_urls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {announcement.attachment_urls.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      📎 {attachment.name}
                    </a>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {announcement.author.first_name}{" "}
                  {announcement.author.last_name}
                </span>
                <span>·</span>
                <span>
                  {announcement.published_at
                    ? formatDate(announcement.published_at)
                    : "Draft"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Date Formatting Helper
// ============================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}