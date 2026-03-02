// src/app/(app)/attendance/absence-followup/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { AbsenceFollowupDashboardClient } from "@/components/domain/absence-followup/absence-followup-dashboard-client";
import { getAbsenceFollowupDashboard } from "@/lib/actions/absence-followup";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Absence Follow-up - WattleOS" };

export default async function AbsenceFollowupPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getTenantContext();

  if (
    !hasPermission(ctx, Permissions.VIEW_ABSENCE_FOLLOWUP) &&
    !hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP)
  ) {
    redirect("/attendance");
  }

  const { date } = await searchParams;
  const result = await getAbsenceFollowupDashboard(date);
  const canManage = hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="flex items-center gap-2 text-sm mb-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Link href="/attendance" className="hover:underline">
              Attendance
            </Link>
            <span>/</span>
            <span>Absence Follow-up</span>
          </div>
          <h1 className="text-2xl font-bold">Unexplained Absence Follow-up</h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Track and action unexplained absences. Generate alerts after roll
            call, notify guardians, and record explanations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/attendance/absence-followup/history"
            className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            History
          </Link>
          {canManage && (
            <Link
              href="/attendance/absence-followup/config"
              className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              ⚙️ Settings
            </Link>
          )}
        </div>
      </div>

      {result.error ? (
        <div
          className="rounded-xl border border-border p-6 text-sm text-center"
          style={{ color: "var(--destructive)" }}
        >
          Failed to load: {result.error.message}
        </div>
      ) : result.data ? (
        <AbsenceFollowupDashboardClient
          data={result.data}
          canManage={canManage}
        />
      ) : null}
    </div>
  );
}
