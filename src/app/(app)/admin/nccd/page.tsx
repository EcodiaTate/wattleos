// src/app/(app)/admin/nccd/page.tsx
//
// NCCD Disability Register - Dashboard
// Server component: loads dashboard data, passes to client.

import Link from "next/link";

import { NccdDashboardClient } from "@/components/domain/nccd/nccd-dashboard-client";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getNccdDashboard } from "@/lib/actions/nccd";
import { redirect } from "next/navigation";

export const metadata = {
  title: "NCCD Disability Register",
};

export default async function NccdDashboardPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_NCCD)) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(ctx, Permissions.MANAGE_NCCD);

  const result = await getNccdDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--muted-foreground)" }}>
          Failed to load NCCD dashboard: {result.error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 pb-tab-bar">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            ♿ NCCD Register
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Nationally Consistent Collection of Data on School Students with
            Disability
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/nccd/register"
            className="touch-target active-push rounded-xl border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            View Register
          </Link>
          {canManage && (
            <Link
              href="/admin/nccd/register/new"
              className="touch-target active-push rounded-xl px-4 py-2 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + Add Entry
            </Link>
          )}
        </div>
      </div>

      <NccdDashboardClient data={result.data} canManage={canManage} />
    </div>
  );
}
