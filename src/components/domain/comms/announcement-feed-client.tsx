// src/components/domain/comms/announcement-feed-client.tsx
//
// ============================================================
// WattleOS V2 - Announcement Feed (Client Component)
// ============================================================
// Handles:
// • Create announcement form (title, content, priority, target)
// • Announcement feed with read counts
// • Pin/unpin, edit, delete actions
// ============================================================

"use client";

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/actions/comms/announcements";
import type {
  AnnouncementPriority,
  AnnouncementTargetType,
} from "@/lib/constants/communications";
import { ANNOUNCEMENT_PRIORITY_CONFIG } from "@/lib/constants/communications";
import type { AnnouncementWithAuthor, ClassWithCounts } from "@/types/domain";
import { useState } from "react";

interface AnnouncementFeedClientProps {
  initialAnnouncements: AnnouncementWithAuthor[];
  classes: ClassWithCounts[];
}

export function AnnouncementFeedClient({
  initialAnnouncements,
  classes,
}: AnnouncementFeedClientProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [targetType, setTargetType] =
    useState<AnnouncementTargetType>("school_wide");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);

  async function handleCreate() {
    setError(null);
    setIsSubmitting(true);

    const result = await createAnnouncement({
      title,
      content,
      priority,
      target_type: targetType,
      target_class_id: targetType === "class" ? targetClassId : null,
      is_pinned: isPinned,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Refresh the list
    const refreshed = await listAnnouncements({ limit: 50 });
    if (refreshed.data) setAnnouncements(refreshed.data);

    // Reset form
    setTitle("");
    setContent("");
    setPriority("normal");
    setTargetType("school_wide");
    setTargetClassId("");
    setIsPinned(false);
    setShowCreateForm(false);
  }

  async function handleTogglePin(
    announcementId: string,
    currentlyPinned: boolean,
  ) {
    const result = await updateAnnouncement(announcementId, {
      is_pinned: !currentlyPinned,
    });
    if (result.data) {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, is_pinned: !currentlyPinned } : a,
        ),
      );
    }
  }

  async function handleDelete(announcementId: string) {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;

    const result = await deleteAnnouncement(announcementId);
    if (result.data) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    }
  }

  return (
    <div className="space-y-6">
      {/* Create button / form */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-amber-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Announcement
        </button>
      ) : (
        <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            New Announcement
          </h2>

          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., School Closure Tomorrow"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Write your announcement..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Priority + Target row */}
            <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as AnnouncementPriority)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Audience
                </label>
                <select
                  value={targetType}
                  onChange={(e) =>
                    setTargetType(e.target.value as AnnouncementTargetType)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="school_wide">Entire School</option>
                  <option value="class">Specific Class</option>
                </select>
              </div>

              {targetType === "class" && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Class
                  </label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.active_enrollment_count} students)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Pin toggle */}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              Pin this announcement (stays at top of feed)
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Publishing..." : "Publish Announcement"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Feed */}
      {announcements.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No announcements yet. Create the first one to share news with your
            school community.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const config = ANNOUNCEMENT_PRIORITY_CONFIG[announcement.priority];
            const timeAgo = formatRelativeTime(announcement.published_at);

            return (
              <div
                key={announcement.id}
                className={`rounded-lg border bg-background shadow-sm ${
                  announcement.is_pinned
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-border"
                }`}
              >
                <div className="p-[var(--density-card-padding)]">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-[var(--density-card-padding)]">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {announcement.is_pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            📌 Pinned
                          </span>
                        )}
                        {announcement.priority === "urgent" && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgColor} ${config.color}`}
                          >
                            {config.icon} {config.label}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {announcement.target_type === "school_wide"
                            ? "🏫 School-wide"
                            : `📚 ${announcement.target_class?.name ?? "Class"}`}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {announcement.title}
                      </h3>
                    </div>

                    {/* Actions dropdown */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleTogglePin(
                            announcement.id,
                            announcement.is_pinned,
                          )
                        }
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                        title={announcement.is_pinned ? "Unpin" : "Pin"}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={
                            announcement.is_pinned ? "currentColor" : "none"
                          }
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                    {announcement.content}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        By {announcement.author.first_name}{" "}
                        {announcement.author.last_name}
                      </span>
                      <span>·</span>
                      <span>{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-1">
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
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                      <span>{announcement.read_count ?? 0} read</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
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
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
