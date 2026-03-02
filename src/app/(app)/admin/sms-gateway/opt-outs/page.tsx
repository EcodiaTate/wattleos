// src/app/(app)/admin/sms-gateway/opt-outs/page.tsx
//
// SMS Gateway - Opt-Out Management

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getOptOutList } from "@/lib/actions/sms-gateway";
import { OptOutManager } from "@/components/domain/sms-gateway/opt-out-manager";

export const metadata = { title: "SMS Opt-Out List - WattleOS" };

export default async function SmsOptOutsPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.MANAGE_SMS_GATEWAY)) {
    redirect("/admin/sms-gateway");
  }

  const result = await getOptOutList();

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
          <span>Opt-Out List</span>
        </div>
        <h1 className="text-2xl font-bold">Opt-Out List</h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Numbers on this list will not receive any SMS. Updated automatically
          when recipients reply STOP.
        </p>
      </div>

      <div className="max-w-md">
        <OptOutManager initialList={result.data ?? []} />
      </div>
    </div>
  );
}
