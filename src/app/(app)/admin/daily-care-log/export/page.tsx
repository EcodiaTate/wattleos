import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { CareExportClient } from "@/components/domain/daily-care-log/care-export-client";

export const metadata = { title: "Export Daily Care - WattleOS" };

export default async function DailyCareExportPage() {
  const context = await getTenantContext();

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_DAILY_CARE_LOGS,
  );
  if (!canManage) redirect("/dashboard");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/daily-care-log"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Daily Care Log
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Export</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Export Daily Care Data
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Download daily care records as CSV for compliance reporting (Reg 162)
        </p>
      </div>

      {/* ── Export Form ──────────────────────────────────────────── */}
      <CareExportClient />
    </div>
  );
}
