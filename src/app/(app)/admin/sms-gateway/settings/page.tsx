// src/app/(app)/admin/sms-gateway/settings/page.tsx
//
// SMS Gateway - Provider Settings
// Configure API keys, sender ID, daily limits, and enable/disable.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getSmsGatewayConfig } from "@/lib/actions/sms-gateway";
import { SmsConfigForm } from "@/components/domain/sms-gateway/sms-config-form";

export const metadata = { title: "SMS Gateway Settings - WattleOS" };

export default async function SmsGatewaySettingsPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)) {
    redirect("/admin/sms-gateway");
  }

  const result = await getSmsGatewayConfig();

  return (
    <div className="space-y-6">
      <div>
        <div
          className="mb-1 flex items-center gap-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <Link href="/admin/sms-gateway" className="hover:underline">
            SMS Gateway
          </Link>
          <span>/</span>
          <span>Settings</span>
        </div>
        <h1 className="text-2xl font-bold">Gateway Settings</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Configure your SMS provider. API keys are encrypted at rest.
        </p>
      </div>

      {/* Security notice */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--muted)" }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Security Notice
        </p>
        <ul
          className="mt-2 space-y-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <li>• API keys are encrypted with AES-256-GCM before storage.</li>
          <li>
            • Keys are never returned to the client - the form only shows
            whether a key is set.
          </li>
          <li>
            • Leave the key fields blank to keep your existing credentials.
          </li>
          <li>
            • Requires the <code>SMS_ENCRYPTION_KEY</code> environment variable
            (32-byte hex).
          </li>
        </ul>
      </div>

      <div className="max-w-xl">
        <SmsConfigForm existing={result.data ?? null} />
      </div>
    </div>
  );
}
