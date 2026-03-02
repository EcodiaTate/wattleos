// src/app/(app)/admin/sms-gateway/page.tsx
//
// SMS Gateway - Dashboard
// Displays gateway status, 30-day delivery stats, daily limit bar,
// recent messages, and failed messages.

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getSmsDashboard } from "@/lib/actions/sms-gateway";
import { SmsDashboardClient } from "@/components/domain/sms-gateway/sms-dashboard-client";

export const metadata = { title: "SMS Gateway - WattleOS" };

export default async function SmsGatewayPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)) {
    redirect("/admin");
  }

  const result = await getSmsDashboard();

  if (!result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SMS Gateway</h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {result.error?.message ?? "Failed to load dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SMS Gateway</h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            MessageMedia / Burst SMS - outbound messages for absence alerts,
            emergency comms, and broadcasts.
          </p>
        </div>
      </div>

      <SmsDashboardClient data={result.data} />
    </div>
  );
}
