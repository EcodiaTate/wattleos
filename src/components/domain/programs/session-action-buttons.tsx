// src/components/domain/programs/session-action-buttons.tsx
//
// ============================================================
// WattleOS V2 - Session Action Buttons
// ============================================================
// Client component for session-level actions: cancel session.
// Shows a confirmation dialog before cancelling.
//
// WHY client: Needs interactive state for confirm dialog
// and loading state while the server action runs.
// ============================================================

"use client";

import { cancelSession } from "@/lib/actions/programs/programs";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SessionActionButtonsProps {
  sessionId: string;
  status: string;
  programId: string;
}

export function SessionActionButtons({
  sessionId,
  status,
  programId,
}: SessionActionButtonsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);

    const result = await cancelSession(sessionId, "Cancelled by admin");

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setConfirming(false);
    setLoading(false);
  }

  if (status === "cancelled" || status === "completed") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Cancel Session
        </button>
      ) : (
        <>
          <span className="text-sm text-gray-600">Cancel this session?</span>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            No
          </button>
        </>
      )}
    </div>
  );
}
