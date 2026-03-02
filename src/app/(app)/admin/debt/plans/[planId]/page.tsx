// src/app/(app)/admin/debt/plans/[planId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPaymentPlan } from "@/lib/actions/debt";
import { PaymentPlanDetailClient } from "@/components/domain/debt/payment-plan-client";

export const metadata = { title: "Payment Plan - WattleOS" };

interface Props {
  params: Promise<{ planId: string }>;
}

export default async function PaymentPlanDetailPage({ params }: Props) {
  const { planId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.VIEW_DEBT_MANAGEMENT)) {
    redirect("/dashboard");
  }

  const planResult = await getPaymentPlan(planId);
  if (planResult.error || !planResult.data) {
    notFound();
  }

  const canManage = hasPermission(context, Permissions.MANAGE_DEBT_MANAGEMENT);

  return (
    <main style={{ padding: "1.5rem", maxWidth: 700, margin: "0 auto" }}>
      <PaymentPlanDetailClient plan={planResult.data} canManage={canManage} />
    </main>
  );
}
