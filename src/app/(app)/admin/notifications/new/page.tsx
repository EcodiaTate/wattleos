// src/app/(app)/admin/notifications/new/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { DispatchForm } from "@/components/domain/push-notifications/dispatch-form";

export const metadata = { title: "New Push Notification" };

export default async function NewNotificationPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_PUSH_NOTIFICATIONS)) {
    redirect("/admin/notifications");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-tab-bar">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/notifications"
          className="touch-target rounded-lg border border-border px-3 py-1.5 text-sm active-push"
          style={{ color: "var(--foreground)" }}
        >
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            New Notification
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Create a push notification to send to your community
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <DispatchForm />
      </div>
    </div>
  );
}
