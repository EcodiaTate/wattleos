// src/app/(app)/admin/admissions/page.tsx
//
// ============================================================
// WattleOS V2 - Admissions Pipeline Board (Module 13)
// ============================================================
// Server Component. Fetches waitlist entries for each active
// pipeline stage and renders the kanban board.
//
// WHY server-side per-stage fetch: Each kanban column is an
// independent data slice. This lets us paginate per-column
// later without refactoring, and keeps the initial load fast
// by fetching all stages in parallel.
//
// Terminal stages (enrolled, declined, withdrawn) are shown
// as summary counts in the header, not as kanban columns  -
// they're "done" states that don't need daily management.
// ============================================================

export const metadata = { title: "Admissions - WattleOS" };

import type {
  WaitlistEntry,
  WaitlistStage,
} from "@/lib/actions/admissions/waitlist-pipeline";
import { listWaitlistEntries } from "@/lib/actions/admissions/waitlist-pipeline";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PipelineKanban } from "./pipeline-kanban";

// The active stages that appear as kanban columns (in order)
const KANBAN_STAGES: WaitlistStage[] = [
  "inquiry",
  "waitlisted",
  "tour_scheduled",
  "tour_completed",
  "offered",
  "accepted",
];

// Terminal stages - shown as summary counts only
const TERMINAL_STAGES: WaitlistStage[] = ["enrolled", "declined", "withdrawn"];

export default async function AdmissionsPipelinePage() {
  const context = await getTenantContext();

  if (
    !context.permissions.includes(Permissions.VIEW_WAITLIST) &&
    !context.permissions.includes(Permissions.MANAGE_WAITLIST)
  ) {
    redirect("/dashboard");
  }

  const canManage = context.permissions.includes(Permissions.MANAGE_WAITLIST);

  // Fetch all stages in parallel for speed
  const [kanbanResults, terminalResults] = await Promise.all([
    Promise.all(
      KANBAN_STAGES.map((stage) =>
        listWaitlistEntries({
          stage,
          sort_by: "priority",
          sort_order: "desc",
          per_page: 50,
        }),
      ),
    ),
    Promise.all(
      TERMINAL_STAGES.map((stage) =>
        listWaitlistEntries({
          stage,
          per_page: 1, // We only need the total count
        }),
      ),
    ),
  ]);

  // Build stage → entries map
  const stageEntries: Record<string, WaitlistEntry[]> = {};
  const stageCounts: Record<string, number> = {};

  KANBAN_STAGES.forEach((stage, i) => {
    const result = kanbanResults[i];
    stageEntries[stage] = result.data ?? [];
    stageCounts[stage] = result.pagination?.total ?? (result.data ?? []).length;
  });

  // Terminal stage counts
  const terminalCounts: Record<string, number> = {};
  TERMINAL_STAGES.forEach((stage, i) => {
    const result = terminalResults[i];
    terminalCounts[stage] = result.pagination?.total ?? 0;
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-foreground">Admissions Pipeline</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Admissions Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track families from first inquiry to enrolled student.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/admissions/tours"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Manage Tours
          </Link>
          {context.permissions.includes(Permissions.MANAGE_TENANT_SETTINGS) && (
            <Link
              href="/admin/admissions/portal"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            >
              Portal Settings
            </Link>
          )}
          <Link
            href="/admin/admissions/templates"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Email Templates
          </Link>
          {context.permissions.includes(
            Permissions.VIEW_ADMISSIONS_ANALYTICS,
          ) && (
            <Link
              href="/admin/admissions/analytics"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
            >
              Analytics
            </Link>
          )}
        </div>
      </div>

      {/* Terminal stage summary bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-success/10  px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15  text-xs font-bold text-success ">
            {terminalCounts.enrolled}
          </span>
          <span className="font-medium text-success ">Enrolled</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10  px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15  text-xs font-bold text-destructive ">
            {terminalCounts.declined}
          </span>
          <span className="font-medium text-destructive ">Declined</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-xs font-bold text-muted-foreground">
            {terminalCounts.withdrawn}
          </span>
          <span className="font-medium text-muted-foreground">Withdrawn</span>
        </div>
      </div>

      {/* Kanban board */}
      <PipelineKanban
        stageEntries={stageEntries}
        stageCounts={stageCounts}
        kanbanStages={KANBAN_STAGES}
        canManage={canManage}
      />
    </div>
  );
}
