// src/app/(app)/admin/notifications/[id]/edit/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDispatch } from "@/lib/actions/push-notifications";
import { DispatchForm } from "@/components/domain/push-notifications/dispatch-form";

export const metadata = { title: "Edit Notification" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNotificationPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_PUSH_NOTIFICATIONS)) {
    redirect("/admin/notifications");
  }

  const result = await getDispatch(id);
  if (result.error || !result.data) notFound();

  const dispatch = result.data;
  if (!["draft", "scheduled"].includes(dispatch.status)) {
    redirect(`/admin/notifications/${id}`);
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
            Edit Notification
          </h1>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Update draft or scheduled dispatch
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <DispatchForm existing={dispatch} />
      </div>
    </div>
  );
}
