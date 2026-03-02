// src/app/(app)/pedagogy/work-cycles/sessions/page.tsx
//
// Full paginated list of all work cycle sessions with filters.

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listWorkCycleSessions } from "@/lib/actions/work-cycle";
import { SessionListClient } from "@/components/domain/work-cycle/session-list-client";

export const metadata = { title: "Work Cycle Sessions - WattleOS" };

interface Props {
  searchParams: Promise<{
    class?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function WorkCycleSessionsPage({ searchParams }: Props) {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WORK_CYCLES) ||
    hasPermission(context, Permissions.MANAGE_WORK_CYCLES);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WORK_CYCLES);

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const supabase = await createSupabaseServerClient();

  const [result, classesResult] = await Promise.all([
    listWorkCycleSessions({
      class_id: params.class ?? undefined,
      from_date: params.from ?? undefined,
      to_date: params.to ?? undefined,
      page,
      per_page: 25,
    }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pedagogy/work-cycles"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Work Cycles
            </Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-lg font-semibold text-foreground">
              All Sessions
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.pagination?.total ?? 0} sessions recorded
          </p>
        </div>
        {canManage && (
          <Link
            href="/pedagogy/work-cycles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Record Session
          </Link>
        )}
      </div>

      <SessionListClient
        result={result}
        classes={(classesResult.data ?? []) as { id: string; name: string }[]}
        canManage={canManage}
      />
    </div>
  );
}
