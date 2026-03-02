import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listPendingSwapRequests } from "@/lib/actions/rostering";
import { SwapListClient } from "@/components/domain/rostering/swap-list-client";

export const metadata = { title: "Shift Swaps - WattleOS" };

export default async function SwapManagementPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_ROSTER)) redirect("/admin/rostering");

  const result = await listPendingSwapRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Shift Swaps</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Shift Swap Requests
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Review and approve staff shift swap requests
        </p>
      </div>

      <SwapListClient requests={result.data ?? []} />
    </div>
  );
}
