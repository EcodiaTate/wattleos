// src/components/domain/sis/ClassRosterActions.tsx
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
    startTransition(() => router.refresh());
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 animate-scale-in">
        <input
          type="date"
          value={withdrawDate}
          onChange={(e) => setWithdrawDate(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:border-primary outline-none ring-primary/20 focus:ring-2"
        />
        <button
          onClick={handleWithdraw}
          disabled={isPending}
          className="rounded-md bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {isPending ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError(null); }}
          className="rounded-md border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-muted transition-all active:scale-95"
        >
          Cancel
        </button>
        {error && <span className="text-[10px] font-bold text-destructive uppercase tracking-widest">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md border border-destructive/30 bg-background px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/5 transition-all active:scale-95"
    >
      Withdraw
    </button>
  );
}