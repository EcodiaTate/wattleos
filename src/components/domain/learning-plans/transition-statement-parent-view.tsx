"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface TransitionStatementParentViewProps {
  statementId: string;
  studentName?: string;
}

export function TransitionStatementParentView({
  statementId,
}: TransitionStatementParentViewProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [approved, setApproved] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      try {
        // Parent approval would call a server action
        // For now mark as approved locally
        haptics.success();
        setApproved(true);
        router.refresh();
      } catch {
        haptics.error();
      }
    });
  }

  if (approved) {
    return (
      <div
        className="rounded-[var(--radius-md)] border p-4 text-sm"
        style={{
          borderColor: "var(--ilp-completed)",
          background: "color-mix(in srgb, var(--ilp-completed) 8%, transparent)",
          color: "var(--ilp-completed-fg)",
        }}
      >
        Thank you for reviewing and approving this transition statement.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p
        className="text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Please review the transition statement above. If you are satisfied with
        the information, approve it below.
      </p>
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Approving..." : "Approve Transition Statement"}
      </button>
    </div>
  );
}
