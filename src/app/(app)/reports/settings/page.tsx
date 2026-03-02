// src/app/(app)/reports/settings/page.tsx
//
// ============================================================
// WattleOS Report Builder - School Settings
// ============================================================
// Per-tenant PDF branding: school name, accent colour,
// paper size, font. Renders SettingsClient for mutations.
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getReportSettings } from "@/lib/actions/reports/report-settings";
import { SettingsClient } from "@/components/domain/reports/SettingsClient";

export const metadata = { title: "Settings - WattleOS Reports" };

export default async function ReportsSettingsPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_REPORTS)) {
    redirect("/reports");
  }

  const settingsResult = await getReportSettings();
  const settings = settingsResult.data ?? null;

  return (
    <SettingsClient
      initialSettings={settings}
      tenantName={context.tenant.name}
    />
  );
}
