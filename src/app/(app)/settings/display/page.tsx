// src/app/(app)/settings/display/page.tsx
//
// ============================================================
// WattleOS V2 — User Display Settings Page
// ============================================================
// Any authenticated user can access this page to set their
// personal theme, density, and font scale preferences.
//
// WHY /settings/display and not /profile:
//   /settings is the natural home for personal configuration.
//   /profile would be for editing your name, email, avatar.
//   Keeping them separate lets us add more settings tabs later
//   (notifications, calendar sync, etc.) without crowding.
// ============================================================

import { DisplayPreferencesClient } from "@/components/domain/user/display-preferences-client";
import {
  getTenantDisplaySettings,
  getUserDisplayPreferences,
} from "@/lib/actions/display-settings";
import { getTenantContext } from "@/lib/auth/tenant-context";

export const metadata = {
  title: "Display Settings",
};

export default async function UserDisplaySettingsPage() {
  const context = await getTenantContext();

  const [userResult, tenantResult] = await Promise.all([
    getUserDisplayPreferences(),
    getTenantDisplaySettings(),
  ]);

  const userPrefs = userResult.data ?? {
    theme: null,
    density: null,
    fontScale: null,
    sidebarCollapsed: false,
  };

  const tenantDisplay = tenantResult.data ?? {
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
          Display Settings
        </h1>
        <p className="mt-1 text-[var(--text-sm)] text-muted-foreground">
          Personalise how WattleOS looks for you. These settings override the
          school defaults set by your administrator.
        </p>
      </div>

      <DisplayPreferencesClient
        initialPreferences={userPrefs}
        tenantDefaultDensity={tenantDisplay.defaultDensity}
        tenantDefaultTheme={tenantDisplay.defaultTheme}
      />
    </div>
  );
} 