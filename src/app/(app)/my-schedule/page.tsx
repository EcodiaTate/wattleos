import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMySchedule } from "@/lib/actions/rostering";
import { MyScheduleClient } from "@/components/domain/rostering/my-schedule-client";

export const metadata = { title: "My Schedule - WattleOS" };

export default async function MySchedulePage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ROSTER) ||
    hasPermission(context, Permissions.REQUEST_LEAVE) ||
    hasPermission(context, Permissions.ACCEPT_COVERAGE);
  if (!canView) redirect("/dashboard");

  const result = await getMySchedule();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load schedule."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          My Schedule
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Your shifts, leave, and availability
        </p>
      </div>
      <MyScheduleClient data={result.data} />
    </div>
  );
}
