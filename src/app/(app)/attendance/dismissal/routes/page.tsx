// src/app/(app)/attendance/dismissal/routes/page.tsx
//
// ============================================================
// WattleOS V2 - Bus Route Management
// ============================================================
// Admin: create/edit/deactivate bus routes used in the daily
// dismissal confirmation workflow.
// ============================================================

import { getBusRoutes } from "@/lib/actions/dismissal";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BusRouteListClient } from "@/components/domain/dismissal/bus-route-list-client";

export const metadata = { title: "Bus Routes - Dismissal - WattleOS" };

export default async function BusRoutesPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_DISMISSAL) &&
    !hasPermission(context, Permissions.MANAGE_DISMISSAL)
  ) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_DISMISSAL);

  const routesResult = await getBusRoutes();
  const routes = routesResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/attendance/dismissal"
              className="text-sm active-push"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← Dismissal
            </Link>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Bus Routes
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Configure the bus routes available for student dismissal
            assignments.
          </p>
        </div>
      </div>

      {/* ── Bus route list ── */}
      <BusRouteListClient initialRoutes={routes} canManage={canManage} />
    </div>
  );
}
