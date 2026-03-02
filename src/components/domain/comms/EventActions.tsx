// src/components/domain/comms/EventActions.tsx
//
// WHY client component: Delete requires confirmation UI state.

"use client";

import { deleteEvent } from "@/lib/actions/comms/school-events";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface EventActionsProps {
  eventId: string;
}

export function EventActions({ eventId }: EventActionsProps) {
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
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end">
        {!showDeleteConfirm ? (
          <GlowTarget id="comms-btn-event-delete" category="button" label="Delete event">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Delete Event
            </button>
          </GlowTarget>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete this event?</span>
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
  );
}
