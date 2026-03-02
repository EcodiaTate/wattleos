// src/app/(app)/attendance/absence-followup/config/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { ConfigFormClient } from "@/components/domain/absence-followup/config-form-client";
import { getAbsenceFollowupConfig } from "@/lib/actions/absence-followup";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Absence Follow-up Settings - WattleOS" };

export default async function AbsenceFollowupConfigPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP)) {
    redirect("/attendance/absence-followup");
  }

  const result = await getAbsenceFollowupConfig();

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
          <span>Settings</span>
        </div>
        <h1 className="text-2xl font-bold">Absence Follow-up Settings</h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Configure cutoff time, escalation, and notification message for
          unexplained absences.
        </p>
      </div>

      {result.error ? (
        <div
          className="rounded-xl border border-border p-6 text-sm text-center"
          style={{ color: "var(--destructive)" }}
        >
          Failed to load settings: {result.error.message}
        </div>
      ) : result.data ? (
        <ConfigFormClient config={result.data} />
      ) : null}
    </div>
  );
}
