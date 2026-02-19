// src/components/domain/observations/observation-card.tsx
//
// ============================================================
// WattleOS V2 - Observation Card (Feed Item)
// ============================================================
// Client component displayed in the observation feed. Shows
// author, content, media thumbnails, student tags, outcome tags,
// and action buttons (publish/archive/delete).
//
// CHANGES from previous version:
// - Replaced inline media thumbnail rendering with MediaGallery
// - Uses flat .students / .outcomes / .media (Batch 1 type fix)
// ============================================================

"use client";

import {
  archiveObservation,
  deleteObservation,
  publishObservation,
} from "@/lib/actions/observations";
import type { ObservationFeedItem } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MediaGallery } from "./media-gallery";

interface ObservationCardProps {
  observation: ObservationFeedItem;
  currentUserId: string;
  canPublish: boolean;
}

export function ObservationCard({
  observation,
  currentUserId,
  canPublish,
}: ObservationCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isAuthor = observation.author.id === currentUserId;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handlePublish() {
    await publishObservation(observation.id);
    refresh();
  }

  async function handleArchive() {
    await archiveObservation(observation.id);
    refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this draft observation?")) return;
    await deleteObservation(observation.id);
    refresh();
  }

  const authorName =
    [observation.author.first_name, observation.author.last_name]
      .filter(Boolean)
      .join(" ") || "Unknown";

  const timeAgo = formatTimeAgo(observation.created_at);

  return (
    <div
      className={`rounded-lg border bg-background transition-shadow hover:shadow-sm ${
        observation.status === "draft" ? "border-amber-200" : "border-border"
      }`}
    >
      <div className="p-[var(--density-card-padding)]">
        {/* Header row */}
        <div className="flex items-start justify-between gap-[var(--density-card-padding)]">
          <div className="flex items-center gap-3">
            {/* Author avatar */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-muted-foreground">
              {observation.author.avatar_url ? (
                <img
                  src={observation.author.avatar_url}
                  alt={authorName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                authorName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {authorName}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge status={observation.status} />
        </div>

        {/* Content */}
        {observation.content && (
          <div className="mt-3">
            <p className="whitespace-pre-wrap text-sm text-foreground line-clamp-[var(--density-card-padding)]">
              {observation.content}
            </p>
          </div>
        )}

        {/* Media thumbnails - now uses MediaGallery with lightbox */}
        {observation.media.length > 0 && (
          <MediaGallery media={observation.media} variant="compact" />
        )}

        {/* Student tags */}
        {observation.students.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {observation.students.map((student) => (
              <span
                key={student.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                )}
                {student.first_name} {student.last_name}
              </span>
            ))}
          </div>
        )}

        {/* Outcome tags */}
        {observation.outcomes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {observation.outcomes.map((outcome) => (
              <span
                key={outcome.id}
                className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                {outcome.title}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
          <Link
            href={`/pedagogy/observations/${observation.id}`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View Details
          </Link>

          {observation.status === "draft" && canPublish && (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="rounded-md bg-[var(--mastery-mastered)] px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-green-700 disabled:opacity-50"
            >
              Publish
            </button>
          )}

          {observation.status === "published" && canPublish && (
            <button
              onClick={handleArchive}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-background disabled:opacity-50"
            >
              Archive
            </button>
          )}

          {observation.status === "draft" && isAuthor && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="ml-auto text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700",
    published: "bg-green-100 text-green-700",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? styles.draft
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
