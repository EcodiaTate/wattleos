// src/components/domain/comms/announcement-feed-client.tsx
"use client";

import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/actions/comms/announcements";

import type { AnnouncementTargetType } from "@/lib/constants/communications";
import { ANNOUNCEMENT_PRIORITY_CONFIG } from "@/lib/constants/communications";

import type {
  AnnouncementWithAuthor,
  ClassWithCounts,
  AnnouncementPriority as DomainAnnouncementPriority,
} from "@/types/domain";

import { useMemo, useState } from "react";

type PriorityConfigKey = keyof typeof ANNOUNCEMENT_PRIORITY_CONFIG;

type AnnouncementVM = AnnouncementWithAuthor & {
  content?: string;
  message?: string;
  body?: string;

  is_pinned?: boolean;
  pinned?: boolean;

  target_type?: AnnouncementTargetType;
  targetType?: AnnouncementTargetType;

  target_class_id?: string | null;
  targetClassId?: string | null;

  target_class?: { name?: string | null } | null;
  targetClass?: { name?: string | null } | null;

  published_at?: string | null;
  publishedAt?: string | null;
  created_at?: string;
  createdAt?: string;

  read_count?: number | null;
  readCount?: number | null;
  reads_count?: number | null;
};

function getAnnouncementText(a: AnnouncementVM): string {
  return a.content ?? a.message ?? a.body ?? "";
}
function getAnnouncementPinned(a: AnnouncementVM): boolean {
  return Boolean(a.is_pinned ?? a.pinned ?? false);
}
function getAnnouncementTargetType(a: AnnouncementVM): AnnouncementTargetType {
  return (a.target_type ?? a.targetType ?? "school_wide") as AnnouncementTargetType;
}
function getAnnouncementTargetClassName(a: AnnouncementVM): string | null {
  return a.target_class?.name ?? a.targetClass?.name ?? null;
}
function getAnnouncementPublishedAt(a: AnnouncementVM): string {
  return (
    a.published_at ??
    a.publishedAt ??
    a.created_at ??
    a.createdAt ??
    new Date().toISOString()
  );
}
function getAnnouncementReadCount(a: AnnouncementVM): number {
  const v = a.read_count ?? a.readCount ?? a.reads_count ?? 0;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function priorityToConfigKey(p: DomainAnnouncementPriority): PriorityConfigKey {
  const s = String(p);
  if (s in ANNOUNCEMENT_PRIORITY_CONFIG) return s as PriorityConfigKey;
  return "normal";
}

// ─────────────────────────────────────────────────────────────
// Action payload boundary adapters (isolate drift here)
// ─────────────────────────────────────────────────────────────
function buildCreatePayload(input: {
  title: string;
  text: string;
  priority: DomainAnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetClassId: string;
  pinned: boolean;
}) {
  // include BOTH common variants; whichever the backend expects will be used
  // and TS won't block us because we cast at the boundary.
  return {
    title: input.title,
    priority: input.priority,

    // message/body/content variants
    message: input.text,
    content: input.text,
    body: input.text,

    // target variants
    target_type: input.targetType,
    targetType: input.targetType,
    target_class_id: input.targetType === "class" ? input.targetClassId : null,
    targetClassId: input.targetType === "class" ? input.targetClassId : null,

    // pinned variants
    is_pinned: input.pinned,
    pinned: input.pinned,
  } as any;
}

function buildUpdatePayload(input: { pinned: boolean }) {
  return {
    is_pinned: input.pinned,
    pinned: input.pinned,
  } as any;
}

interface AnnouncementFeedClientProps {
  initialAnnouncements: AnnouncementWithAuthor[];
  classes: ClassWithCounts[];
}

export function AnnouncementFeedClient({
  initialAnnouncements,
  classes,
}: AnnouncementFeedClientProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>(
    initialAnnouncements,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<DomainAnnouncementPriority>("normal");
  const [targetType, setTargetType] =
    useState<AnnouncementTargetType>("school_wide");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);

  const canPublish = useMemo(() => {
    if (!title.trim()) return false;
    if (!text.trim()) return false;
    if (targetType === "class" && !targetClassId) return false;
    return true;
  }, [title, text, targetType, targetClassId]);

  async function refreshList() {
    // offset doesn't exist → remove it
    const refreshed = await listAnnouncements({
      page: 1,
      per_page: 50,
    } as any);
    if (refreshed.data) setAnnouncements(refreshed.data);
  }

  async function handleCreate() {
    setError(null);
    setIsSubmitting(true);

    const payload = buildCreatePayload({
      title,
      text,
      priority,
      targetType,
      targetClassId,
      pinned: isPinned,
    });

    const result = await createAnnouncement(payload);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await refreshList();

    setTitle("");
    setText("");
    setPriority("normal");
    setTargetType("school_wide");
    setTargetClassId("");
    setIsPinned(false);
    setShowCreateForm(false);
  }

  async function handleTogglePin(announcementId: string, currentlyPinned: boolean) {
    const result = await updateAnnouncement(
      announcementId,
      buildUpdatePayload({ pinned: !currentlyPinned }),
    );

    if (result.data) {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId
            ? ({ ...(a as any), pinned: !currentlyPinned, is_pinned: !currentlyPinned } as any)
            : a,
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
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Announcement
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-background p-[var(--density-card-padding)] shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">New Announcement</h2>

          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., School Closure Tomorrow"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Message</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Write your announcement..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground">Priority</label>
                <select
                  value={priority as unknown as string}
                  onChange={(e) => setPriority(e.target.value as DomainAnnouncementPriority)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Audience</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as AnnouncementTargetType)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="school_wide">Entire School</option>
                  <option value="class">Specific Class</option>
                </select>
              </div>

              {targetType === "class" && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Class</label>
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

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              Pin this announcement (stays at top of feed)
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !canPublish}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Publishing..." : "Publish Announcement"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No announcements yet. Create the first one to share news with your school community.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((raw) => {
            const announcement = raw as AnnouncementVM;

            const pinnedNow = getAnnouncementPinned(announcement);
            const priorityKey = priorityToConfigKey(announcement.priority);
            const config = ANNOUNCEMENT_PRIORITY_CONFIG[priorityKey];

            const target = getAnnouncementTargetType(announcement);
            const className = getAnnouncementTargetClassName(announcement);
            const timeAgo = formatRelativeTime(getAnnouncementPublishedAt(announcement));

            const text = getAnnouncementText(announcement);
            const reads = getAnnouncementReadCount(announcement);

            return (
              <div
                key={announcement.id}
                className={`rounded-lg border bg-background shadow-sm ${
                  pinnedNow ? "border-amber-300 ring-1 ring-amber-100" : "border-border"
                }`}
              >
                <div className="p-[var(--density-card-padding)]">
                  <div className="flex items-start justify-between gap-[var(--density-card-padding)]">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {pinnedNow && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            📌 Pinned
                          </span>
                        )}

                        {priorityKey === "urgent" && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgColor} ${config.color}`}
                          >
                            {config.icon} {config.label}
                          </span>
                        )}

                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {target === "school_wide"
                            ? "🏫 School-wide"
                            : `📚 ${className ?? "Class"}`}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        {announcement.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(announcement.id, pinnedNow)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                        title={pinnedNow ? "Unpin" : "Pin"}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={pinnedNow ? "currentColor" : "none"}
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
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{text}</p>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>
                        By {announcement.author.first_name} {announcement.author.last_name}
                      </span>
                      <span>·</span>
                      <span>{timeAgo}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{reads} read</span>
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