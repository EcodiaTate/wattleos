// src/app/(app)/admin/debt/[id]/plan/new/page.tsx
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDebtStage } from "@/lib/actions/debt";
import { CreatePaymentPlanClient } from "@/components/domain/debt/payment-plan-client";

export const metadata = { title: "Create Payment Plan - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewPaymentPlanPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DEBT_MANAGEMENT)) {
    redirect("/dashboard");
  }

  const recordResult = await getDebtStage(id);
  if (recordResult.error || !recordResult.data) {
    notFound();
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 600, margin: "0 auto" }}>
      <CreatePaymentPlanClient record={recordResult.data} />
    </main>
  );
}
