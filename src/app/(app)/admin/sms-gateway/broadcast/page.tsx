// src/app/(app)/admin/sms-gateway/broadcast/page.tsx
//
// SMS Gateway - Broadcast to Multiple Recipients

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { BroadcastForm } from "@/components/domain/sms-gateway/broadcast-form";

export const metadata = { title: "Broadcast SMS - WattleOS" };

export default async function BroadcastSmsPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)) {
    redirect("/admin/sms-gateway");
  }

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
          <span>Broadcast</span>
        </div>
        <h1 className="text-2xl font-bold">Broadcast SMS</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Send a message to multiple recipients. Paste or enter phone numbers -
          opt-outs are automatically filtered.
        </p>
      </div>

      {/* Warning */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--sms-bounced-bg)",
          background: "var(--sms-bounced-bg)",
        }}
      >
        <p
          className="text-sm font-medium"
          style={{ color: "var(--sms-bounced-fg)" }}
        >
          Broadcast sends are irreversible
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--sms-bounced-fg)" }}>
          Review the recipient list and message carefully before sending. A
          confirmation step is shown before messages are dispatched.
        </p>
      </div>

      <div className="max-w-2xl">
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <BroadcastForm />
        </div>
      </div>
    </div>
  );
}
