// src/app/(app)/pedagogy/work-cycles/[id]/page.tsx
//
// Session detail - interruption log, quality stats, edit/delete actions.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getWorkCycleSession } from "@/lib/actions/work-cycle";
import { SessionDetailClient } from "@/components/domain/work-cycle/session-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getWorkCycleSession(id);
  if (!result.data) return { title: "Session - WattleOS" };
  return {
    title: `Work Cycle ${result.data.session_date} · ${result.data.class_name} - WattleOS`,
  };
}

export default async function WorkCycleSessionDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
    hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WORK_CYCLES);

  const result = await getWorkCycleSession(id);
  if (!result.data) notFound();

  const session = result.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/pedagogy/work-cycles"
              className="hover:text-foreground transition-colors"
            >
              Work Cycles
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {session.session_date}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {session.class_name} - {session.session_date}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recorded by {session.recorder_name} &middot;{" "}
            {session.planned_start_time.slice(0, 5)}–
            {session.planned_end_time.slice(0, 5)}
          </p>
        </div>

        {canManage && (
          <Link
            href={`/pedagogy/work-cycles/${id}/edit`}
            className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Edit Session
          </Link>
        )}
      </div>

      <SessionDetailClient session={session} canManage={canManage} />
    </div>
  );
}
