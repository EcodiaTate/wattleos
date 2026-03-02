import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getAllAssessments, getGoals, getEvidence } from "@/lib/actions/qip";
import { NqsAssessmentMatrixClient } from "@/components/domain/qip/nqs-assessment-matrix-client";

export default async function QipAssessmentPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const [assessmentsResult, goalsResult, evidenceResult] = await Promise.all([
    getAllAssessments(),
    getGoals(),
    getEvidence({}),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          NQS Self-Assessment
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Rate each element across all 7 Quality Areas
        </p>
      </div>

      <NqsAssessmentMatrixClient
        initialAssessments={assessmentsResult.data ?? []}
        goals={goalsResult.data ?? []}
        evidence={evidenceResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
