"use client";

import {
  archiveObservation,
  deleteObservation,
  publishObservation,
} from "@/lib/actions/observations";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface ObservationDetailActionsProps {
  observationId: string;
  status: string;
  isAuthor: boolean;
  canPublish: boolean;
}

export function ObservationDetailActions({
  observationId,
  status,
  isAuthor,
  canPublish,
}: ObservationDetailActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handlePublish() {
    await publishObservation(observationId);
    startTransition(() => router.refresh());
  }

  async function handleArchive() {
    await archiveObservation(observationId);
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!confirm("Delete this draft observation? This cannot be undone."))
      return;
    await deleteObservation(observationId);
    router.push("/pedagogy/observations");
    router.refresh();
  }

  return (
    <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
      {status === "draft" && canPublish && (
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="rounded-lg bg-[var(--mastery-mastered)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          Publish
        </button>
      )}

      {status === "published" && canPublish && (
        <button
          onClick={handleArchive}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
        >
          Archive
        </button>
      )}

      {status === "draft" && isAuthor && (
        <button
          onClick={() =>
            router.push(`/pedagogy/observations/${observationId}/edit`)
          }
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
        >
          Edit
        </button>
      )}

      <button
        onClick={() => router.push("/pedagogy/observations")}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to Feed
      </button>

      {status === "draft" && isAuthor && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="ml-auto text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          Delete Draft
        </button>
      )}
    </div>
  );
}
