import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getGoals, getStaffForGoalAssignment } from "@/lib/actions/qip";
import { GoalListClient } from "@/components/domain/qip/goal-list-client";

export default async function QipGoalsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const [goalsResult, staffResult] = await Promise.all([
    getGoals(),
    getStaffForGoalAssignment(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Improvement Goals
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Track improvement goals against NQS elements
        </p>
      </div>

      <GoalListClient
        initialGoals={goalsResult.data ?? []}
        staff={staffResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
