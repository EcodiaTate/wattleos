// src/app/(app)/attendance/chronic-absence/page.tsx
//
// Chronic Absence Monitoring - Dashboard
// Lists all students with attendance rates below the configured
// thresholds. Provides quick flagging and links to per-student detail.

import Link from "next/link";
import { redirect } from "next/navigation";

import { ChronicAbsenceDashboardClient } from "@/components/domain/chronic-absence/chronic-absence-dashboard-client";
import { getChronicAbsenceDashboard } from "@/lib/actions/chronic-absence";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Chronic Absence Monitoring - WattleOS" };

export default async function ChronicAbsencePage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_CHRONIC_ABSENCE)) {
    redirect("/attendance");
  }

  const result = await getChronicAbsenceDashboard();
  const canManage = hasPermission(ctx, Permissions.MANAGE_CHRONIC_ABSENCE);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <span>Chronic Absence</span>
          </div>
          <h1 className="text-2xl font-bold">Chronic Absence Monitoring</h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Students with attendance rates below the configured thresholds,
            calculated over the rolling window.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <Link
              href="/attendance/chronic-absence/config"
              className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              ⚙️ Settings
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard */}
      {result.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "var(--destructive-bg, hsl(0 60% 94%))",
            color: "var(--destructive)",
          }}
        >
          Failed to load dashboard: {result.error?.message}
        </div>
      ) : result.data ? (
        <ChronicAbsenceDashboardClient
          data={result.data}
          canManage={canManage}
        />
      ) : null}
    </div>
  );
}
