// src/app/(app)/admin/appearance/page.tsx
//
// ============================================================
// WattleOS V2 — Admin: School Appearance Settings
// ============================================================
// Permission-gated to MANAGE_TENANT_SETTINGS.
// Allows admins to configure brand color, default density,
// and default theme for their entire school.
//
// WHY a separate page from /admin/settings:
//   Appearance is conceptually distinct from operational settings
//   (timezone, billing, etc.) and benefits from a live preview.
// ============================================================

import { AppearanceSettingsClient } from "@/components/domain/admin/appearance-settings-client";
import { getTenantDisplaySettings } from "@/lib/actions/display-settings";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export const metadata = {
  title: "School Appearance",
};

export default async function AppearancePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/dashboard");
  }

  const result = await getTenantDisplaySettings();
  const settings = result.data ?? {
    brandHue: null,
    brandSaturation: null,
    defaultDensity: "comfortable" as const,
    defaultTheme: "light" as const,
    faviconUrl: null,
  };

  return (
    <div className="space-y-[var(--density-section-gap)]">
      <div>
        <h1 className="text-[var(--text-2xl)] font-semibold text-foreground">
          School Appearance
        </h1>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Customise how WattleOS looks for everyone at {context.tenant.name}.
          Individual users can override theme and density in their own settings.
        </p>
      </div>

      <AppearanceSettingsClient initialSettings={settings} />
    </div>
  );
}
