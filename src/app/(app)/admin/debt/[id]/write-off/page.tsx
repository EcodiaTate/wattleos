// src/app/(app)/admin/debt/[id]/write-off/page.tsx
import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDebtStage } from "@/lib/actions/debt";
import { WriteOffFormClient } from "@/components/domain/debt/write-off-form-client";

export const metadata = { title: "Process Write-Off - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WriteOffPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.APPROVE_WRITE_OFFS)) {
    redirect("/admin/debt");
  }

  const recordResult = await getDebtStage(id);
  if (recordResult.error || !recordResult.data) {
    notFound();
  }

  // Don't allow writing off already-resolved records
  const record = recordResult.data;
  if (record.stage === "resolved" || record.stage === "written_off") {
    redirect(`/admin/debt/${id}`);
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 600, margin: "0 auto" }}>
      <WriteOffFormClient record={record} />
    </main>
  );
}
