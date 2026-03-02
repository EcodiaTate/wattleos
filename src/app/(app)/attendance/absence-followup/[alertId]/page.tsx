// src/app/(app)/attendance/absence-followup/[alertId]/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertDetailClient } from "@/components/domain/absence-followup/alert-detail-client";
import { getAlertDetail } from "@/lib/actions/absence-followup";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Absence Alert Detail - WattleOS" };

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ alertId: string }>;
}) {
  const ctx = await getTenantContext();

  if (
    !hasPermission(ctx, Permissions.VIEW_ABSENCE_FOLLOWUP) &&
    !hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP)
  ) {
    redirect("/attendance");
  }

  const { alertId } = await params;
  const result = await getAlertDetail(alertId);
  const canManage = hasPermission(ctx, Permissions.MANAGE_ABSENCE_FOLLOWUP);

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <div
          className="flex items-center gap-2 text-sm"
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
          <span>Alert</span>
        </div>
        <div
          className="rounded-xl border border-border p-6 text-center text-sm"
          style={{ color: "var(--destructive)" }}
        >
          {result.error?.message ?? "Alert not found"}
        </div>
      </div>
    );
  }

  const alert = result.data;
  const studentName = alert.student
    ? `${alert.student.preferred_name ?? alert.student.first_name} ${alert.student.last_name}`
    : "Alert";

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
          <span>{studentName}</span>
        </div>
        <h1 className="text-2xl font-bold">Absence Alert</h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {alert.alert_date} · {studentName}
        </p>
      </div>

      <AlertDetailClient alert={alert} canManage={canManage} />
    </div>
  );
}
