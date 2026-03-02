// src/app/(app)/attendance/acara-reporting/new/page.tsx
//
// Create a new ACARA report period.

import Link from "next/link";
import { redirect } from "next/navigation";

import { AcaraReportPeriodForm } from "@/components/domain/acara/acara-report-period-form";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "New ACARA Report Period - WattleOS" };

export default async function NewAcaraReportPeriodPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_ACARA_REPORTING)) {
    redirect("/attendance/acara-reporting");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <div
          className="flex items-center gap-2 text-sm mb-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Link href="/attendance" className="hover:underline">
            Attendance
          </Link>
          <span>/</span>
          <Link href="/attendance/acara-reporting" className="hover:underline">
            ACARA Reporting
          </Link>
          <span>/</span>
          <span>New Period</span>
        </div>
        <h1 className="text-2xl font-bold">New Report Period</h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Define the calendar year, collection type, and date range for this
          submission.
        </p>
      </div>

      <AcaraReportPeriodForm mode="create" />
    </div>
  );
}
