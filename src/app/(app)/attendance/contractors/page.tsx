// src/app/(app)/attendance/contractors/page.tsx
//
// ============================================================
// WattleOS V2 - Contractor Sign-In Log
// ============================================================
// Staff view: sign contractors in/out with licence, insurance,
// WWCC, and induction verification; filter by date; export CSV.
// ============================================================

import { ContractorLogClient } from "@/components/domain/visitor-log/contractor-log-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Contractor Sign-In Log - WattleOS" };

export default async function ContractorLogPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_CONTRACTOR_LOG) &&
    !hasPermission(context, Permissions.MANAGE_CONTRACTOR_LOG)
  ) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(context, Permissions.MANAGE_CONTRACTOR_LOG);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Contractor Sign-In Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tradespersons and service providers - licence, insurance, WWCC and
            induction tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/visitors"
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
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            Visitor Log
          </Link>
          <Link
            href="/attendance"
            className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Roll Call
          </Link>
        </div>
      </div>

      <ContractorLogClient canManage={canManage} />
    </div>
  );
}
