// src/app/(app)/comms/newsletters/page.tsx
//
// Staff newsletter dashboard - shows recent editions, stats,
// templates, and a "New Newsletter" button.

import { NewsletterDashboardClient } from "@/components/domain/newsletter/newsletter-dashboard-client";
import { getNewsletterDashboard } from "@/lib/actions/comms/newsletter";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Newsletter - WattleOS" };

export default async function NewsletterDashboardPage() {
  const ctx = await getTenantContext();
  const canManage = hasPermission(ctx, Permissions.MANAGE_NEWSLETTER);
  const canSend = hasPermission(ctx, Permissions.SEND_NEWSLETTER);

  const result = await getNewsletterDashboard();

  if (result.error || !result.data) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load newsletter dashboard"}
        </p>
      </div>
    );
  }

  return (
    <NewsletterDashboardClient
      data={result.data}
      canManage={canManage}
      canSend={canSend}
    />
  );
}
