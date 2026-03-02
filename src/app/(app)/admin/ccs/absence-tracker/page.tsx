import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getAbsenceCapSummary } from "@/lib/actions/ccs";
import { AbsenceTrackerClient } from "@/components/domain/ccs/absence-tracker-client";

export const metadata = { title: "Absence Tracker - WattleOS" };

export default async function AbsenceTrackerPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_CCS_REPORTS) ||
    hasPermission(context, Permissions.MANAGE_CCS_REPORTS);
  if (!canView) redirect("/dashboard");

  const result = await getAbsenceCapSummary();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load absence tracker."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Absence Cap Tracker
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          42-day annual absence cap per child - current financial year
        </p>
      </div>

      <AbsenceTrackerClient summaries={result.data} />
    </div>
  );
}
