// src/app/(app)/admin/naplan/page.tsx
//
// NAPLAN Coordination - Dashboard
// Lists all test windows with cohort/results stats and quick actions.

import Link from "next/link";

import { NaplanDashboardClient } from "@/components/domain/naplan/naplan-dashboard-client";
import { getNaplanDashboard } from "@/lib/actions/naplan";
import { hasPermission, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "NAPLAN Coordination" };

export default async function NaplanDashboardPage() {
  const context = await requirePermission(Permissions.VIEW_NAPLAN);
  const canManage = hasPermission(context, Permissions.MANAGE_NAPLAN);

  const result = await getNaplanDashboard();
  const data = result.error ? null : result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            NAPLAN Coordination
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Manage test windows, student cohorts, opt-outs, and results entry
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/naplan/new"
            className="touch-target active-push inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            + New Window
          </Link>
        )}
      </div>

      {/* Dashboard */}
      {data ? (
        <NaplanDashboardClient data={data} canManage={canManage} />
      ) : (
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ background: "var(--card)" }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No NAPLAN windows found.{" "}
            {canManage && (
              <Link
                href="/admin/naplan/new"
                className="font-medium underline"
                style={{ color: "var(--primary)" }}
              >
                Create the first window →
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
