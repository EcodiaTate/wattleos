import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { MqapExportClient } from "@/components/domain/mqap/mqap-export-client";

export default async function MqapExportPage() {
  const context = await getTenantContext();

  const canManage = hasPermission(context, Permissions.MANAGE_MQAP);
  if (!canManage) redirect("/dashboard");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Export MQ:AP Self-Study
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Generate a self-study document for Montessori Australia submission
        </p>
      </div>

      <MqapExportClient />
    </div>
  );
}
