// src/components/domain/programs/program-delete-button.tsx
"use client";

import { deleteProgram } from "@/lib/actions/programs/programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ProgramDeleteButtonProps {
  programId: string;
  programName: string;
}

export function ProgramDeleteButton({
  programId,
  programName,
}: ProgramDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const result = await deleteProgram(programId);

    if (result.error) {
      setError(result.error.message);
      setDeleting(false);
      return;
    }

    router.push("/programs");
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-destructive/20 px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-destructive hover:bg-destructive/5 transition-[var(--transition-base)]"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-[var(--density-sm)]">
      {error && <span className="text-sm text-destructive">{error}</span>}
      <span className="text-sm text-muted-foreground">Delete "{programName}"?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg bg-destructive px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-destructive-foreground hover:opacity-90 transition-[var(--transition-base)] disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={deleting}
        className="rounded-lg border border-border px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-muted-foreground hover:bg-muted transition-[var(--transition-base)]"
      >
        Cancel
      </button>
    </div>
  );
}