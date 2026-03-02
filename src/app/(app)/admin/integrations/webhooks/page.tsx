// src/app/(app)/admin/integrations/webhooks/page.tsx
//
// ============================================================
// WattleOS V2 - Webhook Health Dashboard (Server Component)
// ============================================================
// Shows incoming webhook event health across all providers.
// Displays the dead-letter queue and allows manual retry.
// ============================================================

import {
  getWebhookDashboardStats,
  listWebhookEvents,
} from "@/lib/actions/webhooks";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import { WebhookDashboardClient } from "@/components/domain/admin/webhook-dashboard-client";

export const metadata = { title: "Webhook Health - WattleOS" };

export default async function WebhookDashboardPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_INTEGRATIONS)) {
    redirect("/dashboard");
  }

  const [statsResult, eventsResult] = await Promise.all([
    getWebhookDashboardStats(),
    listWebhookEvents({ limit: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Webhook Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor incoming webhooks from Stripe, SMS, and other integrations.
          Failed events are retried automatically with exponential backoff.
        </p>
      </div>

      <WebhookDashboardClient
        stats={statsResult.data ?? null}
        initialEvents={eventsResult.data?.events ?? []}
        initialTotal={eventsResult.data?.total ?? 0}
      />
    </div>
  );
}
