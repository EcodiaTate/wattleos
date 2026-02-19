// src/components/domain/programs/program-delete-button.tsx
//
// ============================================================
// WattleOS V2 - Program Delete Button
// ============================================================
// Client component that shows a delete button with a
// confirmation dialog. Calls the deleteProgram server action.
//
// WHY separate component: The delete button has client-side
// state (confirm dialog, loading). Keeping it isolated means
// the parent page stays as a server component.
// ============================================================

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
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-600">{error}</span>}
      <span className="text-sm text-gray-600">Delete "{programName}"?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={deleting}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
