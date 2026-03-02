// src/app/(app)/admin/debt/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDebtStage, listReminderLog } from "@/lib/actions/debt";
import { DebtDetailClient } from "@/components/domain/debt/debt-detail-client";

export const metadata = { title: "Debt Account - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DebtDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_DEBT_MANAGEMENT)) {
    redirect("/dashboard");
  }

  const [recordResult, remindersResult] = await Promise.all([
    getDebtStage(id),
    listReminderLog(id),
  ]);

  if (recordResult.error || !recordResult.data) {
    notFound();
  }

  const canManage = hasPermission(context, Permissions.MANAGE_DEBT_MANAGEMENT);
  const canApproveWriteOff = hasPermission(context, Permissions.APPROVE_WRITE_OFFS);

  return (
    <main style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <DebtDetailClient
        record={recordResult.data}
        reminders={remindersResult.data ?? []}
        canManage={canManage}
        canApproveWriteOff={canApproveWriteOff}
      />
    </main>
  );
}
