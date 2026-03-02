// src/app/(app)/admin/enrollment/invitations/invitation-actions.tsx
//
// ============================================================
// WattleOS V2 - Invitation Actions (Module 10)
// ============================================================
// 'use client' - Resend (extends expiry) and Revoke actions
// for parent invitations.
//
// NOTE: These update the database directly since no dedicated
// server actions exist for invitation management yet. When you
// build those, refactor to use them instead.
// ============================================================

"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface InvitationActionsProps {
  invitationId: string;
  currentStatus: string;
  expiresAt: string | null;
}

export function InvitationActions({
  invitationId,
  currentStatus,
  expiresAt,
}: InvitationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const isExpired =
    currentStatus === "pending" &&
    expiresAt &&
    new Date(expiresAt) < new Date();
  const canResend = currentStatus === "pending" || isExpired;
  const canRevoke = currentStatus === "pending" && !isExpired;

  async function handleResend() {
    const supabase = createSupabaseBrowserClient();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 14);

    await supabase
      .from("parent_invitations")
      .update({
        expires_at: newExpiry.toISOString(),
        status: "pending",
      })
      .eq("id", invitationId);

    setConfirmAction(null);
    router.refresh();
  }

  async function handleRevoke() {
    const supabase = createSupabaseBrowserClient();

    await supabase
      .from("parent_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    setConfirmAction(null);
    router.refresh();
  }

  // Already accepted or revoked - no actions
  if (currentStatus === "accepted" || currentStatus === "revoked") {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Confirmation */}
      {confirmAction && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {confirmAction === "revoke" ? "Revoke?" : "Resend?"}
          </span>
          <button
            onClick={() =>
              startTransition(() =>
                confirmAction === "revoke" ? handleRevoke() : handleResend(),
              )
            }
            disabled={isPending}
            className="rounded bg-primary px-2 py-1 text-xs font-medium text-background hover:bg-primary disabled:opacity-50"
          >
            {isPending ? "…" : "Yes"}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            disabled={isPending}
            className="rounded bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-border"
          >
            No
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!confirmAction && (
        <>
          {canResend && (
            <button
              onClick={() => setConfirmAction("resend")}
              disabled={isPending}
              className="rounded bg-info/15 px-2.5 py-1 text-xs font-medium text-info hover:bg-info/20 disabled:opacity-50"
            >
              {isExpired ? "Re-send" : "Resend"}
            </button>
          )}
          {canRevoke && (
            <button
              onClick={() => setConfirmAction("revoke")}
              disabled={isPending}
              className="rounded bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              Revoke
            </button>
          )}
        </>
      )}
    </div>
  );
}
