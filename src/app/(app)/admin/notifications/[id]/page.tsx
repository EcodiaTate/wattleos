// src/app/(app)/admin/notifications/[id]/page.tsx
// Delivery receipt view for a sent dispatch.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDispatch, getDeliveryLog } from "@/lib/actions/push-notifications";
import { DeliveryLogClient } from "@/components/domain/push-notifications/delivery-log-client";

export const metadata = { title: "Notification Receipts" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NotificationReceiptsPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.VIEW_NOTIFICATION_ANALYTICS)) {
    redirect("/admin/notifications");
  }

  const [dispatchResult, logResult] = await Promise.all([
    getDispatch(id),
    getDeliveryLog(id),
  ]);

  if (dispatchResult.error || !dispatchResult.data) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/notifications"
          className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
          style={{ color: "var(--foreground)" }}
        >
          ← Back
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Delivery Receipts
        </h1>
      </div>

      <DeliveryLogClient
        dispatch={dispatchResult.data}
        log={logResult.data ?? []}
      />
    </div>
  );
}
