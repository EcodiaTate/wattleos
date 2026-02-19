// src/components/domain/sis/ClassRosterActions.tsx
//
// ============================================================
// WattleOS V2 - Class Roster Action Buttons
// ============================================================
// 'use client' - handles withdrawal confirmation with inline
// date picker. Transfer navigates to a dedicated page.
//
// Why inline: Withdraw is destructive and needs confirmation +
// a date. A modal would work too, but inline disclosure keeps
// the user in context without layering UI.
// ============================================================

"use client";

import { withdrawStudent } from "@/lib/actions/enrollments";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ClassRosterActionsProps {
  studentId: string;
  studentName: string;
  classId: string;
  enrollmentId: string;
}

export function ClassRosterActions({
  studentId,
  studentName,
  classId,
}: ClassRosterActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [withdrawDate, setWithdrawDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    setError(null);

    const result = await withdrawStudent(studentId, classId, withdrawDate);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setShowConfirm(false);
    startTransition(() => {
      router.refresh();
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={withdrawDate}
          onChange={(e) => setWithdrawDate(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleWithdraw}
          disabled={isPending}
          className="rounded bg-[var(--attendance-absent)] px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false);
            setError(null);
          }}
          className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-background"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Withdraw
      </button>
    </div>
  );
}
