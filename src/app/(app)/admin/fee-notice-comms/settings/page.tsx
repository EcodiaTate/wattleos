// src/app/(app)/admin/fee-notice-comms/settings/page.tsx
//
// ============================================================
// WattleOS V2 - Admin: Fee Notice Comms Configuration
// ============================================================
// Server Component. Permission-gated to MANAGE_FEE_NOTICE_COMMS.
// Loads current config and renders the config form.
// ============================================================

import { FeeNoticeConfigForm } from "@/components/domain/fee-notice-comms/fee-notice-config-form";
import { getFeeNoticeConfig } from "@/lib/actions/fee-notice-comms";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export const metadata = { title: "Fee Notice Settings - WattleOS" };

export default async function FeeNoticeSettingsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_FEE_NOTICE_COMMS)) {
    redirect("/dashboard");
  }

  const result = await getFeeNoticeConfig();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/fee-notice-comms"
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            Fee Notice Comms
          </a>
          <span style={{ color: "var(--muted-foreground)" }}>/</span>
          <span className="text-sm" style={{ color: "var(--foreground)" }}>
            Settings
          </span>
        </div>
        <h1
          className="text-2xl font-semibold mt-2"
          style={{ color: "var(--foreground)" }}
        >
          Notification Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Configure which billing events trigger notifications, delivery channels,
          reminder schedules, and message templates.
        </p>
      </div>

      <div
        className="rounded-lg border border-border p-4 sm:p-6"
        style={{ background: "var(--card)" }}
      >
        <FeeNoticeConfigForm config={result.data ?? null} />
      </div>
    </div>
  );
}
