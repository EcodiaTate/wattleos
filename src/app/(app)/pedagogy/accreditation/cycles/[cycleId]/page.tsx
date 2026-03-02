// src/app/(app)/pedagogy/accreditation/cycles/[cycleId]/page.tsx
// ============================================================
// Accreditation checklist - domain breakdown for one cycle.
// ============================================================

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  listAccreditationCycles,
  getAccreditationDomainProgress,
} from "@/lib/actions/accreditation";
import { AccreditationChecklistClient } from "@/components/domain/accreditation/accreditation-checklist-client";
import type { AccreditationCycleWithProgress } from "@/types/domain";

export const metadata = { title: "Accreditation Checklist - WattleOS" };

interface Props {
  params: Promise<{ cycleId: string }>;
}

export default async function AccreditationCyclePage({ params }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_ACCREDITATION) ||
    hasPermission(context, Permissions.MANAGE_ACCREDITATION);

  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_ACCREDITATION);
  const { cycleId } = await params;

  const [cyclesResult, domainsResult] = await Promise.all([
    listAccreditationCycles(),
    getAccreditationDomainProgress(cycleId),
  ]);

  const cycle = (cyclesResult.data ?? []).find((c) => c.id === cycleId);
  if (!cycle) notFound();

  if (domainsResult.error) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--destructive)" }}>
          Error loading checklist: {domainsResult.error.message}
        </p>
      </div>
    );
  }

  // Build CycleWithProgress - reuse counts from domain data
  const domains = domainsResult.data ?? [];
  const totalCriteria = domains.reduce((s, d) => s + d.total_count, 0);
  const metCount = domains.reduce((s, d) => s + d.met_count, 0);
  const notStartedCount = domains.reduce(
    (s, d) =>
      s +
      d.criteria.filter(
        (c) => !c.assessment || c.assessment.rating === "not_started",
      ).length,
    0,
  );
  const notMetCount = domains.reduce(
    (s, d) =>
      s + d.criteria.filter((c) => c.assessment?.rating === "not_met").length,
    0,
  );
  const partialCount = domains.reduce(
    (s, d) =>
      s +
      d.criteria.filter((c) => c.assessment?.rating === "partially_met").length,
    0,
  );
  const exceedsCount = domains.reduce(
    (s, d) =>
      s + d.criteria.filter((c) => c.assessment?.rating === "exceeds").length,
    0,
  );

  const cycleWithProgress: AccreditationCycleWithProgress = {
    ...cycle,
    total_criteria: totalCriteria,
    not_started_count: notStartedCount,
    not_met_count: notMetCount,
    partially_met_count: partialCount,
    met_count: metCount - exceedsCount,
    exceeds_count: exceedsCount,
    overall_progress_pct:
      totalCriteria > 0 ? Math.round((metCount / totalCriteria) * 100) : 0,
    lead_staff_name: null,
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div
        className="px-4 md:px-6 pt-4 flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/pedagogy/accreditation" className="hover:underline">
          Accreditation
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>{cycle.cycle_label}</span>
        {canManage && (
          <>
            <span className="ml-auto" />
            <Link
              href={`/pedagogy/accreditation/cycles/${cycleId}/edit`}
              className="text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              Edit cycle
            </Link>
          </>
        )}
      </div>

      <AccreditationChecklistClient
        cycle={cycleWithProgress}
        domains={domains}
        canManage={canManage}
      />
    </div>
  );
}
