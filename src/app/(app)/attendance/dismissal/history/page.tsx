// src/app/(app)/attendance/dismissal/history/page.tsx
//
// ============================================================
// WattleOS V2 - Dismissal History
// ============================================================
// Historical dismissal records: filterable by student, date
// range, and status. Useful for compliance review and parent
// queries about who collected their child on a given day.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissalHistoryClient } from "@/components/domain/dismissal/dismissal-history-client";

export const metadata = { title: "Dismissal History - WattleOS" };

export default async function DismissalHistoryPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_DISMISSAL) &&
    !hasPermission(context, Permissions.MANAGE_DISMISSAL)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/attendance/dismissal"
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Dismissal
          </Link>
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Dismissal History
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Historical record of all daily dismissal confirmations and exceptions.
        </p>
      </div>

      {/* ── History client (handles filters + pagination) ── */}
      <DismissalHistoryClient />
    </div>
  );
}
