// src/app/(app)/attendance/chronic-absence/config/page.tsx
//
// Chronic Absence Monitoring - Configuration
// Threshold setup, rolling window, and auto-flagging settings.

import Link from "next/link";
import { redirect } from "next/navigation";

import { ConfigFormClient } from "@/components/domain/chronic-absence/config-form-client";
import { getAbsenceMonitoringConfig } from "@/lib/actions/chronic-absence";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Absence Monitoring Settings - WattleOS" };

export default async function ChronicAbsenceConfigPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_CHRONIC_ABSENCE)) {
    redirect("/attendance/chronic-absence");
  }

  const result = await getAbsenceMonitoringConfig();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/attendance" className="hover:underline">
          Attendance
        </Link>
        <span>/</span>
        <Link href="/attendance/chronic-absence" className="hover:underline">
          Chronic Absence
        </Link>
        <span>/</span>
        <span className="text-foreground">Settings</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Absence Monitoring Settings</h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Configure the thresholds and rolling window used to classify student
          attendance rates.
        </p>
      </div>

      {result.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          Failed to load config: {result.error?.message}
        </div>
      ) : result.data ? (
        <ConfigFormClient config={result.data} />
      ) : null}
    </div>
  );
}
