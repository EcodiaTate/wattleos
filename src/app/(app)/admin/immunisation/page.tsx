import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getImmunisationDashboard } from "@/lib/actions/immunisation";
import { ImmunisationDashboardClient } from "@/components/domain/immunisation/immunisation-dashboard-client";

export const metadata = { title: "Immunisation - WattleOS" };

export default async function ImmunisationDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_IMMUNISATION) ||
    hasPermission(context, Permissions.MANAGE_IMMUNISATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_IMMUNISATION);

  const result = await getImmunisationDashboard();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load immunisation dashboard."}
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
          Immunisation Compliance
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          IHS records, catch-up tracking, and AIR review alerts - No Jab No
          Pay/Play
        </p>
      </div>

      <ImmunisationDashboardClient
        dashboard={result.data}
        canManage={canManage}
      />
    </div>
  );
}
