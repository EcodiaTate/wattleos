// src/app/(app)/attendance/visitors/page.tsx
//
// ============================================================
// WattleOS V2 - Visitor Sign-In Log
// ============================================================
// Staff view: sign visitors in/out, filter by date & type,
// export CSV register.
// ============================================================

import { VisitorLogClient } from "@/components/domain/visitor-log/visitor-log-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Visitor Sign-In Log - WattleOS" };

export default async function VisitorLogPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_VISITOR_LOG) &&
    !hasPermission(context, Permissions.MANAGE_VISITOR_LOG)
  ) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_VISITOR_LOG);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Visitor Sign-In Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Parents, community members, officials, delivery personnel, and
            volunteers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/contractors"
            className="touch-target flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.654-4.654m5.65-4.65a2.652 2.652 0 00-3.586 0L8.432 8.048M3.75 3.75l1.5 1.5M12 3.75l1.5 1.5M20.25 12l-1.5 1.5"
              />
            </svg>
            Contractor Log
          </Link>
          <Link
            href="/attendance"
            className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Roll Call
          </Link>
        </div>
      </div>

      <VisitorLogClient canManage={canManage} />
    </div>
  );
}
