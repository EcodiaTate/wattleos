import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listLeaveRequests } from "@/lib/actions/rostering";
import { LeaveListClient } from "@/components/domain/rostering/leave-list-client";

export const metadata = { title: "Leave Requests - WattleOS" };

export default async function LeaveManagementPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_LEAVE)) redirect("/admin/rostering");

  const result = await listLeaveRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Leave Requests</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Leave Requests
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Review and manage staff leave requests
        </p>
      </div>

      <LeaveListClient requests={result.data ?? []} />
    </div>
  );
}
