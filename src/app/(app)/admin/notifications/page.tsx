// src/app/(app)/admin/notifications/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPushNotificationDashboard } from "@/lib/actions/push-notifications";
import { NotificationsDashboardClient } from "@/components/domain/push-notifications/notifications-dashboard-client";

export const metadata = { title: "Push Notifications" };

export default async function NotificationsPage() {
  const context = await getTenantContext();

  const canManage = hasPermission(context, Permissions.MANAGE_PUSH_NOTIFICATIONS);
  const canView = hasPermission(context, Permissions.VIEW_NOTIFICATION_ANALYTICS);

  if (!canManage && !canView) redirect("/dashboard");

  const result = await getPushNotificationDashboard();

  if (result.error || !result.data) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Failed to load notifications: {result.error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Push Notifications
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Broadcast push messages to parents, staff, or everyone
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/notifications/new"
            className="touch-target rounded-lg px-4 py-2.5 text-sm font-semibold active-push"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            + New
          </Link>
        )}
      </div>

      <NotificationsDashboardClient data={result.data} />
    </div>
  );
}
