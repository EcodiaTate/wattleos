"use client";

import {
  archiveObservation,
  deleteObservation,
  publishObservation,
} from "@/lib/actions/observations";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
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
    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
      {status === "draft" && canPublish && (
        <GlowTarget id="obs-btn-detail-publish" category="button" label="Publish">
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="rounded-lg bg-[var(--mastery-mastered)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-success disabled:opacity-50"
        >
          Publish
        </button>
        </GlowTarget>
      )}

      {status === "published" && canPublish && (
        <GlowTarget id="obs-btn-detail-archive" category="button" label="Archive">
        <button
          onClick={handleArchive}
          disabled={isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
        >
          Archive
        </button>
        </GlowTarget>
      )}

      {status === "draft" && isAuthor && (
        <GlowTarget id="obs-btn-detail-edit" category="button" label="Edit">
        <button
          onClick={() =>
            router.push(`/pedagogy/observations/${observationId}/edit`)
          }
          disabled={isPending}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-50"
        >
          Edit
        </button>
        </GlowTarget>
      )}

      <button
        onClick={() => router.push("/pedagogy/observations")}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to Feed
      </button>

      {status === "draft" && isAuthor && (
        <GlowTarget id="obs-btn-detail-delete" category="button" label="Delete draft">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="ml-auto text-sm font-medium text-destructive hover:text-destructive disabled:opacity-50"
        >
          Delete Draft
        </button>
        </GlowTarget>
      )}
    </div>
  );
}
