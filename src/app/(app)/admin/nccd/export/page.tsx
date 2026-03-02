// src/app/(app)/admin/nccd/export/page.tsx
//
// NCCD annual collection export and submission tracking.

import Link from "next/link";
import { redirect } from "next/navigation";

import { NccdExportClient } from "@/components/domain/nccd/nccd-export-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getNccdDashboard, listNccdEntries } from "@/lib/actions/nccd";

export const metadata = {
  title: "NCCD Collection Export",
};

export default async function NccdExportPage() {
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
          Failed to load NCCD data: {result.error?.message}
        </p>
      </div>
    );
  }

  const { collection_summary } = result.data;

  // IDs of active entries not yet submitted (for bulk submit)
  // Re-fetching the full register to get IDs - dashboard only has counts
  const registryResult = await listNccdEntries({
    collection_year: collection_summary.year,
    status: "active",
    submitted: false,
  });
  const unsubmittedIds = (registryResult.data ?? []).map((e) => e.id);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 pb-tab-bar">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/admin/nccd" className="hover:underline">
          NCCD
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Export</span>
      </nav>

      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Annual Collection Export
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Download CSV data and track submission to the NCCD data portal
        </p>
      </div>

      <NccdExportClient
        summary={collection_summary}
        unsubmittedIds={unsubmittedIds}
        canManage={canManage}
      />
    </div>
  );
}
