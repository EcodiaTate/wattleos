import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getGoals, getStaffForGoalAssignment, getAllCriteria } from "@/lib/actions/mqap";
import { MqapGoalListClient } from "@/components/domain/mqap/mqap-goal-list-client";

export default async function MqapGoalsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MQAP) ||
    hasPermission(context, Permissions.MANAGE_MQAP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MQAP);

  const [goalsResult, staffResult, criteriaResult] = await Promise.all([
    getGoals(),
    canManage ? getStaffForGoalAssignment() : Promise.resolve({ data: [] }),
    getAllCriteria(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          MQ:AP Improvement Goals
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Track improvement actions against MQ:AP criteria
        </p>
      </div>

      <MqapGoalListClient
        initialGoals={goalsResult.data ?? []}
        staff={staffResult.data ?? []}
        criteria={criteriaResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
