// src/app/(app)/reports/periods/new/page.tsx
//
// ============================================================
// WattleOS V2 - New Report Period
// ============================================================
// Server Component: fetches active templates, then delegates
// to client form. On create, redirects to the period dashboard.
// ============================================================

import { NewPeriodForm } from "@/components/domain/reports/NewPeriodForm";
import { listReportTemplates } from "@/lib/actions/reports/templates";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "New Report Period - WattleOS" };

export default async function NewReportPeriodPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORT_PERIODS)) {
    redirect("/reports/my-reports");
  }

  const templatesResult = await listReportTemplates({
    active_only: true,
    per_page: 100,
  });
  const templates = templatesResult.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports/periods" className="hover:text-foreground">
            Report Periods
          </Link>
          <span>/</span>
          <span className="text-foreground">New Period</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          New Report Period
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the name, dates, and template for this reporting cycle. Once
          activated, guides will be assigned report instances.
        </p>
      </div>

      <NewPeriodForm templates={templates} />
    </div>
  );
}
