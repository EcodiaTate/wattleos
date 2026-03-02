// src/app/(app)/pedagogy/accreditation/cycles/[cycleId]/edit/page.tsx
// ============================================================
// Edit an accreditation cycle
// ============================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listAccreditationCycles } from "@/lib/actions/accreditation";
import { AccreditationCycleForm } from "@/components/domain/accreditation/accreditation-cycle-form";

export const metadata = { title: "Edit Accreditation Cycle - WattleOS" };

interface Props {
  params: Promise<{ cycleId: string }>;
}

export default async function EditAccreditationCyclePage({ params }: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ACCREDITATION)) {
    redirect("/pedagogy/accreditation");
  }

  const { cycleId } = await params;
  const result = await listAccreditationCycles();
  const cycle = (result.data ?? []).find((c) => c.id === cycleId);
  if (!cycle) notFound();

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-6">
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/pedagogy/accreditation" className="hover:underline">
          Accreditation
        </Link>
        <span>/</span>
        <Link
          href={`/pedagogy/accreditation/cycles/${cycleId}`}
          className="hover:underline"
        >
          {cycle.cycle_label}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Edit</span>
      </div>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Edit Cycle
      </h1>
      <AccreditationCycleForm cycle={cycle} />
    </div>
  );
}
