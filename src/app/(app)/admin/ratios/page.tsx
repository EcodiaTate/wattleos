import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";
import { getCurrentRatios, getBreachHistory } from "@/lib/actions/ratios";
import { RatioDashboardClient } from "@/components/domain/ratios/ratio-dashboard-client";

export const metadata = { title: "Ratios - WattleOS" };

export default async function RatioDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_RATIOS) ||
    hasPermission(context, Permissions.MANAGE_FLOOR_SIGNIN);

  if (!canView) {
    redirect("/dashboard");
  }

  const canSignIn = hasPermission(context, Permissions.MANAGE_FLOOR_SIGNIN);

  const [ratiosResult, breachResult] = await Promise.all([
    getCurrentRatios(),
    getBreachHistory({ from_date: null, to_date: null }),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Ratio Monitoring
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Regulation 123 - real-time educator-to-child ratio tracking
        </p>
      </div>

      {/* Dashboard */}
      <RatioDashboardClient
        initialRatios={ratiosResult.data ?? []}
        initialBreaches={breachResult.data ?? []}
        canSignIn={canSignIn}
        currentUserId={context.user.id}
        tenantId={context.tenant.id}
      />
    </div>
  );
}
