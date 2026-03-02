// src/app/(app)/admin/sms-gateway/log/page.tsx
//
// SMS Gateway - Message Log

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listSmsMessages } from "@/lib/actions/sms-gateway";
import { SmsMessageLog } from "@/components/domain/sms-gateway/sms-message-log";
import type { SmsMessageWithStudent } from "@/types/domain";

export const metadata = { title: "SMS Message Log - WattleOS" };

export default async function SmsLogPage() {
  const ctx = await getTenantContext();

  if (
    !hasPermission(ctx, Permissions.VIEW_SMS_GATEWAY) &&
    !hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)
  ) {
    redirect("/admin/sms-gateway");
  }

  const result = await listSmsMessages({ page: 1, per_page: 50 });

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
          <span>Message Log</span>
        </div>
        <h1 className="text-2xl font-bold">Message Log</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          All outbound SMS messages with delivery status.
        </p>
      </div>

      <SmsMessageLog
        initialMessages={result.data as SmsMessageWithStudent[]}
        initialTotal={result.pagination.total}
      />
    </div>
  );
}
