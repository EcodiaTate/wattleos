"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  departExcursion,
  returnExcursion,
  cancelExcursion,
} from "@/lib/actions/excursions";
import type { Excursion } from "@/types/domain";

interface ExcursionDetailActionsProps {
  excursion: Excursion;
}

export function ExcursionDetailActions({ excursion }: ExcursionDetailActionsProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const canDepart = ["ready_to_depart", "consents_pending"].includes(excursion.status);
  const canReturn = excursion.status === "in_progress";
  const canCancel = !["in_progress", "returned", "cancelled"].includes(excursion.status);

  if (!canDepart && !canReturn && !canCancel) return null;

  function handleDepart() {
    startTransition(async () => {
      const result = await departExcursion(excursion.id);
      if (!result.error) {
        haptics.heavy();
        router.refresh();
      } else {
        haptics.error();
      }
    });
  }

  function handleReturn() {
    startTransition(async () => {
      const result = await returnExcursion(excursion.id);
      if (!result.error) {
        haptics.success();
        router.refresh();
      } else {
        haptics.error();
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelExcursion(excursion.id);
      if (!result.error) {
        haptics.warning();
        router.refresh();
      } else {
        haptics.error();
      }
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      {canDepart && (
        <button
          type="button"
          onClick={handleDepart}
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "..." : "Mark as Departed"}
        </button>
      )}

      {canReturn && (
        <button
          type="button"
          onClick={handleReturn}
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--success)",
            color: "#fff",
          }}
        >
          {isPending ? "..." : "Mark as Returned"}
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {isPending ? "..." : "Cancel Excursion"}
        </button>
      )}
    </div>
  );
}
