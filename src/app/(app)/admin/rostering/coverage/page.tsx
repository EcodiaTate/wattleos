import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listCoverageRequests } from "@/lib/actions/rostering";
import { CoverageBoardClient } from "@/components/domain/rostering/coverage-board-client";

export const metadata = { title: "Coverage Board - WattleOS" };

export default async function CoverageBoardPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_COVERAGE)) redirect("/admin/rostering");

  const result = await listCoverageRequests();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/rostering" className="underline-offset-2 hover:underline" style={{ color: "var(--primary)" }}>
          Rostering
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Coverage Board</span>
      </div>

      <div>
        <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Shift Coverage Board
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Manage unfilled shifts and relief staff coverage
        </p>
      </div>

      <CoverageBoardClient requests={result.data ?? []} />
    </div>
  );
}
