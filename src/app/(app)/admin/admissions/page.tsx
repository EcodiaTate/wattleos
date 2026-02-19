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
// as summary counts in the header, not as kanban columns —
// they're "done" states that don't need daily management.
// ============================================================

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
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-900">Admissions Pipeline</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Admissions Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track families from first inquiry to enrolled student.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/admissions/tours"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Manage Tours
          </Link>
          <Link
            href="/admin/admissions/templates"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Email Templates
          </Link>
          {context.permissions.includes(
            Permissions.VIEW_ADMISSIONS_ANALYTICS,
          ) && (
            <Link
              href="/admin/admissions/analytics"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Analytics
            </Link>
          )}
        </div>
      </div>

      {/* Terminal stage summary bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
            {terminalCounts.enrolled}
          </span>
          <span className="font-medium text-green-700">Enrolled</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
            {terminalCounts.declined}
          </span>
          <span className="font-medium text-red-700">Declined</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
            {terminalCounts.withdrawn}
          </span>
          <span className="font-medium text-gray-600">Withdrawn</span>
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
