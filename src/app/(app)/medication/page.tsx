// src/app/(app)/medication/page.tsx
//
// ============================================================
// WattleOS V2 - Module B: Medication Dashboard (Reg 93/94)
// ============================================================
// Server Component. Loads:
//   - Students with active management plans
//   - Expiring plans (30 days) + expired plans
//   - Today's administrations
//
// Quick links to: administer, register, per-student view.
// ============================================================

import { MedicationDashboard } from "@/components/domain/medication/medication-dashboard";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import {
  getStudentsWithActivePlans,
  getExpiringPlans,
  getExpiredPlans,
  listTodayAdministrations,
} from "@/lib/actions/medication-admin";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export const metadata = { title: "Medication" };

export default async function MedicationPage() {
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_MEDICATION_RECORDS);
  const canAdminister = hasPermission(
    context,
    Permissions.ADMINISTER_MEDICATION,
  );
  const canManage = hasPermission(context, Permissions.MANAGE_MEDICATION_PLANS);

  if (!canView && !canAdminister && !canManage) {
    redirect("/dashboard");
  }

  const [summariesResult, expiringResult, expiredResult, todayResult] =
    await Promise.all([
      canView
        ? getStudentsWithActivePlans()
        : Promise.resolve({ data: [], error: null }),
      canView
        ? getExpiringPlans(30)
        : Promise.resolve({ data: [], error: null }),
      canView ? getExpiredPlans() : Promise.resolve({ data: [], error: null }),
      canView
        ? listTodayAdministrations()
        : Promise.resolve({ data: [], error: null }),
    ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <MedicationDashboard
        summaries={summariesResult.data ?? []}
        expiringPlans={expiringResult.data ?? []}
        expiredPlans={expiredResult.data ?? []}
        todayAdministrations={todayResult.data ?? []}
        canAdminister={canAdminister}
        canManage={canManage}
      />
    </div>
  );
}
