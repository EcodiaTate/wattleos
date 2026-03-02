// src/app/(app)/admin/fee-notice-comms/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Fee Notice Communications Dashboard
// ============================================================
// Server Component. Permission-gated to VIEW_FEE_NOTICE_COMMS.
// Shows notice history, pending approvals, delivery stats,
// and quick access to configuration.
// ============================================================

import { FeeNoticeDashboardClient } from "@/components/domain/fee-notice-comms/fee-notice-dashboard-client";
import { getFeeNoticeCommsDashboard } from "@/lib/actions/fee-notice-comms";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export const metadata = { title: "Fee Notice Comms - WattleOS" };

export default async function FeeNoticeCommsPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_FEE_NOTICE_COMMS) &&
    !hasPermission(context, Permissions.MANAGE_FEE_NOTICE_COMMS)
  ) {
    redirect("/dashboard");
  }

  const result = await getFeeNoticeCommsDashboard();

  if (result.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Fee Notice Communications
          </h1>
        </div>
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-sm" style={{ color: "var(--destructive)" }}>
            Failed to load dashboard: {result.error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Fee Notice Communications
          </h1>
        </div>
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            No data available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Fee Notice Communications
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Manage billing-triggered notifications to parents.
          </p>
        </div>
        {hasPermission(context, Permissions.MANAGE_FEE_NOTICE_COMMS) && (
          <a
            href="/admin/fee-notice-comms/settings"
            className="active-push touch-target rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors"
            style={{
              color: "var(--foreground)",
              background: "var(--card)",
            }}
          >
            Settings
          </a>
        )}
      </div>

      <FeeNoticeDashboardClient data={result.data} />
    </div>
  );
}
