import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMqapDashboardSummary } from "@/lib/actions/mqap";
import { MqapDashboardClient } from "@/components/domain/mqap/mqap-dashboard-client";

export default async function MqapDashboardPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MQAP) ||
    hasPermission(context, Permissions.MANAGE_MQAP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MQAP);

  const summaryResult = await getMqapDashboardSummary();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          MQ:AP Self-Assessment
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Montessori Quality: Authentic Practice - voluntary accreditation
          framework
        </p>
      </div>

      <MqapDashboardClient
        summary={summaryResult.data!}
        canManage={canManage}
      />
    </div>
  );
}
