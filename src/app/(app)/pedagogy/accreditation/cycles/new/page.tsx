// src/app/(app)/pedagogy/accreditation/cycles/new/page.tsx
// ============================================================
// Create a new accreditation cycle
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { AccreditationCycleForm } from "@/components/domain/accreditation/accreditation-cycle-form";
import type { AccreditationBodyCode } from "@/types/domain";

export const metadata = { title: "New Accreditation Cycle - WattleOS" };

interface Props {
  searchParams: Promise<{ body?: string }>;
}

export default async function NewAccreditationCyclePage({
  searchParams,
}: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ACCREDITATION)) {
    redirect("/pedagogy/accreditation");
  }

  const params = await searchParams;
  const defaultBody = ["ami", "ams", "msaa"].includes(params.body ?? "")
    ? (params.body as AccreditationBodyCode)
    : undefined;

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          New Accreditation Cycle
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Starting a new cycle seeds all criteria for the selected body.
        </p>
      </div>
      <AccreditationCycleForm defaultBodyCode={defaultBody} />
    </div>
  );
}
