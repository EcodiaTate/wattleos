// src/app/(app)/attendance/dismissal/page.tsx
//
// ============================================================
// WattleOS V2 - End-of-Day Dismissal Dashboard
// ============================================================
// Staff confirm each student's departure: parent pickup, bus,
// OSHC, walker, or flag an exception (not collected, unknown
// person, bus no-show, etc.).
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DismissalDashboardClient } from "@/components/domain/dismissal/dismissal-dashboard-client";

export const metadata = { title: "Dismissal - WattleOS" };

export default async function DismissalPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_DISMISSAL) &&
    !hasPermission(context, Permissions.MANAGE_DISMISSAL)
  ) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_DISMISSAL);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-tab-bar">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            End-of-Day Dismissal
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Confirm each student was collected by an authorised person or
            boarded the correct bus.
          </p>
        </div>

        {/* Navigation links */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/attendance/dismissal/history"
            className="touch-target flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium active-push"
            style={{
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            📋 History
          </Link>
          {canManage && (
            <>
              <Link
                href="/attendance/dismissal/setup"
                className="touch-target flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium active-push"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                ⚙️ Student setup
              </Link>
              <Link
                href="/attendance/dismissal/routes"
                className="touch-target flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium active-push"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                🚌 Bus routes
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Main dashboard ── */}
      <DismissalDashboardClient canManage={canManage} />
    </div>
  );
}
