// src/components/domain/comms/parent-announcement-feed.tsx
//
// ============================================================
// WattleOS V2 - Parent Announcement Feed (Client Component)
// ============================================================
// Read-only announcement display for parents. Marks
// announcements as read when they come into view.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { markAnnouncementRead } from '@/lib/actions/announcements';
import type { AnnouncementWithAuthor } from '@/types/domain';
import { ANNOUNCEMENT_PRIORITY_CONFIG } from '@/lib/constants/communications';

interface ParentAnnouncementFeedProps {
  initialAnnouncements: AnnouncementWithAuthor[];
}

export function ParentAnnouncementFeed({
  initialAnnouncements,
}: ParentAnnouncementFeedProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());

  // Mark unread announcements as read on mount
  useEffect(() => {
    const unread = announcements.filter((a) => !a.is_read && !markedIds.has(a.id));
    for (const announcement of unread) {
      markAnnouncementRead(announcement.id);
      setMarkedIds((prev) => new Set([...prev, announcement.id]));
    }
  }, [announcements, markedIds]);

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          No announcements from your school yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const config = ANNOUNCEMENT_PRIORITY_CONFIG[announcement.priority];
        const isUnread = !announcement.is_read && !markedIds.has(announcement.id);

        return (
          <div
            key={announcement.id}
            className={`rounded-lg border bg-white shadow-sm ${
              announcement.is_pinned
                ? 'border-amber-300 ring-1 ring-amber-100'
                : isUnread
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-gray-200'
            }`}
          >
            <div className="p-5">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {announcement.is_pinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    📌 Pinned
                  </span>
                )}
                {announcement.priority === 'urgent' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgColor} ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                )}
                {announcement.target_type === 'class' && announcement.target_class && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    📚 {announcement.target_class.name}
                  </span>
                )}
                {isUnread && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                )}
              </div>

              {/* Title + content */}
              <h3 className="mt-2 text-base font-semibold text-gray-900">
                {announcement.title}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                {announcement.content}
              </p>

              {/* Footer */}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {announcement.author.first_name} {announcement.author.last_name}
                </span>
                <span>·</span>
                <span>{formatDate(announcement.published_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}