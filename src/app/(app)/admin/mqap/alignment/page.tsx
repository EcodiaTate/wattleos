import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getAlignmentView } from "@/lib/actions/mqap";
import { MqapAlignmentClient } from "@/components/domain/mqap/mqap-alignment-client";

export default async function MqapAlignmentPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MQAP) ||
    hasPermission(context, Permissions.MANAGE_MQAP);
  if (!canView) redirect("/dashboard");

  const result = await getAlignmentView();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          NQS ↔ MQ:AP Alignment
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Side-by-side view showing how NQS and MQ:AP assessments align
        </p>
      </div>

      <MqapAlignmentClient items={result.data ?? []} />
    </div>
  );
}
