// src/app/(app)/pedagogy/work-cycles/[id]/edit/page.tsx
//
// Edit an existing work cycle session (actual times, quality, notes).
// Class and date are immutable after creation.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getWorkCycleSession } from "@/lib/actions/work-cycle";
import { SessionForm } from "@/components/domain/work-cycle/session-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit Work Cycle Session - WattleOS" };

export default async function EditWorkCycleSessionPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_WORK_CYCLES)) {
    redirect(`/pedagogy/work-cycles/${id}`);
  }

  const result = await getWorkCycleSession(id);
  if (!result.data) notFound();

  const session = result.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href="/pedagogy/work-cycles"
            className="hover:text-foreground transition-colors"
          >
            Work Cycles
          </Link>
          <span>/</span>
          <Link
            href={`/pedagogy/work-cycles/${id}`}
            className="hover:text-foreground transition-colors"
          >
            {session.session_date}
          </Link>
          <span>/</span>
          <span className="text-foreground">Edit</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground">Edit Session</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {session.class_name} - {session.session_date}. Class and date cannot
          be changed.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <SessionForm
          classes={[{ id: session.class_id, name: session.class_name }]}
          existing={session}
        />
      </div>
    </div>
  );
}
