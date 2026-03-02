// src/app/(app)/pedagogy/work-cycles/new/page.tsx
//
// Record a new work cycle session.

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SessionForm } from "@/components/domain/work-cycle/session-form";

export const metadata = { title: "Record Work Cycle Session - WattleOS" };

interface Props {
  searchParams: Promise<{ class?: string }>;
}

export default async function NewWorkCycleSessionPage({ searchParams }: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_WORK_CYCLES)) {
    redirect("/pedagogy/work-cycles");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("tenant_id", context.tenant.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Record Work Cycle Session
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Log today's 3-hour work cycle - times, interruptions, and overall
          quality.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <SessionForm
          classes={(classes ?? []) as { id: string; name: string }[]}
          defaultClassId={params.class ?? null}
        />
      </div>
    </div>
  );
}
