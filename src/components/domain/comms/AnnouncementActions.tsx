// src/components/domain/comms/AnnouncementActions.tsx
//
// WHY client component: The publish/delete buttons trigger
// server actions with optimistic UI feedback.

"use client";

import {
  deleteAnnouncement,
  publishAnnouncement,
} from "@/lib/actions/comms/announcements";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface AnnouncementActionsProps {
  announcementId: string;
  isDraft: boolean;
}

export function AnnouncementActions({
  announcementId,
  isDraft,
}: AnnouncementActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishAnnouncement(announcementId);
      if (result.error) {
        setError(result.error?.message ?? null);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAnnouncement(announcementId);
      if (result.error) {
        setError(result.error?.message ?? null);
        return;
      }
      router.push(`/comms/announcements`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlowTarget id="comms-btn-ann-edit" category="button" label="Edit">
            <a
              href={`/comms/announcements/new?edit=${announcementId}`}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Edit
            </a>
          </GlowTarget>
          {isDraft && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary disabled:opacity-50"
            >
              {isPending ? "Publishing..." : "Publish Now"}
            </button>
          )}
        </div>

        <div>
          {!showDeleteConfirm ? (
            <GlowTarget id="comms-btn-ann-delete" category="button" label="Delete">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            </GlowTarget>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Are you sure?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-background hover:bg-destructive disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
