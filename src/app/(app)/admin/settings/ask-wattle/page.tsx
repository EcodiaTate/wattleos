// src/app/(app)/admin/settings/ask-wattle/page.tsx
//
// ============================================================
// WattleOS V2 - Ask Wattle AI Settings Page
// ============================================================
// Server component that loads the current ai_sensitive_data_enabled
// state and passes it to the client toggle component.
//
// WHY gated to MANAGE_TENANT_SETTINGS: Only Owner/Administrator
// roles hold this permission. The AI sensitive data toggle is a
// critical data governance decision and must not be accessible
// to lower-privilege staff.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getTenantAiSettings } from "@/lib/actions/tenant-settings";
import { AskWattleSettingsClient } from "@/components/domain/admin/ask-wattle-settings-client";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Ask Wattle Settings - WattleOS" };

export default async function AskWattleSettingsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/dashboard");
  }

  const aiResult = await getTenantAiSettings();
  const aiSettings = aiResult.data ?? {
    ai_sensitive_data_enabled: false,
    ai_disable_sensitive_tools: false,
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link href="/admin" className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span className="text-[var(--breadcrumb-separator)]">/</span>
          <Link
            href="/admin/settings"
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span className="text-[var(--breadcrumb-separator)]">/</span>
          <span className="text-foreground font-medium">Ask Wattle</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Ask Wattle Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure what student data the AI assistant is permitted to access.
        </p>
      </div>

      <AskWattleSettingsClient
        initialEnabled={aiSettings.ai_sensitive_data_enabled}
      />
    </div>
  );
}
