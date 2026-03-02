import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getWellbeingDashboard } from "@/lib/actions/wellbeing";
import { WellbeingDashboardClient } from "@/components/domain/wellbeing/wellbeing-dashboard-client";

export const metadata = { title: "Wellbeing - WattleOS" };

export default async function WellbeingDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WELLBEING);
  const canManageReferrals = hasPermission(context, Permissions.MANAGE_REFERRALS);
  const canViewCaseNotes =
    hasPermission(context, Permissions.VIEW_COUNSELLOR_NOTES) ||
    hasPermission(context, Permissions.MANAGE_COUNSELLOR_NOTES);

  const result = await getWellbeingDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load wellbeing dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Wellbeing & Pastoral Care
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Student concern flags, referrals, check-ins, and pastoral records
        </p>
      </div>

      <WellbeingDashboardClient
        data={result.data}
        canManage={canManage}
        canManageReferrals={canManageReferrals}
        canViewCaseNotes={canViewCaseNotes}
      />
    </div>
  );
}
