// src/components/domain/programs/session-action-buttons.tsx
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
    <div className="flex items-center gap-[var(--density-sm)]">
      {error && <span className="text-xs text-destructive font-medium">{error}</span>}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-destructive/20 px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-destructive hover:bg-destructive/5 transition-[var(--transition-base)]"
        >
          Cancel Session
        </button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">Cancel this session?</span>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg bg-destructive px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-bold text-destructive-foreground hover:opacity-90 transition-[var(--transition-base)] shadow-sm disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-lg border border-border px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-sm font-medium text-muted-foreground hover:bg-muted transition-[var(--transition-base)]"
          >
            No
          </button>
        </>
      )}
    </div>
  );
} 