// src/components/domain/comms/AnnouncementActions.tsx
//
// WHY client component: The publish/delete buttons trigger
// server actions with optimistic UI feedback.

"use client";

import {
  deleteAnnouncement,
  publishAnnouncement,
} from "@/lib/actions/comms/announcements";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface AnnouncementActionsProps {
  announcementId: string;
  isDraft: boolean;
  tenantSlug: string;
}

export function AnnouncementActions({
  announcementId,
  isDraft,
  tenantSlug,
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
        setError(result.error);
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
        setError(result.error);
        return;
      }
      router.push(`/comms/announcements`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a
            href={`/comms/announcements/new?edit=${announcementId}`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </a>
          {isDraft && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "Publishing..." : "Publish Now"}
            </button>
          )}
        </div>

        <div>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Are you sure?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
