import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMyLeaveRequests } from "@/lib/actions/rostering";
import { MyLeaveClient } from "@/components/domain/rostering/my-leave-client";

export const metadata = { title: "My Leave - WattleOS" };

export default async function MyLeavePage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.REQUEST_LEAVE)) redirect("/my-schedule");

  const result = await getMyLeaveRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/my-schedule" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          My Schedule
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Leave</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Leave Requests
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Request leave and view your leave history
        </p>
      </div>

      <MyLeaveClient requests={result.data ?? []} />
    </div>
  );
}
