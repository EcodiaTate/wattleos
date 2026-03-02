// src/app/(app)/admin/grant-tracking/export/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { GrantExportClient } from "@/components/domain/grant-tracking/grant-export-client";

export const metadata = { title: "Export Grants - WattleOS" };

export default async function GrantExportPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_GRANT_TRACKING)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6" style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/grant-tracking"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Grant Tracking
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Export CSV</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Export Grants
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Download a CSV of your grants for reporting or auditing
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <GrantExportClient />
      </div>
    </div>
  );
}
