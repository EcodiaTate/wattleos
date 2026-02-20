// src/app/(app)/admin/appearance/page.tsx
//
// ============================================================
// WattleOS V2 — Admin Appearance Settings Page
// ============================================================
// Server component that fetches the current tenant display
// settings and passes them to the interactive client form.
//
// WHY server component wrapper: We fetch the current settings
// on the server (fast, no loading state) and pass them as
// props to the client component which handles all interactivity.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getTenantDisplaySettings } from "@/lib/actions/display-settings";
import { AppearanceSettingsClient } from "@/components/domain/admin/appearance-settings-client";
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/display";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppearancePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/dashboard");
  }

  const result = await getTenantDisplaySettings();
  const settings = result.data ?? DEFAULT_DISPLAY_SETTINGS;

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link href="/admin" className="hover:text-foreground transition-colors">
            Settings
          </Link>
          <span className="text-[var(--breadcrumb-separator)]">/</span>
          <span className="text-foreground font-medium">Appearance</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Appearance &amp; Branding
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customise your school&apos;s colours, layout density, and theme.
          Changes apply to all users — individuals can override theme and
          density in their personal settings.
        </p>
      </div>

      <AppearanceSettingsClient initialSettings={settings} />
    </div>
  );
}