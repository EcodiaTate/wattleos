// src/app/(app)/admin/sms-gateway/send/page.tsx
//
// SMS Gateway - Send Individual Message

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { SendSmsForm } from "@/components/domain/sms-gateway/send-sms-form";

export const metadata = { title: "Send SMS - WattleOS" };

export default async function SendSmsPage() {
  const ctx = await getTenantContext();

  if (
    !hasPermission(ctx, Permissions.SEND_SMS) &&
    !hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)
  ) {
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
          <span>Send Message</span>
        </div>
        <h1 className="text-2xl font-bold">Send SMS</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Send an individual message to a phone number. Standard SMS rates
          apply.
        </p>
      </div>

      <div className="max-w-xl">
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <SendSmsForm />
        </div>
      </div>
    </div>
  );
}
