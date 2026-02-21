// src/app/(app)/admin/appearance/page.tsx
//
// ============================================================
// WattleOS V2 - School Settings Page (General + Appearance)
// ============================================================
// Server component that fetches both the core tenant settings
// (name, logo, timezone, country, currency) and the display
// settings (brand colours, theme, density, sidebar style), then
// passes them to their respective client components.
//
// WHY unified page: School profile and appearance are both
// "how my school looks and is configured" concerns. A single
// page avoids fragmenting admin workflows and keeps the admin
// hub cleaner. The page is naturally sectioned: profile at top,
// appearance below.
//
// WHY keep the /admin/appearance route: Avoids breaking any
// existing links or bookmarks. The admin hub card label changes
// to "School Settings" but the route stays stable.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getTenantDisplaySettings } from "@/lib/actions/display-settings";
import { getTenantGeneralSettings } from "@/lib/actions/tenant-settings";
import type { TenantGeneralSettings } from "@/lib/constants/tenant-settings";
import { AppearanceSettingsClient } from "@/components/domain/admin/appearance-settings-client";
import { SchoolGeneralSettingsClient } from "@/components/domain/admin/school-general-settings-client";
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/display";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SchoolSettingsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/dashboard");
  }

  // Fetch both setting groups in parallel for speed
  const [displayResult, generalResult] = await Promise.all([
    getTenantDisplaySettings(),
    getTenantGeneralSettings(),
  ]);

  const displaySettings = displayResult.data ?? DEFAULT_DISPLAY_SETTINGS;

  const generalSettings = generalResult.data ?? {
    name: context.tenant.name,
    logo_url: context.tenant.logo_url,
    timezone: context.tenant.timezone,
    country: context.tenant.country,
    currency: context.tenant.currency,
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors"
          >
            Admin
          </Link>
          <span className="text-[var(--breadcrumb-separator)]">/</span>
          <span className="text-foreground font-medium">School Settings</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          School Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your school&apos;s profile, branding, and default appearance.
          Appearance changes apply to all users — individuals can override
          theme and density in their personal settings.
        </p>
      </div>

      {/* ── Section 1: General Profile ── */}
      <SchoolGeneralSettingsClient
        initialSettings={generalSettings}
        tenantSlug={context.tenant.slug}
      />

      {/* ── Section divider ── */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-sm font-medium text-muted-foreground">
            Appearance &amp; Branding
          </span>
        </div>
      </div>

      {/* ── Section 2: Appearance (existing component) ── */}
      <AppearanceSettingsClient initialSettings={displaySettings} />
    </div>
  );
}