import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEvidence } from "@/lib/actions/qip";
import { EvidenceBrowserClient } from "@/components/domain/qip/evidence-browser-client";

export default async function QipEvidencePage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const evidenceResult = await getEvidence({});

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Evidence Browser
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Link observations, incidents, policies, and documents to NQS elements
        </p>
      </div>

      <EvidenceBrowserClient
        initialEvidence={evidenceResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
