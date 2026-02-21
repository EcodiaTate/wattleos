// src/components/domain/comms/EventActions.tsx
//
// WHY client component: Delete requires confirmation UI state.

"use client";

import { deleteEvent } from "@/lib/actions/comms/school-events";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface EventActionsProps {
  eventId: string;
  tenantSlug: string;
}

export function EventActions({ eventId, tenantSlug }: EventActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEvent(eventId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.push(`/comms/events`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end">
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete Event
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Delete this event?</span>
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
  );
}
