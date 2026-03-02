import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCriteriaWithAssessments } from "@/lib/actions/mqap";
import { MqapAssessmentMatrixClient } from "@/components/domain/mqap/mqap-assessment-matrix-client";

export default async function MqapAssessmentPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MQAP) ||
    hasPermission(context, Permissions.MANAGE_MQAP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MQAP);

  const result = await getCriteriaWithAssessments();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          MQ:AP Assessment Matrix
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Rate each criterion across all 7 Quality Areas
        </p>
      </div>

      <MqapAssessmentMatrixClient
        criteriaWithAssessments={result.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
