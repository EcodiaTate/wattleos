// src/app/(app)/attendance/absence-followup/history/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertHistoryClient } from "@/components/domain/absence-followup/alert-history-client";
import { getAlertHistory } from "@/lib/actions/absence-followup";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Absence Follow-up History - WattleOS" };

export default async function AbsenceFollowupHistoryPage() {
  const ctx = await getTenantContext();

  if (
    !hasPermission(ctx, Permissions.VIEW_ABSENCE_FOLLOWUP) &&
    !hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP)
  ) {
    redirect("/attendance");
  }

  const result = await getAlertHistory({ page: 1, limit: 25 });
  const canManage = hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP);

  return (
    <div className="space-y-6">
      <div>
        <div
          className="flex items-center gap-2 text-sm mb-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Link href="/attendance" className="hover:underline">
            Attendance
          </Link>
          <span>/</span>
          <Link href="/attendance/absence-followup" className="hover:underline">
            Absence Follow-up
          </Link>
          <span>/</span>
          <span>History</span>
        </div>
        <h1 className="text-2xl font-bold">Follow-up History</h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          All unexplained absence alerts with filter and export.
        </p>
      </div>

      {result.error ? (
        <div
          className="rounded-xl border border-border p-6 text-sm text-center"
          style={{ color: "var(--destructive)" }}
        >
          Failed to load: {result.error.message}
        </div>
      ) : (
        <AlertHistoryClient
          initialAlerts={result.data ?? []}
          totalCount={result.pagination?.total ?? 0}
          canManage={canManage}
        />
      )}
    </div>
  );
}
