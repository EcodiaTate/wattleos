import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getCurrentPhilosophy,
  getPhilosophyVersionHistory,
} from "@/lib/actions/qip";
import { PhilosophyEditorClient } from "@/components/domain/qip/philosophy-editor-client";

export default async function QipPhilosophyPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_QIP) ||
    hasPermission(context, Permissions.MANAGE_QIP);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_QIP);

  const [currentResult, historyResult] = await Promise.all([
    getCurrentPhilosophy(),
    getPhilosophyVersionHistory(),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Service Philosophy
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          NQS Element 7.1.1 - guides all aspects of the service's operations
        </p>
      </div>

      <PhilosophyEditorClient
        current={currentResult.data ?? null}
        history={historyResult.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
